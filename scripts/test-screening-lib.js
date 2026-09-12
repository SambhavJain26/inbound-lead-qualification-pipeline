/**
 * Tests for the screening logic, run outside n8n.
 *
 * The criteria engine is the compliance centrepiece of the build - it is what
 * makes "the system never decides" a true statement - so it is tested against
 * the real fixtures and the real captured Plaid response rather than invented
 * numbers.
 *
 * Usage:
 *   node scripts/test-screening-lib.js
 */

const fs = require("fs");
const path = require("path");
const lib = require("./lib/screening-lib");
const { units, applicants, criteriaConfig, VERIFIED_MONTHLY } = require("../fixtures/demo-data");

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || "value"} was ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

const byCode = Object.fromEntries(units.map((u) => [u.unit_code, u]));
const maya = applicants.find((a) => a.key === "maya");
const devon = applicants.find((a) => a.key === "devon");

/* ------------------------------------------------------------------- PII */

check("SSN is reduced to last four digits", () => {
  equal(lib.maskSsn("123-45-6789"), "6789");
  equal(lib.maskSsn("123456789"), "6789");
  equal(lib.maskSsn("12"), null);
  equal(lib.maskSsn(null), null);
});

/* ------------------------------------------------------ Plaid normalisation */

check("monthly income is derived from pay frequency", () => {
  equal(lib.monthlyFromPeriod(2306, "BIWEEKLY"), 4996.33);
  equal(lib.monthlyFromPeriod(2000, "MONTHLY"), 2000);
  equal(lib.monthlyFromPeriod(1000, "WEEKLY"), 4333.33);
  equal(lib.monthlyFromPeriod(1000, "NONSENSE"), null);
});

check("the captured Plaid response parses to the fixture figure", () => {
  const file = path.join(__dirname, "..", "fixtures", "plaid-payroll-income.json");
  assert(fs.existsSync(file), "run scripts/capture-plaid-fixture.js first");

  const parsed = lib.parsePlaidPayrollIncome(JSON.parse(fs.readFileSync(file, "utf8")));
  equal(parsed.verified_monthly_income, VERIFIED_MONTHLY, "verified_monthly_income");
  equal(parsed.pay_frequency, "BIWEEKLY", "pay_frequency");
  equal(parsed.gross_per_period, 2306, "gross_per_period");
  equal(parsed.source, "plaid_sandbox");
  equal(parsed.warnings.length, 0, "warnings");
});

check("a Plaid response with no stubs warns instead of throwing", () => {
  const parsed = lib.parsePlaidPayrollIncome({ items: [] });
  equal(parsed.verified_monthly_income, null);
  assert(parsed.warnings.length > 0, "should warn");
});

/* ------------------------------------------------------- income comparison */

check("matching income across all three sources is not flagged", () => {
  const c = lib.computeIncomeComparison({
    claimed: 5000, extracted: VERIFIED_MONTHLY, verified: VERIFIED_MONTHLY, tolerancePct: 10,
  });
  assert(c.document_matches, "document should match");
  assert(c.claimed_matches, "claimed should match");
  assert(!c.mismatch_flagged, "should not flag");
});

check("a falsified pay stub is flagged with its variance", () => {
  const c = lib.computeIncomeComparison({
    claimed: 7800, extracted: 7800, verified: VERIFIED_MONTHLY, tolerancePct: 10,
  });
  assert(c.mismatch_flagged, "should flag");
  assert(!c.document_matches, "document should not match");
  // 7800 vs 4996.33 is a 56% overstatement.
  assert(c.document_variance_pct > 50 && c.document_variance_pct < 60,
    `variance was ${c.document_variance_pct}%, expected ~56%`);
});

check("a small rounding difference stays inside tolerance", () => {
  const c = lib.computeIncomeComparison({
    claimed: 5000, extracted: 5100, verified: 4996.33, tolerancePct: 10,
  });
  assert(!c.mismatch_flagged, "2% variance should not flag");
});

/* ---------------------------------------------------------- criteria engine */

function evaluate(applicant, overrides = {}) {
  const unit = byCode[applicant.unit_code];
  const comparison = lib.computeIncomeComparison({
    claimed: applicant.claimed_monthly_income,
    extracted: applicant.paystub.implied_monthly,
    verified: VERIFIED_MONTHLY,
    tolerancePct: criteriaConfig.income_mismatch_tolerance_pct,
  });

  return lib.runCriteriaEngine({
    application: {
      credit_score: applicant.bureau.credit_score,
      eviction_filings: applicant.bureau.eviction_filings,
      identity_match: applicant.identity.match,
      rental_assistance_amount: applicant.rental_assistance_amount,
      ...overrides,
    },
    unit,
    config: criteriaConfig,
    comparison,
  });
}

check("Maya meets the criteria on every count", () => {
  const outcome = evaluate(maya);
  equal(outcome.result, "meets_criteria", "result");
  equal(outcome.failed_criteria.length, 0, "failed criteria");
  assert(outcome.evidence.length >= 5, "should evaluate at least five criteria");
});

check("Devon fails on both the ratio and the document mismatch", () => {
  const outcome = evaluate(devon);
  equal(outcome.result, "does_not_meet", "result");
  assert(outcome.failed_criteria.includes("income_multiple"), "should fail income multiple");
  assert(outcome.failed_criteria.includes("income_document_match"), "should fail document match");
});

check("Devon would have passed on his paperwork alone", () => {
  // The whole point of the demo: verification is what catches him.
  const unit = byCode[devon.unit_code];
  const paperRatio = devon.paystub.implied_monthly / Number(unit.rent_amount);
  assert(paperRatio >= criteriaConfig.income_multiple,
    `paper ratio was ${paperRatio.toFixed(2)}x, expected to clear ${criteriaConfig.income_multiple}x`);
});

check("every criterion carries an evidence source", () => {
  const outcome = evaluate(maya);
  for (const item of outcome.evidence) {
    if (item.met === null) continue;
    assert(item.source, `${item.criterion} has no source`);
    assert(item.source.document && item.source.field, `${item.criterion} source is incomplete`);
    assert(item.detail && item.detail.length > 5, `${item.criterion} has no readable detail`);
  }
});

check("mocked evidence names itself as a mock", () => {
  const outcome = evaluate(maya);
  const credit = outcome.evidence.find((e) => e.criterion === "credit_score");
  assert(credit.source.document.includes("mock"), "credit source should be labelled mock");
});

check("credit inside the conditional band yields conditional, not a failure", () => {
  const outcome = evaluate(maya, { credit_score: 620 });
  equal(outcome.result, "conditional", "result");
});

check("credit below the conditional band does not meet criteria", () => {
  const outcome = evaluate(maya, { credit_score: 540 });
  equal(outcome.result, "does_not_meet", "result");
});

check("an unevaluated criterion becomes conditional, never a silent pass", () => {
  const outcome = evaluate(maya, { credit_score: null });
  equal(outcome.result, "conditional", "result");
  assert(outcome.unevaluated_criteria.includes("credit_score"));
});

/* ------------------------------------------------- source of income handling */

check("rental assistance is subtracted before the multiple is applied", () => {
  // A voucher holder earning $4,996 cannot clear 3x a $1,950 gross rent, but
  // comfortably clears 3x their own $600 share. Applying the multiple to gross
  // rent is treated as source-of-income discrimination where it is protected.
  const outcome = evaluate(devon, { rental_assistance_amount: 1350 });
  const income = outcome.evidence.find((e) => e.criterion === "income_multiple");

  equal(outcome.tenant_responsible_rent, 600, "tenant-responsible rent");
  assert(income.met, "should meet the multiple against the tenant's own share");
  assert(income.detail.includes("rental assistance"), "detail should show the adjustment");
});

/* ------------------------------------------------------- compliance shape */

check("the engine never emits a decision, score, or recommendation", () => {
  const serialised = JSON.stringify(evaluate(devon)).toLowerCase();
  ["approve", "deny", "denied", "reject", "recommend", "\"score\"", "risk", "rank"].forEach((word) => {
    assert(!serialised.includes(word), `output must not contain ${word}`);
  });
});

check("the result is always one of the three allowed classifications", () => {
  const allowed = ["meets_criteria", "conditional", "does_not_meet"];
  [evaluate(maya), evaluate(devon), evaluate(maya, { credit_score: 620 })].forEach((o) => {
    assert(allowed.includes(o.result), `unexpected result ${o.result}`);
  });
});

check("adverse action requirements are described but never generated", () => {
  const requirements = lib.adverseActionRequirements();
  assert(requirements.length >= 4, "should list the full process");
  assert(requirements.join(" ").includes("Summary of Rights"), "should name the Summary of Rights");
});

/* ---------------------------------------------------------------- report */

console.log("");
if (failures.length) {
  failures.forEach((f) => console.log(`  FAIL  ${f}`));
  console.log(`\n${passed} passed, ${failures.length} failed.`);
  process.exit(1);
}
console.log(`  ${passed} checks passed.`);
