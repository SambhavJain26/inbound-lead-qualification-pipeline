/**
 * Starts a cloudflared quick tunnel to local n8n, writes the new hostname into
 * .env, and recreates the n8n container so it picks the URL up.
 *
 * Why this exists: quick tunnels get a NEW hostname on every run, and n8n reads
 * WEBHOOK_URL only at container start. A `docker compose restart` is not enough -
 * the container has to be recreated.
 *
 * Run this after any tunnel death or Docker restart, then re-import the
 * workflows that own inbound webhooks (Telegram Trigger, Cal.com, DocuSign).
 *
 * Usage:
 *   node scripts/start-tunnel.js
 *
 * The tunnel keeps running in the background after this exits. Stop it with:
 *   node scripts/start-tunnel.js --stop
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv, setEnvValue } = require("./lib/env");

const LOG_PATH = path.join(os.tmpdir(), "leasing-cloudflared.log");
const PID_PATH = path.join(os.tmpdir(), "leasing-cloudflared.pid");
const N8N_PORT = loadEnv().N8N_PORT || "5678";

function stopExisting() {
  if (!fs.existsSync(PID_PATH)) return;
  const pid = Number(fs.readFileSync(PID_PATH, "utf8").trim());
  try {
    process.kill(pid);
    console.log(`Stopped previous tunnel (pid ${pid})`);
  } catch {
    /* already gone */
  }
  fs.unlinkSync(PID_PATH);
}

function waitForUrl(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  const pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

  return new Promise((resolve, reject) => {
    const poll = () => {
      const log = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, "utf8") : "";
      const match = log.match(pattern);
      if (match) return resolve(match[0]);
      if (Date.now() > deadline) {
        return reject(new Error(`No tunnel URL after ${timeoutMs / 1000}s. Log: ${LOG_PATH}`));
      }
      setTimeout(poll, 750);
    };
    poll();
  });
}

async function main() {
  if (process.argv.includes("--stop")) {
    stopExisting();
    return;
  }

  stopExisting();
  fs.writeFileSync(LOG_PATH, "");

  const out = fs.openSync(LOG_PATH, "a");
  const child = spawn(
    "cloudflared",
    ["tunnel", "--url", `http://localhost:${N8N_PORT}`, "--no-autoupdate"],
    { detached: true, stdio: ["ignore", out, out] }
  );
  child.unref();
  fs.writeFileSync(PID_PATH, String(child.pid));

  console.log(`cloudflared started (pid ${child.pid}), waiting for hostname...`);
  const url = await waitForUrl();
  const withSlash = url.endsWith("/") ? url : `${url}/`;

  setEnvValue("TUNNEL_URL", withSlash);
  setEnvValue("WEBHOOK_URL", withSlash);
  setEnvValue("N8N_EDITOR_BASE_URL", withSlash);
  console.log(`Tunnel URL: ${withSlash}`);

  console.log("Recreating n8n so it reads the new WEBHOOK_URL...");
  execFileSync("docker", ["compose", "up", "-d", "--force-recreate", "n8n"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  console.log("\nDone. Re-import any workflow with an inbound webhook:");
  console.log("  node scripts/import-workflows.js");
  console.log(`\nTunnel log: ${LOG_PATH}`);
  console.log("Stop it with: node scripts/start-tunnel.js --stop");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
