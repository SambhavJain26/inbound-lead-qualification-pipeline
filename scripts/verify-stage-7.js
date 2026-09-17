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

const TZ = env.GENERIC_TIMEZONE || "America/New_York";

/** Real availability, so the gate never fails on a guessed hour being taken. */
async function calcomSlots() {
  const day = (offset) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const url =
    `https://api.cal.com/v2/slots?eventTypeId=${env.CALCOM_EVENT_TYPE_ID}` +
    `&start=${day(0)}&end=${day(14)}&timeZone=${encodeURIComponent(TZ)}`;
  const body = await (
    await fetch(url, {
      headers: { Authorization: `Bearer ${env.CALCOM_API_KEY}`, "cal-api-version": "2024-09-04" },
    })
  ).json();
  const out = [];
  for (const entries of Object.values(body.data || {})) {
    for (const entry of entries || []) out.push(typeof entry === "string" ? entry : entry.start);
  }
  return out.sort();
}

async function tourPolicy() {
  const row = psql(
    "SELECT earliest_hour || '|' || latest_hour || '|' || min_notice_hours " +
      "FROM tour_policy WHERE is_active ORDER BY id DESC LIMIT 1;"
  ).split("|");
  return { earliest_hour: +row[0], latest_hour: +row[1], min_notice_hours: +row[2] };
}

function localParts(iso) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = {};
  f.formatToParts(new Date(iso)).forEach((x) => { p[x.type] = x.value; });
  return p;
}

const hoursAway = (iso) => (new Date(iso).getTime() - Date.now()) / 3600000;

function insidePolicy(iso, policy) {
  const hour = Number(localParts(iso).hour) % 24;
  return (
    hour >= policy.earliest_hour &&
    hour < policy.latest_hour &&
    hoursAway(iso) >= policy.min_notice_hours
  );
}

/** "2026-09-15 14:00" in property-local time, for comparing against the DB. */
function localStamp(iso) {
  const p = localParts(iso);
  return `${p.year}-${p.month}-${p.day} ${String(Number(p.hour) % 24).padStart(2, "0")}:${p.minute}`;
}

/** How a person would say it, so the model has something natural to extract. */
function spoken(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * A lead already through pre-qualification, so the tour paths can be exercised
 * without replaying a three-turn conversation for each one.
 */
function seedPrequalifiedLead(token) {
  psql(
    "INSERT INTO leads (ref_token, unit_id, source, prospect_name, prospect_email, " +
      "telegram_chat_id, status, move_in_date, stated_monthly_income, prequal_result) " +
      `SELECT '${token}', id, 'listing_site', 'Gate Tester', 'gate@example.com', ` +
      `${CHAT_ID}, 'prequalified', '2026-10-05', 5000, 'clear' FROM units WHERE unit_code='MAPLE-2B' ` +
      "ON CONFLICT (ref_token) DO NOTHING;"
  );
}

function requestTour(token, slotIso) {
  return fetch(new URL("/webhook/tour-request", env.TUNNEL_URL).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref_token: token, preferred_iso: slotIso }),
  });
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

  const receipt = inquiryHtml.includes('We have sent you a message') && !inquiryHtml.includes('t.me/');
  check(receipt, "Confirmation uses SMS-style wording without a chat button");

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

  /* 13. tour booking: inside the policy, booked without a human ---------- */
  //
  // Times are chosen from what Cal.com ACTUALLY has free rather than guessed,
  // so the gate cannot fail because a hard-coded hour happened to be taken.
  const freeSlots = await calcomSlots();
  const policy = await tourPolicy();
  const inside = freeSlots.find((s) => insidePolicy(s, policy));
  const outside = freeSlots.find((s) => !insidePolicy(s, policy) && hoursAway(s) >= policy.min_notice_hours);

  if (!inside) {
    check(false, "Cal.com has a bookable slot inside the tour policy", "none free - cannot test booking");
  } else {
    await sendTelegram(`Can I come by on ${spoken(inside)}?`);
    const booked = await waitFor(
      `SELECT calcom_booking_uid FROM leads WHERE ref_token = '${refToken}' ` +
        "AND calcom_booking_uid IS NOT NULL;",
      { timeoutMs: 120000, label: "direct booking" }
    );
    check(Boolean(booked), "A time inside the policy books itself, no manager involved", booked);

    const row = psql(
      `SELECT status || '|' || tour_approval_state || '|' || coalesce(lock_code,'') ` +
        `FROM leads WHERE ref_token = '${refToken}';`
    ).split("|");
    check(row[0] === "tour_booked", "Lead advanced to tour_booked", row[0]);
    check(row[1] === "none", "No approval was required", `tour_approval_state=${row[1]}`);
    check(/^\d{6}$/.test(row[2]), "Entry code issued (MOCK)", row[2]);

    const bookedAt = psql(
      `SELECT to_char(tour_starts_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD HH24:MI') ` +
        `FROM leads WHERE ref_token = '${refToken}';`
    );
    check(
      bookedAt === localStamp(inside),
      "Booked the local time that was asked for, not a UTC-shifted one",
      `${bookedAt} local`
    );
  }

  /* 14. outside the policy: held, and NOT booked ------------------------- */
  if (!outside) {
    check(false, "Cal.com has a slot outside the tour policy", "none free - cannot test the exception path");
  } else {
    for (const [token, decision, shouldBook] of [
      ["R-8001", "tour-approve", true],
      ["R-8002", "tour-decline", false],
    ]) {
      seedPrequalifiedLead(token);
      await requestTour(token, outside);
      await sleep(20000);

      const held = psql(
        `SELECT tour_approval_state || '|' || coalesce(calcom_booking_uid,'') ` +
          `FROM leads WHERE ref_token = '${token}';`
      ).split("|");
      check(held[0] === "pending", `${token}: an out-of-policy time is held for the manager`, held[0]);
      check(held[1] === "", `${token}: nothing is booked while it is held`);

      execFileSync("node", ["scripts/simulate-telegram-tap.js", decision, token], {
        cwd: REPO_ROOT, stdio: "pipe",
      });
      await sleep(22000);

      const after = psql(
        `SELECT tour_approval_state || '|' || coalesce(calcom_booking_uid,'') || '|' || ` +
          `coalesce(pending_tour_starts_at::text,'') FROM leads WHERE ref_token = '${token}';`
      ).split("|");

      if (shouldBook) {
        check(after[0] === "approved", `${token}: approving records the approval`, after[0]);
        check(Boolean(after[1]), `${token}: approving books the held slot`, after[1]);
      } else {
        check(after[0] === "declined", `${token}: declining records the decline`, after[0]);
        // The safety property: a declined slot must never have occupied the calendar.
        check(after[1] === "", `${token}: a declined slot is never booked`);
        check(after[2] === "", `${token}: the held slot is released`);
      }
    }
  }

  console.log(`\nStage 7 gate: ${failures ? `${failures} FAILURE(S)` : "PASS"}`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nGATE ERROR: ${error.message}`);
  process.exit(1);
});
