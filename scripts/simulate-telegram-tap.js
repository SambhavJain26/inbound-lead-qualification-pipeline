/**
 * Simulates a manager tapping a button on the Telegram decision card.
 *
 * Posts a callback_query to WF3's trigger webhook in the shape Telegram itself
 * sends, so the whole router path can be driven from the command line - and so
 * the double-tap guard can be tested by sending the same tap twice, which is
 * awkward to do reliably by hand.
 *
 * Usage:
 *   node scripts/simulate-telegram-tap.js approve A-1234
 *   node scripts/simulate-telegram-tap.js conditional A-1234
 *   node scripts/simulate-telegram-tap.js review A-1234
 *   node scripts/simulate-telegram-tap.js approve A-1234 --twice
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv(["TUNNEL_URL", "TELEGRAM_MANAGER_CHAT_ID"]);

/**
 * n8n rejects a Telegram webhook call without the secret it registered with
 * Telegram, which it derives as `${workflowId}_${nodeId}` with anything outside
 * [A-Za-z0-9_-] stripped. Derived from the workflow JSON rather than hardcoded
 * so renaming the node cannot silently break this.
 */
function secretToken() {
  const workflow = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "n8n-workflows", "wf3-telegram-router.json"), "utf8")
  );
  const trigger = workflow.nodes.find((n) => n.type === "n8n-nodes-base.telegramTrigger");
  if (!trigger) throw new Error("no telegram trigger in wf3");
  return `${workflow.id}_${trigger.id}`.replace(/[^a-zA-Z0-9_-]+/g, "");
}
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const twice = process.argv.includes("--twice");

const PREFIX = { approve: "apr", conditional: "con", review: "rev" };
const action = args[0] || "approve";
const refToken = args[1];

if (!PREFIX[action] || !refToken) {
  console.error("Usage: node scripts/simulate-telegram-tap.js <approve|conditional|review> <A-1234> [--twice]");
  process.exit(1);
}

const url = new URL("/webhook/leasing-telegram-router/webhook", env.TUNNEL_URL).href;

function payload() {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    callback_query: {
      id: String(Math.floor(Math.random() * 1e15)),
      from: { id: Number(env.TELEGRAM_MANAGER_CHAT_ID), is_bot: false, first_name: "Demo", username: "demo_manager" },
      message: {
        message_id: Math.floor(Math.random() * 1e6),
        chat: { id: Number(env.TELEGRAM_MANAGER_CHAT_ID), type: "private" },
        date: Math.floor(Date.now() / 1000),
      },
      data: `${PREFIX[action]}:${refToken}`,
    },
  };
}

async function tap(label) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secretToken(),
    },
    body: JSON.stringify(payload()),
  });
  console.log(`  ${label}: HTTP ${response.status}`);
  return response.status;
}

async function main() {
  console.log(`Tapping "${action}" on ${refToken}`);
  console.log(`  -> ${url}`);
  await tap("tap 1");

  if (twice) {
    // People double-tap. A second tap must never produce a second envelope.
    await new Promise((r) => setTimeout(r, 4000));
    await tap("tap 2");
    console.log("\nSent twice. Exactly one envelope should exist for this application.");
  }
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
