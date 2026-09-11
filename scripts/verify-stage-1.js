/**
 * Stage 1 gate. Checks the local environment is actually working rather than
 * assumed to be.
 *
 * Usage:
 *   node scripts/verify-stage-1.js
 *   node scripts/verify-stage-1.js --telegram   (also sends a real test message)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv();
const results = [];

function check(label, fn, { optional = false } = {}) {
  try {
    const detail = fn();
    results.push({ label, ok: true, detail: detail || "" });
  } catch (error) {
    const detail = (error.stderr || error.message || "").toString().trim().split("\n").pop();
    results.push({ label, ok: false, optional, detail });
  }
}

async function checkAsync(label, fn, { optional = false } = {}) {
  try {
    const detail = await fn();
    results.push({ label, ok: true, detail: detail || "" });
  } catch (error) {
    results.push({ label, ok: false, optional, detail: (error.message || "").trim() });
  }
}

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", cwd: REPO_ROOT, stdio: "pipe" });
}

async function main() {
  check("Docker daemon", () => docker(["info", "-f", "{{.ServerVersion}}"]).trim());

  check("Compose config valid", () => {
    docker(["compose", "config", "-q"]);
    return "ok";
  });

  check("Postgres container healthy", () => {
    const status = docker(["inspect", "-f", "{{.State.Health.Status}}", "leasing-postgres"]).trim();
    if (status !== "healthy") throw new Error(`status is "${status}"`);
    return status;
  });

  check("Postgres query", () =>
    docker([
      "compose", "exec", "-T", "postgres",
      "psql", "-U", env.POSTGRES_USER || "leasing", "-d", env.POSTGRES_DB || "leasing",
      "-tAc", "select 'connected'",
    ]).trim()
  );

  check("n8n container running", () => {
    const running = docker(["inspect", "-f", "{{.State.Running}}", "leasing-n8n"]).trim();
    if (running !== "true") throw new Error("not running");
    return "up";
  });

  check("n8n version", () =>
    docker(["compose", "exec", "-T", "n8n", "n8n", "--version"]).trim().split("\n").pop()
  );

  await checkAsync("n8n healthz", async () => {
    const response = await fetch(`http://localhost:${env.N8N_PORT || 5678}/healthz`);
    const body = await response.json();
    if (body.status !== "ok") throw new Error(JSON.stringify(body));
    return "status ok";
  });

  check("n8n reaches Postgres by service name", () => {
    // The credential uses host "postgres", not localhost. Prove it resolves
    // from inside the n8n container.
    const out = docker([
      "compose", "exec", "-T", "n8n", "sh", "-lc",
      "getent hosts postgres || nslookup postgres 2>/dev/null | tail -2",
    ]).trim();
    if (!out) throw new Error("hostname 'postgres' does not resolve from n8n");
    return out.split("\n")[0];
  });

  check("Credentials imported", () => {
    const raw = docker([
      "compose", "exec", "-T", "n8n", "sh", "-lc",
      "n8n export:credentials --all --output=/tmp/c.json >/dev/null 2>&1 && " +
        "node -e \"console.log(require('/tmp/c.json').map(c=>c.type).join(','))\"; rm -f /tmp/c.json",
    ]).trim();
    if (!raw) throw new Error("none found - run: node scripts/setup-credentials.js");
    return raw;
  }, { optional: true });

  await checkAsync("Tunnel reachable", async () => {
    if (!env.TUNNEL_URL) throw new Error("TUNNEL_URL not set - run: node scripts/start-tunnel.js");
    const response = await fetch(new URL("/healthz", env.TUNNEL_URL).href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return env.TUNNEL_URL;
  }, { optional: true });

  if (process.argv.includes("--telegram")) {
    await checkAsync("Telegram test message", async () => {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_MANAGER_CHAT_ID) {
        throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_MANAGER_CHAT_ID not set");
      }
      const response = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_MANAGER_CHAT_ID,
            text: "Stage 1 verification - leasing demo environment is up.",
          }),
        }
      );
      const body = await response.json();
      if (!body.ok) throw new Error(body.description);
      return "sent";
    });
  }

  console.log("");
  for (const r of results) {
    const mark = r.ok ? "PASS" : r.optional ? "SKIP" : "FAIL";
    console.log(`  ${mark}  ${r.label}${r.detail ? ` - ${r.detail}` : ""}`);
  }

  const hardFailures = results.filter((r) => !r.ok && !r.optional);
  console.log(
    hardFailures.length
      ? `\n${hardFailures.length} required check(s) failed.`
      : "\nStage 1 gate: PASS"
  );
  process.exit(hardFailures.length ? 1 : 0);
}

main();
