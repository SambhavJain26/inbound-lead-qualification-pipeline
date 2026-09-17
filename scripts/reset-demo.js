/**
 * Returns everything to a clean pre-demo state, between takes.
 *
 * Touches this project's own Postgres and, optionally, its Airtable mirror.
 * Never anything else.
 *
 * Usage:
 *   node scripts/reset-demo.js
 *   node scripts/reset-demo.js --with-airtable
 */

const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv();
const withAirtable = process.argv.includes("--with-airtable");

function run(command, args) {
  return execFileSync(command, args, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" });
}

function psql(sql) {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER || "leasing",
     "-d", env.POSTGRES_DB || "leasing", "-tA", "-v", "ON_ERROR_STOP=1"],
    { cwd: REPO_ROOT, input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

/** Clears the Airtable mirror so the board starts empty on camera. */
async function clearAirtableMirror() {
  if (!env.AIRTABLE_PAT || !env.AIRTABLE_BASE_ID) {
    console.log("  Airtable: not configured, skipped");
    return;
  }

  const base = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Leads`;
  const headers = { Authorization: `Bearer ${env.AIRTABLE_PAT}` };

  const records=[];
  let offset;
  do {
    const listed=await fetch(`${base}?pageSize=100${offset?'&offset='+encodeURIComponent(offset):''}`,{headers});
    if(!listed.ok) throw new Error(`Airtable reset could not list records (HTTP ${listed.status})`);
    const page=await listed.json();
    records.push(...(page.records||[]));
    offset=page.offset;
  } while(offset);
  if (!records.length) {
    console.log("  Airtable: already empty");
    return;
  }

  // Ten per request, which also keeps us inside the five-per-second limit.
  let deleted = 0;
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const query = batch.map((r) => `records[]=${r.id}`).join("&");
    const response = await fetch(`${base}?${query}`, { method: "DELETE", headers });
    if (!response.ok) throw new Error(`Airtable reset failed deleting a batch (HTTP ${response.status})`);
    deleted += batch.length;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`  Airtable: ${deleted} mirror record(s) cleared`);
}

async function main() {
  console.log("Resetting demo state\n");

  run("node", ["scripts/seed-demo.js"]);
  const counts = psql(
    "SELECT (SELECT count(*) FROM units) || ' units, ' || " +
      "(SELECT count(*) FROM leads) || ' leads, ' || " +
      "(SELECT count(*) FROM applications) || ' applications';"
  );
  console.log(`  Postgres: ${counts}`);

  if (withAirtable) await clearAirtableMirror();

  console.log("\nReady for a take.");
  console.log("\nNot reset automatically, and usually fine to leave:");
  console.log("  - DocuSign envelopes from previous runs stay in the sandbox account.");
  console.log("    They do not affect a new run; each approval creates a fresh envelope.");
  console.log("  - Mail already in either inbox. Clear it by hand if it will be on camera.");
  console.log("  - Cal.com bookings. Cancel old ones if the calendar is visible in the take.");
  console.log("  - Telegram chat history, on BOTH bots. There is no API to clear a chat, so");
  console.log("    delete the conversations by hand before a take - the prospect chat is on");
  console.log("    camera and an old conversation above the new one is confusing.");
  console.log("    The database side IS reset, so the assistant starts from zero regardless.");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
