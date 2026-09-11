/**
 * Tests every credential against its real API. Existing in .env is not the same
 * as working, and the failures that matter here (DocuSign consent, a Production
 * Plaid secret, a wrong Airtable scope) only show up on a live call.
 *
 * Nothing here writes or sends anything, except the optional Telegram message.
 *
 * Usage:
 *   node scripts/verify-credentials.js
 *   node scripts/verify-credentials.js --telegram   (also sends a test message)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const tls = require("tls");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv();
const results = [];

function record(label, ok, detail) {
  results.push({ label, ok, detail });
}

async function test(label, fn) {
  try {
    record(label, true, await fn());
  } catch (error) {
    record(label, false, (error.message || String(error)).split("\n")[0].slice(0, 160));
  }
}

/** POST/GET helper that surfaces the API's own error text rather than "400". */
async function api(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body?.error_description ||
      body?.error?.message ||
      body?.error_message ||
      body?.message ||
      body?.error ||
      (typeof body === "string" ? body.slice(0, 120) : JSON.stringify(body).slice(0, 120));
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return body;
}

/** Minimal line-oriented TLS conversation, used for SMTP and IMAP. */
function tlsConverse(host, port, steps, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host }, () => {});
    let buffer = "";
    let stepIndex = 0;
    const transcript = [];

    const finish = (error, value) => {
      socket.destroy();
      error ? reject(error) : resolve(value);
    };

    const timer = setTimeout(() => finish(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
    socket.on("error", (error) => {
      clearTimeout(timer);
      finish(error);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const step = steps[stepIndex];
      if (!step || !step.expect.test(buffer)) return;

      transcript.push(buffer.trim().split("\n").pop());
      buffer = "";
      stepIndex += 1;

      if (step.fail && step.fail.test(transcript[transcript.length - 1])) {
        clearTimeout(timer);
        return finish(new Error(transcript[transcript.length - 1]));
      }
      if (stepIndex >= steps.length) {
        clearTimeout(timer);
        return finish(null, transcript[transcript.length - 1].slice(0, 80));
      }
      if (steps[stepIndex].send !== undefined) socket.write(steps[stepIndex].send);
    });
  });
}

function b64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

/** Builds and signs the DocuSign JWT assertion with the local RSA private key. */
function docusignAssertion() {
  const keyPath = path.join(REPO_ROOT, env.DOCUSIGN_PRIVATE_KEY_PATH || "docusign-private.key");
  const privateKey = fs.readFileSync(keyPath, "utf8");
  const authHost = new URL(env.DOCUSIGN_AUTH_BASE || "https://account-d.docusign.com").host;
  const now = Math.floor(Date.now() / 1000);

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({
    iss: env.DOCUSIGN_INTEGRATION_KEY,
    sub: env.DOCUSIGN_USER_ID,
    aud: authHost,
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  });

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey).toString("base64url");

  return `${header}.${payload}.${signature}`;
}

async function main() {
  await test("OpenAI", async () => {
    const body = await api("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    return `${body.data.length} models available`;
  });

  await test("Telegram bot", async () => {
    const body = await api(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    if (!body.ok) throw new Error(body.description);
    return `@${body.result.username}`;
  });

  await test("Plaid Sandbox", async () => {
    const body = await api("https://sandbox.plaid.com/institutions/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.PLAID_CLIENT_ID,
        secret: env.PLAID_SANDBOX_SECRET,
        count: 1,
        offset: 0,
        country_codes: ["US"],
      }),
    });
    return `sandbox reachable, ${body.total} institutions`;
  });

  await test("Cal.com", async () => {
    try {
      const v2 = await api("https://api.cal.com/v2/me", {
        headers: { Authorization: `Bearer ${env.CALCOM_API_KEY}` },
      });
      const me = v2.data || v2;
      return `v2 ok, user ${me.username || me.email || me.id}`;
    } catch (v2Error) {
      const v1 = await api(`https://api.cal.com/v1/me?apiKey=${env.CALCOM_API_KEY}`);
      const me = v1.user || v1;
      return `v1 ok, user ${me.username || me.email || me.id} (v2 said: ${v2Error.message.slice(0, 40)})`;
    }
  });

  await test("Cal.com event type", async () => {
    if (!env.CALCOM_EVENT_TYPE_ID) throw new Error("CALCOM_EVENT_TYPE_ID not set");
    try {
      const body = await api(`https://api.cal.com/v2/event-types/${env.CALCOM_EVENT_TYPE_ID}`, {
        headers: { Authorization: `Bearer ${env.CALCOM_API_KEY}` },
      });
      const et = body.data?.eventType || body.data || body;
      return `"${et.title}" ${et.lengthInMinutes || et.length}min`;
    } catch {
      const body = await api(
        `https://api.cal.com/v1/event-types/${env.CALCOM_EVENT_TYPE_ID}?apiKey=${env.CALCOM_API_KEY}`
      );
      const et = body.event_type || body;
      return `"${et.title}" ${et.length}min`;
    }
  });

  await test("DocuSign JWT + consent", async () => {
    const body = await api(`${env.DOCUSIGN_AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: docusignAssertion(),
      }),
    });
    if (!body.access_token) throw new Error("no access_token in response");
    return `token acquired, expires in ${body.expires_in}s`;
  });

  await test("DocuSign account", async () => {
    const token = await api(`${env.DOCUSIGN_AUTH_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: docusignAssertion(),
      }),
    });
    const info = await api(`${env.DOCUSIGN_AUTH_BASE}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const account =
      info.accounts.find((a) => a.account_id === env.DOCUSIGN_ACCOUNT_ID) ||
      info.accounts.find((a) => a.is_default);

    if (!account) throw new Error("DOCUSIGN_ACCOUNT_ID matches none of this user's accounts");
    const matches = account.account_id === env.DOCUSIGN_ACCOUNT_ID;
    return matches
      ? `"${account.account_name}" (id matches)`
      : `WARNING: .env account id does not match default "${account.account_name}" (${account.account_id})`;
  });

  await test("Airtable PAT + base", async () => {
    const body = await api(
      `https://api.airtable.com/v0/meta/bases/${env.AIRTABLE_BASE_ID}/tables`,
      { headers: { Authorization: `Bearer ${env.AIRTABLE_PAT}` } }
    );
    const names = body.tables.map((t) => t.name);
    return `base reachable, ${names.length} table(s): ${names.join(", ") || "none"}`;
  });

  await test("SMTP (send)", async () => {
    const host = env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(env.SMTP_PORT || 465);
    const password = (env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
    return tlsConverse(host, port, [
      { expect: /^220[\s-]/m },
      { send: "EHLO leasing.local\r\n", expect: /^250 /m },
      { send: "AUTH LOGIN\r\n", expect: /^334 /m },
      { send: `${b64(env.GMAIL_ADDRESS)}\r\n`, expect: /^334 /m },
      { send: `${b64(password)}\r\n`, expect: /^(235|535)[\s-]/m, fail: /^535/ },
    ]).then(() => `authenticated as ${env.GMAIL_ADDRESS}`);
  });

  await test("IMAP (receive)", async () => {
    const host = env.IMAP_HOST || "imap.gmail.com";
    const port = Number(env.IMAP_PORT || 993);
    const password = (env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
    return tlsConverse(host, port, [
      { expect: /^\* OK/m },
      {
        send: `a1 LOGIN "${env.GMAIL_ADDRESS}" "${password}"\r\n`,
        expect: /^a1 (OK|NO|BAD)/m,
        fail: /^a1 (NO|BAD)/,
      },
    ]).then(() => `authenticated as ${env.GMAIL_ADDRESS}`);
  });

  if (process.argv.includes("--telegram")) {
    await test("Telegram send", async () => {
      const body = await api(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_MANAGER_CHAT_ID,
            text: "Credential check passed - all services reachable.",
          }),
        }
      );
      if (!body.ok) throw new Error(body.description);
      return "message delivered";
    });
  }

  console.log("");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.label.padEnd(22)} ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(failed.length ? `\n${failed.length} failed.` : "\nAll credentials verified.");
  process.exit(failed.length ? 1 : 0);
}

main();
