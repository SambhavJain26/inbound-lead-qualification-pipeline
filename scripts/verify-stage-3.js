/**
 * Stage 3 gate: drives the whole front of funnel with real mail and real
 * webhooks, then asserts the state Postgres ended up in.
 *
 * This is deliberately an end-to-end run rather than unit checks. The failures
 * that actually bit during Stage 3 - a dropped query parameter, a JSON schema
 * that was never sent, an empty email - all passed every static check and only
 * showed up when a real message went through.
 *
 * Takes about four minutes: the IMAP trigger polls, so each mail step waits.
 *
 * Usage:
 *   node scripts/verify-stage-3.js
 *   node scripts/verify-stage-3.js --skip-mail   (webhook paths only, ~20s)
 */

const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const { sendMail } = require("./lib/smtp");
const { leadEmail } = require("../fixtures/demo-data");

const env = loadEnv();
const skipMail = process.argv.includes("--skip-mail");
const results = [];

function record(label, ok, detail) {
  results.push({ label, ok, detail });
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

/** Polls a SQL scalar until it is non-empty, or gives up. */
async function waitFor(sql, { timeoutMs = 240000, label = "state" } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = psql(sql);
    if (value) return value;
    await sleep(6000);
  }
  throw new Error(`timed out after ${timeoutMs / 1000}s waiting for ${label}`);
}

async function post(path, body) {
  const url = new URL(path, env.TUNNEL_URL).href;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
  return response.text();
}

async function main() {
  console.log("");

  // --- preconditions ------------------------------------------------------
  try {
    const active = execFileSync(
      "docker",
      ["compose", "exec", "-T", "n8n", "n8n", "list:workflow"],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" }
    );
    record("WF1 imported and active", active.includes("wf1-leasing-front"), "wf1-leasing-front");
  } catch (error) {
    record("WF1 imported and active", false, error.message.split("\n").pop());
  }

  try {
    const hooks = await (await fetch("https://api.cal.com/v2/webhooks", {
      headers: { Authorization: `Bearer ${env.CALCOM_API_KEY}` },
    })).json();
    const list = hooks.data || [];
    const expected = new URL("/webhook/calcom-booking", env.TUNNEL_URL).href;
    const match = list.find((w) => w.subscriberUrl === expected);
    record(
      "Cal.com webhook points at current tunnel",
      Boolean(match),
      match ? expected : "run: node scripts/register-calcom-webhook.js"
    );
  } catch (error) {
    record("Cal.com webhook points at current tunnel", false, error.message);
  }

  // --- clean slate --------------------------------------------------------
  execFileSync("node", ["scripts/seed-demo.js"], { cwd: REPO_ROOT, stdio: "pipe" });
  record("Clean demo state seeded", psql("SELECT count(*) FROM leads;") === "0", "leads empty");

  let refToken = null;

  if (!skipMail) {
    // --- new lead ---------------------------------------------------------
    await sendMail({
      host: "smtp.gmail.com",
      port: 465,
      user: env.PROSPECT_GMAIL_ADDRESS,
      password: String(env.PROSPECT_GMAIL_APP_PASSWORD).replace(/\s+/g, ""),
      fromName: leadEmail.from_name,
      replyTo: leadEmail.reply_to,
      to: env.GMAIL_ADDRESS,
      subject: leadEmail.subject,
      body: leadEmail.body,
    });

    try {
      refToken = await waitFor("SELECT ref_token FROM leads LIMIT 1;", { label: "lead row" });
      record("Lead created from listing email", true, refToken);
    } catch (error) {
      record("Lead created from listing email", false, error.message);
      return finish();
    }

    try {
      const row = await waitFor(
        "SELECT guardrail_passed || '|' || length(body) FROM message_log WHERE direction='outbound' LIMIT 1;",
        { label: "outbound reply" }
      );
      const [passed, length] = row.split("|");
      // Concatenating a boolean to text yields "true"/"false", not "t"/"f".
      record(
        "Grounded reply sent and logged",
        passed === "true" && Number(length) > 200,
        `guardrail_passed=${passed}, ${length} chars`
      );
    } catch (error) {
      record("Grounded reply sent and logged", false, error.message);
    }

    // The reply must not invent a figure. Every dollar amount in it has to
    // appear in the unit facts - this is the guardrail's whole job.
    const body = psql("SELECT body FROM message_log WHERE direction='outbound' LIMIT 1;");
    const quoted = [...body.matchAll(/\$\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));
    const allowed = psql(
      "SELECT rent_amount::int || ',' || deposit_amount::int || ',' || pet_fee_monthly::int || ',50' " +
        "FROM units WHERE unit_code='MAPLE-2B';"
    ).split(",").map(Number);
    const invented = quoted.filter((n) => !allowed.includes(n));
    record("No invented figures in the reply", invented.length === 0,
      invented.length ? `not in unit facts: ${invented.join(", ")}` : `${quoted.length} figures, all grounded`);

    // --- prospect reply / pre-qualification -------------------------------
    await sendMail({
      host: "smtp.gmail.com",
      port: 465,
      user: env.PROSPECT_GMAIL_ADDRESS,
      password: String(env.PROSPECT_GMAIL_APP_PASSWORD).replace(/\s+/g, ""),
      fromName: leadEmail.prospect_name,
      to: env.GMAIL_ADDRESS,
      subject: `Re: 412 Maple Street, Apt 2B, Springfield [${refToken}]`,
      body:
        "Hi! October 5th works for me. I make about $5,000 a month gross. " +
        "One small dog, 18 lbs. One car. Just me living there. Thanks!",
    });

    try {
      const row = await waitFor(
        "SELECT prequal_result || '|' || coalesce(move_in_date::text,'') || '|' || " +
          "coalesce(stated_monthly_income::text,'') || '|' || coalesce(vehicles::text,'') " +
          "FROM leads WHERE prequal_result IS NOT NULL LIMIT 1;",
        { label: "prequal result" }
      );
      const [result, moveIn, income, vehicles] = row.split("|");
      record(
        "Pre-qualification extracted and evaluated",
        result === "clear" && moveIn === "2026-10-05" && Number(income) === 5000 && vehicles === "1",
        `${result}, move-in ${moveIn}, $${income}/mo, ${vehicles} vehicle`
      );
    } catch (error) {
      record("Pre-qualification extracted and evaluated", false, error.message);
    }

    // Pre-qual is scheduling triage on unverified answers. The evidence trail
    // must say so, and must carry no decision language.
    const reasons = psql("SELECT prequal_reasons::text FROM leads LIMIT 1;");
    const hasUnverified = reasons.includes("unverified");
    const hasDecisionWords = /approve|denied|reject|score|risk/i.test(reasons);
    record("Prequal evidence labelled unverified, no decision language",
      hasUnverified && !hasDecisionWords,
      hasUnverified ? "income criterion marked unverified" : "missing the unverified label");
  } else {
    psql(
      "INSERT INTO leads (ref_token, unit_id, source, prospect_name, prospect_email, status) " +
        "VALUES ('R-0001', (SELECT id FROM units WHERE unit_code='MAPLE-2B'), 'manual', " +
        "'Maya Restrepo', '" + env.PROSPECT_GMAIL_ADDRESS + "', 'prequalified');"
    );
    refToken = "R-0001";
    record("Seeded a lead directly (mail steps skipped)", true, refToken);
  }

  // --- tour booking -------------------------------------------------------
  try {
    await post("/webhook/calcom-booking", {
      triggerEvent: "BOOKING_CREATED",
      payload: {
        uid: "bk_verify_1",
        title: "Unit Tour",
        startTime: "2026-09-16T15:00:00Z",
        attendees: [{ email: env.PROSPECT_GMAIL_ADDRESS, name: "Maya Restrepo" }],
        metadata: { ref_token: refToken },
      },
    });

    const row = psql(
      "SELECT status || '|' || coalesce(lock_code,'') || '|' || coalesce(lock_code_source,'') " +
        "FROM leads WHERE ref_token='" + refToken + "';"
    );
    const [status, code, source] = row.split("|");
    record(
      "Tour booking recorded with lock code",
      status === "tour_booked" && /^\d{6}$/.test(code) && source === "mock",
      `${status}, code ${code}, source=${source}`
    );
  } catch (error) {
    record("Tour booking recorded with lock code", false, error.message);
  }

  // --- tour completed -----------------------------------------------------
  try {
    await post("/webhook/tour-completed", { ref_token: refToken });
    const status = psql("SELECT status FROM leads WHERE ref_token='" + refToken + "';");
    record("Application link sent after tour", status === "toured", `status=${status}`);
  } catch (error) {
    record("Application link sent after tour", false, error.message);
  }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length ? `\n${failed.length} check(s) failed.` : "\nStage 3 gate: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
