/**
 * Stage 2 gate.
 *
 * Checks the schema applied, the seed is idempotent, the fixtures exist, and -
 * the part that actually matters - that the fixture numbers still line up with
 * what Plaid Sandbox returns. If Plaid ever changes its canned data, the demo's
 * whole premise breaks silently. This catches that.
 *
 * Usage:
 *   node scripts/verify-stage-2.js
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const { VERIFIED_MONTHLY, applicants, units, criteriaConfig } = require("../fixtures/demo-data");

const env = loadEnv();
const results = [];

function check(label, fn) {
  try {
    results.push({ label, ok: true, detail: fn() || "" });
  } catch (error) {
    results.push({ label, ok: false, detail: (error.message || "").split("\n")[0].slice(0, 150) });
  }
}

function psql(sql) {
  return execFileSync(
    "docker",
    [
      "compose", "exec", "-T", "postgres",
      "psql", "-U", env.POSTGRES_USER || "leasing", "-d", env.POSTGRES_DB || "leasing",
      "-tA", "-v", "ON_ERROR_STOP=1",
    ],
    { cwd: REPO_ROOT, input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

function fixture(name) {
  return path.join(REPO_ROOT, "fixtures", name);
}

check("Schema tables present", () => {
  const tables = psql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name;`
  ).split("\n").filter(Boolean);

  const expected = ["applications", "criteria_config", "leads", "message_log", "units"];
  const missing = expected.filter((t) => !tables.includes(t));
  if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
  return tables.join(", ");
});

check("Criteria config seeded", () => {
  const row = psql(
    `SELECT income_multiple, min_credit_score, income_mismatch_tolerance_pct
     FROM criteria_config WHERE is_active ORDER BY id DESC LIMIT 1;`
  );
  if (!row) throw new Error("no active criteria row");
  const [multiple, credit, tolerance] = row.split("|");
  if (Number(multiple) !== criteriaConfig.income_multiple) {
    throw new Error(`income_multiple is ${multiple}, fixture says ${criteriaConfig.income_multiple}`);
  }
  return `${multiple}x income, min credit ${credit}, ${tolerance}% tolerance`;
});

check("Units seeded", () => {
  const rows = psql(`SELECT unit_code, rent_amount FROM units ORDER BY unit_code;`)
    .split("\n").filter(Boolean);
  if (rows.length !== units.length) throw new Error(`${rows.length} units, expected ${units.length}`);
  return rows.map((r) => r.replace("|", " $")).join(", ");
});

check("Workflow tables empty (clean demo state)", () => {
  const counts = psql(
    `SELECT (SELECT count(*) FROM leads), (SELECT count(*) FROM applications),
            (SELECT count(*) FROM message_log);`
  ).split("|").map(Number);
  if (counts.some((c) => c !== 0)) {
    throw new Error(`leads=${counts[0]} applications=${counts[1]} messages=${counts[2]}`);
  }
  return "leads, applications, message_log all empty";
});

check("Paystub PDFs valid", () => {
  const details = [];
  for (const a of applicants) {
    const file = fixture(`paystub-${a.key}.pdf`);
    if (!fs.existsSync(file)) throw new Error(`${path.basename(file)} missing`);

    const buffer = fs.readFileSync(file);
    if (!buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
      throw new Error(`${path.basename(file)} is not a PDF`);
    }
    if (!buffer.subarray(-32).toString("latin1").includes("%%EOF")) {
      throw new Error(`${path.basename(file)} has no EOF marker`);
    }
    details.push(`${a.key} ${buffer.length}b`);
  }
  return details.join(", ");
});

check("Plaid fixture captured", () => {
  const file = fixture("plaid-payroll-income.json");
  if (!fs.existsSync(file)) throw new Error("run: node scripts/capture-plaid-fixture.js");

  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const stub = payload.items?.[0]?.payroll_income?.[0]?.pay_stubs?.[0];
  if (!stub) throw new Error("no pay stubs in the captured response");

  const gross = stub.pay_period_details?.gross_earnings;
  const monthly = Math.round((gross * 26) / 12 * 100) / 100;

  if (Math.abs(monthly - VERIFIED_MONTHLY) > 0.5) {
    throw new Error(
      `Plaid now reports $${monthly}/mo but fixtures assume $${VERIFIED_MONTHLY}/mo - ` +
        `regenerate fixtures`
    );
  }
  return `$${gross} biweekly = $${monthly}/mo, matches fixtures`;
});

check("Demo paths produce different outcomes", () => {
  // The whole demo rests on these two diverging. Assert the arithmetic here so a
  // fixture edit cannot quietly collapse both paths into the same result.
  const byCode = Object.fromEntries(units.map((u) => [u.unit_code, u]));
  const lines = [];

  for (const a of applicants) {
    const rent = Number(byCode[a.unit_code].rent_amount);
    const tenantRent = rent - a.rental_assistance_amount;
    const verifiedRatio = VERIFIED_MONTHLY / tenantRent;
    const claimedRatio = a.paystub.implied_monthly / tenantRent;
    const mismatchPct =
      Math.abs(a.paystub.implied_monthly - VERIFIED_MONTHLY) / VERIFIED_MONTHLY * 100;

    const meetsIncome = verifiedRatio >= criteriaConfig.income_multiple;
    const mismatchFlagged = mismatchPct > criteriaConfig.income_mismatch_tolerance_pct;
    const wouldMeet = meetsIncome && !mismatchFlagged;
    const expected = a.expected.criteria_result === "meets_criteria";

    if (wouldMeet !== expected) {
      throw new Error(
        `${a.key}: computed ${wouldMeet ? "meets" : "fails"} but fixture expects ` +
          `${a.expected.criteria_result}`
      );
    }

    lines.push(
      `${a.key} on $${rent}: verified ${verifiedRatio.toFixed(2)}x, ` +
        `paper ${claimedRatio.toFixed(2)}x, mismatch ${mismatchPct.toFixed(0)}% -> ` +
        a.expected.criteria_result
    );
  }
  return lines.join(" | ");
});

check("No realistic PII in fixtures", () => {
  // Cheap guard against a real SSN or card number ever landing in the repo.
  const files = fs.readdirSync(fixture("."))
    .filter((f) => /\.(js|json|txt)$/.test(f));

  for (const name of files) {
    const text = fs.readFileSync(fixture(name), "utf8");
    const ssn = text.match(/\b\d{3}-\d{2}-\d{4}\b/);
    if (ssn) throw new Error(`${name} contains an SSN-shaped value: ${ssn[0]}`);
    const card = text.match(/\b(?:4\d{15}|5[1-5]\d{14})\b/);
    if (card) throw new Error(`${name} contains a card-shaped number`);
  }
  return `${files.length} fixture files clean`;
});

console.log("");
for (const r of results) {
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.label.padEnd(38)} ${r.detail}`);
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} check(s) failed.` : "\nStage 2 gate: PASS");
process.exit(failed.length ? 1 : 0);
