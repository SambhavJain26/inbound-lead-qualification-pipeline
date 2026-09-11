/**
 * Finds the manager's Telegram chat id and writes it into .env.
 *
 * Send any message to your bot first, then run this.
 *
 * Note: getUpdates only works while no webhook is registered on the bot. If a
 * Telegram Trigger is already active, this will say so - deactivate it, run
 * this, then reactivate.
 *
 * Usage:
 *   node scripts/get-telegram-chat-id.js
 */

const { loadEnv, setEnvValue } = require("./lib/env");

const env = loadEnv(["TELEGRAM_BOT_TOKEN"]);
const API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

async function call(method) {
  const response = await fetch(`${API}/${method}`);
  const body = await response.json();
  if (!body.ok) throw new Error(`${method}: ${body.description}`);
  return body.result;
}

async function main() {
  const me = await call("getMe");
  console.log(`Bot: @${me.username} (${me.first_name})`);

  const hook = await call("getWebhookInfo");
  if (hook.url) {
    console.log(`\nA webhook is registered at ${hook.url}`);
    console.log("getUpdates returns nothing while a webhook is active.");
    console.log("Deactivate the Telegram Trigger workflow, then re-run this.");
    process.exit(1);
  }

  const updates = await call("getUpdates");
  if (!updates.length) {
    console.log(`\nNo messages yet. Send any message to @${me.username}, then re-run.`);
    process.exit(1);
  }

  const chats = new Map();
  for (const update of updates) {
    const message = update.message || update.channel_post || update.callback_query?.message;
    if (message?.chat) chats.set(message.chat.id, message.chat);
  }

  console.log("\nChats seen:");
  for (const chat of chats.values()) {
    const label = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || "";
    console.log(`  ${chat.id}  ${chat.type}  ${label}`);
  }

  const [first] = [...chats.keys()];
  setEnvValue("TELEGRAM_MANAGER_CHAT_ID", String(first));
  console.log(`\nTELEGRAM_MANAGER_CHAT_ID set to ${first}`);
  if (chats.size > 1) console.log("More than one chat found - edit .env if that picked the wrong one.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
