/**
 * Simulates a renter messaging the leasing assistant on Telegram.
 *
 * Posts `message` updates to WF1's trigger in the shape Telegram itself sends,
 * so the whole conversation can be driven from the command line: for a
 * rehearsal, for the Stage 7 gate, and to test the dedupe guard by sending the
 * same message_id twice, which is impossible to do by hand from a phone.
 *
 * The chat id here is a synthetic one by default, NOT a real Telegram account,
 * so replies are logged and the send fails harmlessly at the Telegram API. Pass
 * --chat <id> with your own chat id to actually receive the replies on a phone.
 *
 * Usage:
 *   node scripts/simulate-prospect-message.js start R-4821
 *   node scripts/simulate-prospect-message.js say "Is parking included?"
 *   node scripts/simulate-prospect-message.js say "October 5th" --chat 12345678
 *   node scripts/simulate-prospect-message.js say "hello" --twice
 *   node scripts/simulate-prospect-message.js conversation R-4821
 */

const { loadEnv } = require("./lib/env");
const { telegramTrigger } = require("./lib/telegram-secret");

const env = loadEnv(["TUNNEL_URL"]);

// WF1's trigger, on the PROSPECT bot. WF3's manager trigger has its own secret.
const TRIGGER = telegramTrigger("wf1-leasing-front", "Prospect Messages (Telegram)");

const flags = process.argv.filter((a) => a.startsWith("--"));
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function flagValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const CHAT_ID = Number(flagValue("--chat", env.TELEGRAM_PROSPECT_CHAT_ID || "900100200"));
const twice = flags.includes("--twice");
const url = new URL(`/webhook/${TRIGGER.webhookId}/webhook`, env.TUNNEL_URL).href;

/** A realistic multi-turn conversation, for a one-command rehearsal. */
const SCRIPT = [
  "Is parking included, and do you allow a small dog?",
  "October 5th works for me.",
  "About $5,000 a month gross.",
  "One small dog, 18 lbs. One car. Just me living there.",
];

let messageCounter = Math.floor(Math.random() * 1e6);

function update(text, { messageId } = {}) {
  const id = messageId || ++messageCounter;
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: id,
      from: {
        id: CHAT_ID,
        is_bot: false,
        first_name: "Maya",
        last_name: "Restrepo",
        username: "maya_demo",
      },
      chat: { id: CHAT_ID, type: "private", first_name: "Maya", username: "maya_demo" },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

async function send(text, options = {}) {
  const body = update(text, options);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": TRIGGER.secret,
    },
    body: JSON.stringify(body),
  });
  const label = text.length > 52 ? text.slice(0, 52) + "..." : text;
  console.log(`  HTTP ${response.status}  msg ${body.message.message_id}  "${label}"`);
  return { status: response.status, messageId: body.message.message_id };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mode = args[0];

  if (mode === "start") {
    const token = args[1];
    if (!token) throw new Error("usage: simulate-prospect-message.js start R-1234");
    console.log(`Opening the chat with /start ${token}  (chat ${CHAT_ID})`);
    console.log(`  -> ${url}`);
    await send(`/start ${token}`);
    return;
  }

  if (mode === "say") {
    const text = args[1];
    if (!text) throw new Error('usage: simulate-prospect-message.js say "your message"');
    console.log(`Sending as the prospect (chat ${CHAT_ID})`);
    console.log(`  -> ${url}`);
    const first = await send(text);
    if (twice) {
      // Telegram re-delivers an update it thinks was not acknowledged. The same
      // message_id must never produce a second reply.
      await sleep(3000);
      await send(text, { messageId: first.messageId });
      console.log("\nSent the same message_id twice. Exactly one reply should exist.");
    }
    return;
  }

  if (mode === "conversation") {
    const token = args[1];
    if (!token) throw new Error("usage: simulate-prospect-message.js conversation R-1234");
    console.log(`Running the full scripted conversation for ${token} (chat ${CHAT_ID})`);
    console.log(`  -> ${url}\n`);
    await send(`/start ${token}`);
    for (const line of SCRIPT) {
      // Long enough for the model call and the database writes to land, so the
      // next turn sees the slots the previous one recorded.
      await sleep(12000);
      await send(line);
    }
    console.log("\nConversation sent. Check the lead row for prequal_result.");
    return;
  }

  console.error("Usage:");
  console.error('  node scripts/simulate-prospect-message.js start R-1234');
  console.error('  node scripts/simulate-prospect-message.js say "message" [--twice] [--chat <id>]');
  console.error("  node scripts/simulate-prospect-message.js conversation R-1234");
  process.exit(1);
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
