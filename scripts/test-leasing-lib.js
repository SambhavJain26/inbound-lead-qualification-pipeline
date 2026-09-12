/**
 * Tests for the front-of-funnel logic, run outside n8n.
 *
 * These matter more than they look: this library is inlined into Code nodes, so
 * a bug here surfaces as a confusing workflow failure with no stack trace.
 * Catching it at the command line is far cheaper.
 *
 * Usage:
 *   node scripts/test-leasing-lib.js
 */

const lib = require("./lib/leasing-lib");
const { units, leadEmail, criteriaConfig } = require("../fixtures/demo-data");

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

const unit2b = units[0];
const knowledge = lib.buildUnitKnowledge(unit2b);

/* ------------------------------------------------------------------ tokens */

check("extractRefToken finds a token in a subject", () => {
  equal(lib.extractRefToken("Re: 412 Maple [R-4417]"), "R-4417");
  equal(lib.extractRefToken("no token here"), null);
  equal(lib.extractRefToken("application [A-1234]"), "A-1234");
});

check("subjectWithToken does not double-append", () => {
  const once = lib.subjectWithToken("412 Maple", "R-4417");
  equal(once, "412 Maple [R-4417]");
  equal(lib.subjectWithToken(once, "R-4417"), once);
});

/* ------------------------------------------------------------ lead parsing */

check("parseLeadEmail reads the real fixture", () => {
  const parsed = lib.parseLeadEmail({
    subject: leadEmail.subject,
    body: leadEmail.body,
    replyTo: leadEmail.reply_to,
  });

  equal(parsed.prospect_name, "Maya Restrepo", "prospect_name");
  equal(parsed.prospect_email, leadEmail.reply_to, "prospect_email");
  assert(parsed.unit_hint.includes("Apt 2B"), "unit_hint should name the unit");
  assert(parsed.inquiry_text.includes("small dog"), "inquiry_text should carry the question");
  equal(parsed.parse_warnings.length, 0, "warnings");
});

check("parseLeadEmail tolerates a missing phone without failing", () => {
  const parsed = lib.parseLeadEmail({
    subject: leadEmail.subject,
    body: leadEmail.body,
    replyTo: leadEmail.reply_to,
  });
  // Zillow never includes one. Absent must not be treated as a parse failure.
  equal(parsed.prospect_phone, null, "prospect_phone");
  assert(!parsed.parse_warnings.some((w) => w.includes("phone")), "phone must not warn");
});

check("parseLeadEmail flags a malformed email instead of guessing", () => {
  const parsed = lib.parseLeadEmail({ subject: "", body: "garbage", replyTo: "" });
  assert(parsed.parse_warnings.length >= 3, "should collect warnings");
  equal(parsed.prospect_name, null);
  equal(parsed.inquiry_text, null);
});

/* -------------------------------------------------------------- guardrails */

check("guardrail passes a normal grounded answer", () => {
  const result = lib.guardrailCheck(
    "Yes, one assigned parking space is included, and we do allow dogs under 50 lbs. " +
      "The pet fee is $35 per month.",
    knowledge
  );
  assert(result.passed, `should pass, got ${JSON.stringify(result.findings)}`);
});

check("guardrail blocks protected-class content", () => {
  const result = lib.guardrailCheck(
    "This is a great building for families with children.",
    knowledge
  );
  assert(!result.passed, "should block");
  assert(
    result.findings.some((f) => f.category === "protected_class"),
    "should flag protected class"
  );
});

check("guardrail blocks steering language", () => {
  const result = lib.guardrailCheck("It is a good neighborhood for you.", knowledge);
  assert(!result.passed, "should block steering");
});

check("guardrail blocks approval and availability commitments", () => {
  assert(!lib.guardrailCheck("You will be approved, guaranteed.", knowledge).passed);
  assert(!lib.guardrailCheck("We can hold it for you until Friday.", knowledge).passed);
  assert(!lib.guardrailCheck("We can lower the rent if you sign today.", knowledge).passed);
});

check("guardrail blocks adverse-decision language", () => {
  const result = lib.guardrailCheck("Unfortunately you do not qualify for this unit.", knowledge);
  assert(!result.passed, "should block");
  assert(result.findings.some((f) => f.detail === "adverse decision language"));
});

check("guardrail blocks an invented dollar figure", () => {
  const result = lib.guardrailCheck("Rent is $1,400 per month.", knowledge);
  assert(!result.passed, "should block a rent that is not the real rent");
  assert(result.findings.some((f) => f.category === "unsupported_figure"));
});

check("guardrail allows figures that are in the unit facts", () => {
  const result = lib.guardrailCheck(
    "Rent is $1,650 per month and the deposit is $1,650.",
    knowledge
  );
  assert(result.passed, `should pass, got ${JSON.stringify(result.findings)}`);
});

/* -------------------------------------------------------- pre-qualification */

check("prequal clears a well-matched prospect", () => {
  const outcome = lib.prequalGate(
    { move_in_date: "2026-10-05", stated_monthly_income: 5000, pets: "one small dog" },
    unit2b,
    criteriaConfig
  );
  equal(outcome.result, "clear");
  assert(outcome.reasons.every((r) => r.met), "all criteria should be met");
});

check("prequal reports incomplete rather than failing on missing answers", () => {
  const outcome = lib.prequalGate({ pets: "none" }, unit2b, criteriaConfig);
  equal(outcome.result, "incomplete");
  assert(outcome.missing.includes("move_in_date"));
  assert(outcome.missing.includes("stated_monthly_income"));
});

check("prequal flags a move-in far beyond availability", () => {
  const outcome = lib.prequalGate(
    { move_in_date: "2027-03-01", stated_monthly_income: 6000, pets: "none" },
    unit2b,
    criteriaConfig
  );
  equal(outcome.result, "not_clear");
  assert(outcome.reasons.some((r) => r.criterion === "move_in_timing" && !r.met));
});

check("prequal flags low stated income but keeps it labelled unverified", () => {
  const outcome = lib.prequalGate(
    { move_in_date: "2026-10-05", stated_monthly_income: 3000, pets: "none" },
    unit2b,
    criteriaConfig
  );
  equal(outcome.result, "not_clear");
  const income = outcome.reasons.find((r) => r.criterion === "stated_income");
  assert(income && !income.met, "income criterion should not be met");
  assert(income.detail.includes("unverified"), "must be labelled unverified");
});

check("prequal flags an over-limit pet", () => {
  const outcome = lib.prequalGate(
    { move_in_date: "2026-10-05", stated_monthly_income: 6000, pets: "a 70 lb labrador" },
    unit2b,
    criteriaConfig
  );
  equal(outcome.result, "not_clear");
  assert(outcome.reasons.some((r) => r.criterion === "pets" && !r.met));
});

check("prequal output carries no decision or score field", () => {
  const outcome = lib.prequalGate(
    { move_in_date: "2026-10-05", stated_monthly_income: 5000, pets: "none" },
    unit2b,
    criteriaConfig
  );
  const serialised = JSON.stringify(outcome).toLowerCase();
  ["approve", "deny", "denied", "reject", "score", "risk", "rank"].forEach((word) => {
    assert(!serialised.includes(word), `output must not contain "${word}"`);
  });
});

/* ------------------------------------------------------------- lock code */

check("lock code is six digits and labelled as a mock", () => {
  const lock = lib.generateLockCode();
  assert(/^\d{6}$/.test(lock.code), "six digits");
  equal(lock.source, "mock");
});

/* --------------------------------- conversation knowledge (guardrail scope) */

check("conversation knowledge lets the assistant echo a stated income", () => {
  // In a chat, confirming a figure the prospect just gave you is the natural
  // reply. With only unit facts in the allowlist it is blocked as an invented
  // number and the conversation stalls in silence.
  const knowledge = lib.buildConversationKnowledge(units[0], {
    stated_monthly_income: 5000,
    move_in_date: "2026-10-05",
    pets: "small dog",
    vehicles: 1,
    occupants: 1,
  });
  const verdict = lib.guardrailCheck("Thanks - $5,000 a month, noted.", knowledge);
  assert(verdict.passed, "echoing a stated income should pass: " + JSON.stringify(verdict.findings));
});

check("conversation knowledge still blocks an invented figure", () => {
  const knowledge = lib.buildConversationKnowledge(units[0], { stated_monthly_income: 5000 });
  const verdict = lib.guardrailCheck("The rent on this one is $9,999 a month.", knowledge);
  assert(!verdict.passed, "an invented rent must still be blocked");
});

check("conversation knowledge with no answers equals unit knowledge", () => {
  const bare = lib.buildConversationKnowledge(units[0], {});
  const plain = lib.buildUnitKnowledge(units[0]);
  equal(Object.keys(bare).length, Object.keys(plain).length);
  const verdict = lib.guardrailCheck("We can do $5,000 a month.", bare);
  assert(!verdict.passed, "without a stated income that figure is still ungrounded");
});

check("a naive datetime is read as property-local, not UTC", () => {
  // "Tuesday at 2pm" means 2pm at the property. Read as UTC it books hours out
  // and nothing errors - you only notice by reading the time that was booked.
  equal(lib.naiveLocalToUtcIso("2026-09-15T14:00", "America/New_York"), "2026-09-15T18:00:00.000Z");
});

check("naive conversion respects daylight saving", () => {
  equal(lib.naiveLocalToUtcIso("2026-01-15T14:00", "America/New_York"), "2026-01-15T19:00:00.000Z");
});

check("an explicit offset is left alone", () => {
  equal(lib.naiveLocalToUtcIso("2026-09-15T18:00:00Z", "America/New_York"), "2026-09-15T18:00:00.000Z");
});

/* ------------------------------------------------------- tour slot matching */

const SLOTS = [
  "2026-09-19T13:00:00Z", "2026-09-19T15:00:00Z",
  "2026-09-19T22:00:00Z", "2026-09-20T14:00:00Z",
];
const POLICY = { earliest_hour: 9, latest_hour: 18, allow_weekends: true, min_notice_hours: 12 };

check("tour slot matches the nearest real availability", () => {
  const m = lib.matchTourSlot("2026-09-19T14:30:00Z", SLOTS);
  equal(m.matched, "2026-09-19T15:00:00Z");
  equal(m.delta_minutes, 30);
});

check("tour slot refuses to invent availability", () => {
  // Nothing within tolerance. The assistant must offer alternatives rather than
  // book something days away from what was asked for.
  const m = lib.matchTourSlot("2026-09-25T14:00:00Z", SLOTS);
  equal(m.matched, null);
  assert(m.alternatives.length === 3, "should still offer alternatives");
});

check("tour alternatives are nearest to the request, not merely earliest", () => {
  const m = lib.matchTourSlot("2026-09-20T13:30:00Z", SLOTS);
  assert(m.alternatives.indexOf("2026-09-20T14:00:00Z") > -1,
    "the closest slot must be offered: " + JSON.stringify(m.alternatives));
});

check("tour inside policy is not an exception", () => {
  const c = lib.classifyTourRequest("2026-09-19T15:00:00Z", POLICY, "2026-09-13T10:00:00Z", 11, 6);
  assert(!c.is_exception, "should book without asking: " + JSON.stringify(c.reasons));
});

check("tour outside published hours is held for the manager", () => {
  const c = lib.classifyTourRequest("2026-09-19T23:00:00Z", POLICY, "2026-09-13T10:00:00Z", 19, 6);
  assert(c.is_exception, "after-hours must be an exception");
  assert(/outside self-guided hours/.test(c.reasons.join(" ")), JSON.stringify(c.reasons));
});

check("tour with too little notice is held for the manager", () => {
  const c = lib.classifyTourRequest("2026-09-13T14:00:00Z", POLICY, "2026-09-13T10:00:00Z", 10, 0);
  assert(c.is_exception, "same-day must be an exception");
  assert(/notice/.test(c.reasons.join(" ")), JSON.stringify(c.reasons));
});

check("weekend is allowed when the policy says tours run daily", () => {
  const c = lib.classifyTourRequest("2026-09-19T15:00:00Z", POLICY, "2026-09-13T10:00:00Z", 11, 0);
  assert(!c.is_exception, "published hours say daily, so Sunday is ordinary");
});

/* ---------------------------------------------------------------- report */

console.log("");
if (failures.length) {
  failures.forEach((f) => console.log(`  FAIL  ${f}`));
  console.log(`\n${passed} passed, ${failures.length} failed.`);
  process.exit(1);
}
console.log(`  ${passed} checks passed.`);
