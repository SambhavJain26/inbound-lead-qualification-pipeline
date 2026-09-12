/**
 * Points Cal.com's BOOKING_CREATED webhook at the current tunnel.
 *
 * Must be re-run after every tunnel restart: cloudflared issues a new hostname
 * each time, and a webhook aimed at a dead hostname fails silently - Cal.com
 * does not surface delivery failures anywhere you would notice mid-demo.
 *
 * Cal.com cloud also rejects private IPs and requires HTTPS, so localhost is
 * not an option; the tunnel is mandatory for this to work at all.
 *
 * Usage:
 *   node scripts/register-calcom-webhook.js
 *   node scripts/register-calcom-webhook.js --list
 */

const { loadEnv } = require("./lib/env");

const env = loadEnv(["CALCOM_API_KEY", "TUNNEL_URL"]);
const API = "https://api.cal.com/v2";
const TRIGGERS = ["BOOKING_CREATED"];

const targetUrl = new URL("/webhook/calcom-booking", env.TUNNEL_URL).href;

async function cal(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.CALCOM_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} -> ${response.status}: ` +
        (body?.error?.message || body?.message || String(text).slice(0, 200))
    );
  }
  return body;
}

async function listWebhooks() {
  const body = await cal("/webhooks");
  return body.data || body || [];
}

async function main() {
  const existing = await listWebhooks();

  if (process.argv.includes("--list")) {
    if (!existing.length) console.log("No webhooks registered.");
    existing.forEach((w) =>
      console.log(`  ${w.id}  ${w.active ? "active " : "paused "} ${w.subscriberUrl}  [${(w.triggers || []).join(",")}]`)
    );
    return;
  }

  // Remove anything already pointing at a trycloudflare host: those are dead
  // tunnels from previous runs and would otherwise accumulate.
  let removed = 0;
  for (const hook of existing) {
    const url = hook.subscriberUrl || "";
    if (!url.includes("trycloudflare.com")) continue;
    if (url === targetUrl) continue;
    await cal(`/webhooks/${hook.id}`, { method: "DELETE" });
    removed += 1;
  }

  const alreadyCorrect = existing.find((w) => w.subscriberUrl === targetUrl);
  if (alreadyCorrect) {
    console.log(`Already registered: ${targetUrl}`);
  } else {
    await cal("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        subscriberUrl: targetUrl,
        triggers: TRIGGERS,
        active: true,
      }),
    });
    console.log(`Registered: ${targetUrl}`);
  }

  if (removed) console.log(`Removed ${removed} stale tunnel webhook(s).`);
  console.log(`Triggers: ${TRIGGERS.join(", ")}`);
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
