/**
 * Applies the schema and seeds the clean pre-demo state.
 *
 * Safe to run repeatedly - it drops and recreates every demo table. It touches
 * only this project's own Postgres container and nothing else.
 *
 * Seeds: criteria config, two units, and nothing else. Leads and applications
 * are created by the workflows during the demo; seeding them would defeat the
 * point of running the pipeline on camera.
 *
 * Usage:
 *   node scripts/seed-demo.js
 *   node scripts/seed-demo.js --schema-only
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const { criteriaConfig, tourPolicy, units } = require("../fixtures/demo-data");

const env = loadEnv();
const DB_USER = env.POSTGRES_USER || "leasing";
const DB_NAME = env.POSTGRES_DB || "leasing";

/** Runs SQL inside the postgres container. Input goes over stdin, never argv. */
function psql(sql, { quiet = false } = {}) {
  const args = [
    "compose", "exec", "-T", "postgres",
    "psql", "-U", DB_USER, "-d", DB_NAME,
    "-v", "ON_ERROR_STOP=1",
  ];
  if (quiet) args.push("-tA");

  return execFileSync("docker", args, {
    cwd: REPO_ROOT,
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/** Postgres string literal. Everything seeded here is our own fixture data. */
function lit(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonLit(value) {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

function applySchema() {
  const schemaPath = path.join(REPO_ROOT, "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  psql(sql);
  console.log("  schema applied (db/schema.sql)");
}

function seedCriteria() {
  const c = criteriaConfig;
  psql(`
    INSERT INTO criteria_config
      (name, income_multiple, min_credit_score, conditional_credit_min,
       max_eviction_filings, eviction_lookback_years, income_mismatch_tolerance_pct, is_active)
    VALUES
      (${lit(c.name)}, ${c.income_multiple}, ${c.min_credit_score}, ${c.conditional_credit_min},
       ${c.max_eviction_filings}, ${c.eviction_lookback_years}, ${c.income_mismatch_tolerance_pct}, TRUE);
  `);
  console.log(
    `  criteria: ${c.income_multiple}x income, min credit ${c.min_credit_score}, ` +
      `${c.income_mismatch_tolerance_pct}% income tolerance`
  );
}

function seedTourPolicy() {
  const t = tourPolicy;
  psql(`
    INSERT INTO tour_policy
      (name, earliest_hour, latest_hour, allow_weekends, min_notice_hours, is_active)
    VALUES
      (${lit(t.name)}, ${t.earliest_hour}, ${t.latest_hour},
       ${t.allow_weekends ? "TRUE" : "FALSE"}, ${t.min_notice_hours}, TRUE);
  `);
  console.log(
    `  tour policy: ${t.earliest_hour}:00-${t.latest_hour}:00, ` +
      `${t.min_notice_hours}h notice, weekends ${t.allow_weekends ? "allowed" : "held"}`
  );
}

function seedUnits() {
  for (const u of units) {
    psql(`
      INSERT INTO units
        (unit_code, address, beds, baths, sqft, rent_amount, deposit_amount, available_from,
         pet_policy, pet_fee_monthly, parking, utilities_included, laundry,
         lease_term_months, title, description, photos, faq_facts, status)
      VALUES
        (${lit(u.unit_code)}, ${lit(u.address)}, ${u.beds}, ${u.baths}, ${u.sqft},
         ${u.rent_amount}, ${u.deposit_amount}, ${lit(u.available_from)},
         ${lit(u.pet_policy)}, ${u.pet_fee_monthly}, ${lit(u.parking)},
         ${lit(u.utilities_included)}, ${lit(u.laundry)}, ${u.lease_term_months},
         ${lit(u.title)}, ${lit(u.description)}, ${jsonLit(u.photos)},
         ${jsonLit(u.faq_facts)}, 'available');
    `);
    console.log(`  unit ${u.unit_code}: ${u.beds}bd/${u.baths}ba, $${u.rent_amount}/mo`);
  }
}

function summarise() {
  const out = psql(
    `SELECT 'criteria_config', count(*) FROM criteria_config
     UNION ALL SELECT 'units', count(*) FROM units
     UNION ALL SELECT 'leads', count(*) FROM leads
     UNION ALL SELECT 'applications', count(*) FROM applications
     UNION ALL SELECT 'message_log', count(*) FROM message_log
     ORDER BY 1;`,
    { quiet: true }
  );
  console.log("\nRow counts:");
  for (const line of out.trim().split("\n")) {
    const [table, count] = line.split("|");
    console.log(`  ${table.padEnd(18)} ${count}`);
  }
}

function main() {
  console.log("Seeding demo database...\n");
  applySchema();

  if (!process.argv.includes("--schema-only")) {
    seedCriteria();
    seedTourPolicy();
    seedUnits();
  }

  summarise();
  console.log("\nClean demo state ready.");
}

try {
  main();
} catch (error) {
  const detail = (error.stderr || error.message || "").toString().trim();
  console.error(`\nFAILED:\n${detail}`);
  process.exit(1);
}
