/**
 * Rebuilds the Airtable board from Postgres.
 *
 * Postgres is the system of record; this pushes a current snapshot to the
 * display mirror. Run it before a take, or any time the board has drifted -
 * mirror writes inside the workflows are fire-and-forget, so a failed one is
 * recoverable here rather than being a problem during the demo.
 *
 * Writes batch ten records per request, which also keeps us inside Airtable's
 * five-requests-per-second limit.
 *
 * Usage:
 *   node scripts/sync-airtable.js
 *   node scripts/sync-airtable.js --dry-run
 */

const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv(["AIRTABLE_PAT", "AIRTABLE_BASE_ID"]);
const dryRun = process.argv.includes("--dry-run");
const BASE = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Leads`;

const STATUS_LABEL = {
  new: "New",
  engaged: "Engaged",
  prequalified: "Prequalified",
  tour_booked: "Tour Booked",
  toured: "Toured",
  applied: "Applied",
  closed: "Decided",
};

function psql(sql) {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER || "leasing",
     "-d", env.POSTGRES_DB || "leasing", "-tA", "-v", "ON_ERROR_STOP=1"],
    { cwd: REPO_ROOT, input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

async function airtable(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PAT}`,
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
    throw new Error(`HTTP ${response.status}: ${body?.error?.message || String(text).slice(0, 200)}`);
  }
  return body;
}

/**
 * One row per lead, with the application outcome folded in where there is one -
 * the board shows the whole journey, not just the front of the funnel.
 */
function readPipeline() {
  const sql = `
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT
        l.ref_token,
        l.prospect_name,
        l.prospect_email,
        u.unit_code,
        l.status AS lead_status,
        l.move_in_date,
        l.stated_monthly_income,
        l.tour_starts_at,
        a.ref_token       AS application_ref,
        a.status          AS application_status,
        a.criteria_result,
        a.verified_monthly_income,
        a.income_comparison->>'mismatch_flagged'      AS mismatch_flagged,
        a.income_comparison->>'document_variance_pct' AS variance_pct,
        GREATEST(l.updated_at, COALESCE(a.updated_at, l.updated_at)) AS updated_at
      FROM leads l
      LEFT JOIN units u ON u.id = l.unit_id
      LEFT JOIN applications a ON a.lead_id = l.id

      UNION ALL

      -- Applications submitted without a lead would otherwise be invisible.
      SELECT
        a.ref_token, a.full_name, a.email, u.unit_code,
        'applied', a.desired_move_in, a.claimed_monthly_income, NULL,
        a.ref_token, a.status, a.criteria_result, a.verified_monthly_income,
        a.income_comparison->>'mismatch_flagged',
        a.income_comparison->>'document_variance_pct',
        a.updated_at
      FROM applications a
      LEFT JOIN units u ON u.id = a.unit_id
      WHERE a.lead_id IS NULL

      ORDER BY 15
    ) t;`;

  const raw = psql(sql);
  return raw && raw !== "" ? JSON.parse(raw) || [] : [];
}

function toFields(row) {
  // The application's status wins once one exists - it is further along.
  let status = STATUS_LABEL[row.lead_status] || "New";
  if (row.application_status === "stopped_for_human") status = "Stopped For Review";
  else if (row.application_status === "lease_signed") status = "Leased";
  else if (row.application_status) status = "Applied";

  let incomeFlag = "";
  if (row.mismatch_flagged === "true") {
    incomeFlag = `MISMATCH ${Math.round(Number(row.variance_pct))}% over verified`;
  } else if (row.verified_monthly_income) {
    incomeFlag = "Verified, documents agree";
  }

  return {
    "Ref Token": row.ref_token,
    Prospect: row.prospect_name || "",
    Email: row.prospect_email || "",
    Unit: row.unit_code || "",
    Status: status,
    "Move In": row.move_in_date || null,
    "Stated Income": row.stated_monthly_income ? Math.round(Number(row.stated_monthly_income)) : null,
    "Verified Income": row.verified_monthly_income ? Math.round(Number(row.verified_monthly_income)) : null,
    "Income Flag": incomeFlag,
    Tour: row.tour_starts_at ? String(row.tour_starts_at).slice(0, 16).replace("T", " ") : "",
    Updated: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
}

async function existingRecords() {
  const byToken = new Map();
  let offset;
  do {
    const url = offset ? `${BASE}?pageSize=100&offset=${offset}` : `${BASE}?pageSize=100`;
    const page = await airtable(url);
    for (const record of page.records || []) {
      const token = record.fields["Ref Token"];
      if (token) byToken.set(token, record.id);
    }
    offset = page.offset;
  } while (offset);
  return byToken;
}

async function batched(records, fn, label) {
  let done = 0;
  for (let i = 0; i < records.length; i += 10) {
    await fn(records.slice(i, i + 10));
    done += Math.min(10, records.length - i);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (done) console.log(`  ${label}: ${done}`);
}

async function main() {
  const rows = readPipeline();

  if (!rows.length) {
    console.log("No leads in Postgres. Board left as is.");
    return;
  }

  if (dryRun) {
    console.log(`${rows.length} row(s) would be written:\n`);
    rows.forEach((r) => console.log("  " + JSON.stringify(toFields(r))));
    return;
  }

  const existing = await existingRecords();
  const creates = [];
  const updates = [];

  for (const row of rows) {
    const fields = toFields(row);
    const id = existing.get(row.ref_token);
    if (id) updates.push({ id, fields });
    else creates.push({ fields });
  }

  await batched(creates, (batch) =>
    airtable(BASE, { method: "POST", body: JSON.stringify({ records: batch, typecast: true }) }),
    "created"
  );

  await batched(updates, (batch) =>
    airtable(BASE, { method: "PATCH", body: JSON.stringify({ records: batch, typecast: true }) }),
    "updated"
  );

  console.log(`\nBoard synced from Postgres: ${rows.length} lead(s).`);
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  if (/MODEL_NOT_FOUND|NOT_FOUND/i.test(error.message)) {
    console.error("\nThe Leads table may not exist yet. Run:\n  node scripts/setup-airtable-schema.js");
  }
  process.exit(1);
});
