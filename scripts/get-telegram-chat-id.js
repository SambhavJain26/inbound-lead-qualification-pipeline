/**
 * Finds a Telegram chat id and writes it into .env.
 *
 * Send any message to the bot first, then run this.
 *
 * There are two bots: the manager bot (WF3's router) and the prospect bot
 * (WF1's leasing assistant). Pass --prospect for the second one.
 *
 * Note: getUpdates only works while no webhook is registered on that bot. Once
 * the matching Telegram Trigger is active, this stops working for it - so run
 * this BEFORE the first import, or deactivate that workflow first.
 *
 * Usage:
 *   node scripts/get-telegram-chat-id.js              manager bot
 *   node scripts/get-telegram-chat-id.js --prospect   prospect bot
 */

const { loadEnv, setEnvValue } = require("./lib/env");

const prospect = process.argv.includes("--prospect");
const TOKEN_VAR = prospect ? "TELEGRAM_PROSPECT_BOT_TOKEN" : "TELEGRAM_BOT_TOKEN";
const CHAT_VAR = prospect ? "TELEGRAM_PROSPECT_CHAT_ID" : "TELEGRAM_MANAGER_CHAT_ID";

const env = loadEnv([TOKEN_VAR]);
const API = `https://api.telegram.org/bot${env[TOKEN_VAR]}`;

async function call(method) {
  const response = await fetch(`${API}/${method}`);
  const body = await response.json();
  if (!body.ok) throw new Error(`${method}: ${body.description}`);
  return body.result;
}

async function main() {
  const me = await call("getMe");
  console.log(`Bot: @${me.username} (${me.first_name})  [${prospect ? "prospect" : "manager"}]`);

  const hook = await call("getWebhookInfo");
  if (hook.url) {
    console.log(`\nA webhook is registered at ${hook.url}`);
    console.log("getUpdates returns nothing while a webhook is active.");
    console.log(`Deactivate ${prospect ? "WF1" : "WF3"}, then re-run this.`);
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
