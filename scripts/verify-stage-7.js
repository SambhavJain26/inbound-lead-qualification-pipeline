/**
 * Stage 7 gate: the listing site and the Telegram conversation.
 *
 * End to end on purpose, not a set of unit checks. Every failure that actually
 * bit during this build - a dropped query parameter, a JSON schema that was
 * never sent, an empty message, a credential resolved to the wrong bot - passed
 * every static check and only showed up when a real message went through.
 *
 * A real chat id is required. The assistant's replies go to a Telegram chat, and
 * a synthetic id makes the send fail, which is the correct behaviour but leaves
 * nothing to assert. Message the prospect bot once from your own account and
 * pass the chat id.
 *
 * Usage:
 *   node scripts/verify-stage-7.js --chat 12345678
 *   node scripts/verify-stage-7.js --chat 12345678 --keep   (skip the reset)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const { telegramTrigger } = require("./lib/telegram-secret");

const env = loadEnv(["TUNNEL_URL", "N8N_PORT"]);
const TRIGGER = telegramTrigger("wf1-leasing-front", "Prospect Messages (Telegram)");
const N8N = `http://localhost:${env.N8N_PORT || 5678}`;

let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` - ${detail}` : ""}`);
}

function psql(sql) {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER || "leasing",
     "-d", env.POSTGRES_DB || "leasing", "-tA", "-v", "ON_ERROR_STOP=1"],
    { cwd: REPO_ROOT, input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(sql, { timeoutMs = 90000, label = "state" } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = psql(sql);
    if (value) return value;
    await sleep(3000);
  }
  throw new Error(`timed out after ${timeoutMs / 1000}s waiting for ${label}`);
}

function flagValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const CHAT_ID = Number(flagValue("--chat") || env.TELEGRAM_PROSPECT_CHAT_ID || 0);
let messageCounter = Math.floor(Math.random() * 1e6);

async function sendTelegram(text, messageId) {
  const id = messageId || ++messageCounter;
  const response = await fetch(
    new URL(`/webhook/${TRIGGER.webhookId}/webhook`, env.TUNNEL_URL).href,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": TRIGGER.secret,
      },
      body: JSON.stringify({
        update_id: Math.floor(Math.random() * 1e9),
        message: {
          message_id: id,
          from: { id: CHAT_ID, is_bot: false, first_name: "Maya", username: "maya_demo" },
          chat: { id: CHAT_ID, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text,
        },
      }),
    }
  );
  return { status: response.status, messageId: id };
}

async function main() {
  console.log("Stage 7 gate: listing site + Telegram conversation\n");

  if (!CHAT_ID) {
    console.error("A real Telegram chat id is required: --chat <id>");
    console.error("Message the prospect bot once, then run scripts/get-telegram-chat-id.js");
    console.error("(deactivate WF1 first - an active trigger disables getUpdates).");
    process.exit(1);
  }

  /* 1. WF1 is imported and active ---------------------------------------- */
  const list = execFileSync(
    "docker",
    ["compose", "exec", "-T", "n8n", "n8n", "list:workflow"],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" }
  );
  check(list.includes("wf1-leasing-front"), "WF1 imported");

  /* 2. the two bots are different ---------------------------------------- */
  const bots = await Promise.all(
    [env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_PROSPECT_BOT_TOKEN].map((token) =>
      fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json())
    )
  );
  const distinct = bots[0].ok && bots[1].ok && bots[0].result.id !== bots[1].result.id;
  check(
    distinct,
    "Manager and prospect bots are distinct",
    distinct ? `@${bots[0].result.username} / @${bots[1].result.username}` : "SAME BOT - WF1 will steal WF3's webhook"
  );

  /* 3. the site builds and serves ---------------------------------------- */
  execFileSync("node", ["scripts/build-listing-site.js"], { cwd: REPO_ROOT, stdio: "pipe" });
  const indexPath = path.join(REPO_ROOT, "data", "listing-site", "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  check(
    indexHtml.includes("MAPLE-2B") && indexHtml.includes("$1,650"),
    "Listing site built from the units table",
    "index lists both units with their real rent"
  );

  let served = false;
  try {
    const response = await fetch("http://localhost:8080/unit-MAPLE-2B.html");
    served = response.ok && (await response.text()).includes("Contact about this unit");
  } catch {
    served = false;
  }
  check(served, "Listing site is being served on :8080",
    served ? "unit page renders with its contact form" : "run node scripts/serve-listing-site.js");

  /* 4. clean state -------------------------------------------------------- */
  if (!process.argv.includes("--keep")) {
    execFileSync("node", ["scripts/seed-demo.js"], { cwd: REPO_ROOT, stdio: "pipe" });
  }
  check(psql("SELECT count(*) FROM leads;") === "0", "Clean demo state seeded");

  /* 5. the contact form creates a lead and answers with the deep link ----- */
  const nonce = "gate-" + Date.now();
  const form = new URLSearchParams({
    unit_code: "MAPLE-2B",
    prospect_name: "Maya Restrepo",
    prospect_email: "maya.restrepo.demo@example.com",
    prospect_phone: "",
    inquiry_text: "Is parking included, and do you allow a small dog?",
    nonce,
  });

  const inquiry = await fetch(`${N8N}/webhook/listing-inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const inquiryHtml = await inquiry.text();
  const contentType = inquiry.headers.get("content-type") || "";

  check(
    inquiry.status === 200 && contentType.includes("text/html"),
    "Inquiry webhook answers with an HTML page",
    `HTTP ${inquiry.status}, ${contentType}`
  );

  const refToken = await waitFor(
    "SELECT ref_token FROM leads ORDER BY id DESC LIMIT 1;",
    { timeoutMs: 30000, label: "lead row" }
  );
  check(/^R-\d{4}$/.test(refToken), "Lead created from the listing site", refToken);

  check(
    psql(`SELECT source FROM leads WHERE ref_token = '${refToken}';`) === "listing_site",
    "Lead is marked as a listing-site lead"
  );

  const deepLink = inquiryHtml.includes(`?start=${refToken}`) && inquiryHtml.includes("t.me/");
  check(deepLink, "Confirmation page carries the Telegram deep link", `?start=${refToken}`);

  /* 6. a resubmit is idempotent ------------------------------------------ */
  await fetch(`${N8N}/webhook/listing-inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  await sleep(2000);
  check(
    psql("SELECT count(*) FROM leads;") === "1",
    "Resubmitting the form does not create a second lead"
  );

  /* 7. /start binds the chat deterministically --------------------------- */
  await sendTelegram(`/start ${refToken}`);
  const boundChat = await waitFor(
    `SELECT telegram_chat_id FROM leads WHERE ref_token = '${refToken}' AND telegram_chat_id IS NOT NULL;`,
    { label: "chat binding" }
  );
  check(Number(boundChat) === CHAT_ID, "/start binds the chat to the lead", `chat ${boundChat}`);

  /* 8. the opening answer is grounded ------------------------------------ */
  const firstReply = await waitFor(
    `SELECT body FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound' ` +
      "AND channel = 'telegram' ORDER BY id DESC LIMIT 1;",
    { label: "assistant reply" }
  );
  check(firstReply.length > 40, "Assistant answered the question typed on the listing page",
    `${firstReply.length} chars`);

  // Every dollar figure in the reply must exist in the unit record. This is the
  // compliance assertion, not a plumbing check.
  const allowed = psql(
    `SELECT rent_amount::int || ',' || deposit_amount::int || ',' || pet_fee_monthly::int ` +
      "FROM units WHERE unit_code = 'MAPLE-2B';"
  ).split(",").map(Number).concat([50]);
  const figures = (firstReply.match(/\$\s?([\d,]+(?:\.\d+)?)/g) || [])
    .map((f) => Number(f.replace(/[$,\s]/g, "")));
  const ungrounded = figures.filter((f) => !allowed.includes(Math.round(f)));
  check(
    ungrounded.length === 0,
    "No invented figures in the reply",
    `${figures.length} figure(s), all grounded${ungrounded.length ? ` - STRAY: ${ungrounded}` : ""}`
  );

  const guardrail = psql(
    `SELECT guardrail_passed FROM message_log WHERE ref_token = '${refToken}' ` +
      "AND direction = 'outbound' ORDER BY id DESC LIMIT 1;"
  );
  check(guardrail === "t", "Reply passed the Tier A guardrail");

  /* 9. a re-delivered update must not reply twice ------------------------ */
  const outboundBefore = Number(
    psql(`SELECT count(*) FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound';`)
  );
  const dup = await sendTelegram("Just checking - is the balcony private?");
  await waitFor(
    `SELECT count(*) FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound' ` +
      `HAVING count(*) > ${outboundBefore};`,
    { label: "reply to the duplicate probe" }
  );
  const afterFirst = Number(
    psql(`SELECT count(*) FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound';`)
  );

  await sendTelegram("Just checking - is the balcony private?", dup.messageId);
  await sleep(12000);
  const afterReplay = Number(
    psql(`SELECT count(*) FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound';`)
  );
  check(
    afterReplay === afterFirst,
    "A re-delivered Telegram update does not produce a second reply",
    `${afterFirst} outbound before replay, ${afterReplay} after`
  );

  /* 10. slot filling across turns ---------------------------------------- */
  for (const line of [
    "October 5th works for me, and I make about $5,000 a month gross.",
    "One small dog, 18 lbs. One car. Just me living there.",
  ]) {
    await sendTelegram(line);
    await sleep(14000);
  }

  const slots = psql(
    "SELECT move_in_date || '|' || stated_monthly_income || '|' || coalesce(pets,'') || '|' || " +
      `coalesce(vehicles::text,'') || '|' || coalesce(occupants::text,'') FROM leads WHERE ref_token = '${refToken}';`
  );
  const [moveIn, income, pets, vehicles, occupants] = slots.split("|");
  check(moveIn === "2026-10-05", "Move-in date extracted across turns", moveIn);
  check(Number(income) === 5000, "Stated income extracted", `$${income}`);
  check(Boolean(pets && vehicles && occupants),
    "Pets, vehicles and occupants collected", `${pets} / ${vehicles} vehicle(s) / ${occupants} adult(s)`);

  const prequal = psql(`SELECT prequal_result FROM leads WHERE ref_token = '${refToken}';`);
  check(prequal === "clear", "Pre-qualification reached 'clear' through conversation", prequal);

  /* 11. the evidence trail is still compliant ---------------------------- */
  const reasons = psql(`SELECT prequal_reasons::text FROM leads WHERE ref_token = '${refToken}';`);
  check(reasons.includes("unverified"), "Prequal evidence is still labelled unverified");
  check(
    !/approve|denied|reject|score|risk/i.test(reasons),
    "Prequal evidence carries no decision language"
  );

  /* 12. the tour link was delivered on Telegram -------------------------- */
  const tourMessage = psql(
    `SELECT body FROM message_log WHERE ref_token = '${refToken}' AND direction = 'outbound' ` +
      "AND channel = 'telegram' ORDER BY id DESC LIMIT 1;"
  );
  check(
    tourMessage.includes("metadata[ref_token]=" + refToken),
    "Tour booking link delivered on Telegram, carrying the ref token"
  );

  const status = psql(`SELECT status FROM leads WHERE ref_token = '${refToken}';`);
  check(status === "prequalified", "Lead status advanced to prequalified", status);

  console.log(`\nStage 7 gate: ${failures ? `${failures} FAILURE(S)` : "PASS"}`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nGATE ERROR: ${error.message}`);
  process.exit(1);
});
