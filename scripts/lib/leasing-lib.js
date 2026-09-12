/**
 * Shared front-of-funnel logic.
 *
 * This file is the single source of truth for lead parsing, reference tokens,
 * Tier A guardrails, and the pre-qualification gate. The build scripts inline it
 * into n8n Code nodes, so it must stay dependency-free and must not use
 * backticks or template literals - those are consumed before reaching the node.
 *
 * Nothing here calls a model. Everything here is deterministic.
 */

/* ------------------------------------------------------------------ tokens */

/**
 * Reference token carried in every subject line. Replies are matched on this
 * first and on sender address only as a fallback - the model never decides
 * which lead a message belongs to.
 */
function makeRefToken(prefix, seed) {
  var n = seed === undefined ? Math.floor(Math.random() * 9000) + 1000 : seed;
  return prefix + "-" + String(n).slice(0, 4);
}

function extractRefToken(text) {
  if (!text) return null;
  var match = String(text).match(/\[([RA]-\d{4})\]/);
  return match ? match[1] : null;
}

function subjectWithToken(subject, token) {
  if (extractRefToken(subject)) return subject;
  return subject + " [" + token + "]";
}

/* ------------------------------------------------------- lead email parsing */

/**
 * Parses a listing-site lead notification.
 *
 * Zillow delivers these as email with an anonymised relay reply-to and no phone
 * number, so the parser must tolerate a missing phone rather than treat it as a
 * failure. Anything it cannot determine is left null and flagged, never guessed.
 */
function parseLeadEmail(input) {
  var subject = input.subject || "";
  var body = input.body || "";
  var replyTo = input.replyTo || input.from || "";

  var result = {
    prospect_name: null,
    prospect_email: null,
    prospect_phone: null,
    unit_hint: null,
    inquiry_text: null,
    source: "zillow_email",
    parse_warnings: [],
  };

  var nameMatch = body.match(/^\s*Renter:\s*(.+)$/m);
  if (nameMatch) result.prospect_name = nameMatch[1].trim();
  else result.parse_warnings.push("no renter name found");

  var propertyMatch = body.match(/^\s*Property:\s*(.+)$/m);
  if (propertyMatch) result.unit_hint = propertyMatch[1].trim();
  else {
    var subjectUnit = subject.match(/:\s*(.+)$/);
    if (subjectUnit) result.unit_hint = subjectUnit[1].trim();
    else result.parse_warnings.push("no property reference found");
  }

  // The renter's own words, between the quotes after "Message:".
  var messageMatch = body.match(/Message:\s*"([\s\S]*?)"/);
  if (messageMatch) result.inquiry_text = messageMatch[1].replace(/\s+/g, " ").trim();
  else result.parse_warnings.push("no inquiry text found");

  var emailMatch = String(replyTo).match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.prospect_email = emailMatch[0];
  else result.parse_warnings.push("no reply address found");

  var phoneMatch = body.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
  if (phoneMatch) result.prospect_phone = phoneMatch[0].trim();

  return result;
}

/* ------------------------------------------------- unit knowledge for the AI */

/**
 * Flattens a unit row into the only facts the FAQ model is allowed to use.
 * If a fact is not in here, the correct answer is "I don't have that".
 */
function buildUnitKnowledge(unit) {
  if (!unit) return null;
  var facts = unit.faq_facts || {};
  var knowledge = {
    unit_code: unit.unit_code,
    address: unit.address,
    bedrooms: unit.beds,
    bathrooms: Number(unit.baths),
    square_feet: unit.sqft,
    monthly_rent: Number(unit.rent_amount),
    security_deposit: Number(unit.deposit_amount),
    available_from: unit.available_from,
    lease_term_months: unit.lease_term_months,
    pet_policy: unit.pet_policy,
    pet_fee_monthly: unit.pet_fee_monthly === null ? null : Number(unit.pet_fee_monthly),
    parking: unit.parking,
    utilities: unit.utilities_included,
    laundry: unit.laundry,
  };
  Object.keys(facts).forEach(function (key) {
    knowledge[key] = facts[key];
  });
  return knowledge;
}

/**
 * Unit facts PLUS the figures the prospect themselves stated, for use as the
 * guardrail's allowlist during a conversation.
 *
 * The unsupported-figure rule exists to stop the model inventing a rent, a fee
 * or a deposit. It is not meant to stop it repeating a number the prospect just
 * supplied - and in a chat, confirming what someone told you ("$5,000 a month,
 * got it") is the natural thing to say. With only unit facts in the allowlist
 * every such reply is blocked, the prospect gets silence, and the conversation
 * stalls on the most ordinary turn there is.
 *
 * Only the recorded slot values are added, never arbitrary numbers scraped from
 * the message, so the check still catches anything the model made up.
 */
function buildConversationKnowledge(unit, statedAnswers) {
  var knowledge = buildUnitKnowledge(unit);
  if (!knowledge) return null;
  var answers = statedAnswers || {};

  if (answers.stated_monthly_income !== null && answers.stated_monthly_income !== undefined) {
    knowledge.prospect_stated_monthly_income = Number(answers.stated_monthly_income);
  }
  if (answers.vehicles !== null && answers.vehicles !== undefined) {
    knowledge.prospect_stated_vehicles = Number(answers.vehicles);
  }
  if (answers.occupants !== null && answers.occupants !== undefined) {
    knowledge.prospect_stated_occupants = Number(answers.occupants);
  }
  if (answers.pets !== null && answers.pets !== undefined && answers.pets !== "") {
    knowledge.prospect_stated_pets = String(answers.pets);
  }
  if (answers.move_in_date !== null && answers.move_in_date !== undefined) {
    knowledge.prospect_stated_move_in = String(answers.move_in_date);
  }
  return knowledge;
}

/**
 * Escapes text for Telegram's HTML parse mode.
 *
 * The Telegram node always sends a parse_mode, so message text is parsed for
 * entities whether you want it or not. Under the legacy Markdown default a
 * single underscore opens an italic run that never closes, and Telegram rejects
 * the whole message with "can't parse entities" and a byte offset - which is
 * exactly what an application link carrying ?ref_token= does. The node then
 * fails with a bare "Bad request - please check your parameters".
 *
 * So: send HTML parse mode and escape the three characters it cares about.
 * Underscores, asterisks and brackets are then all literal, and a URL with a
 * query string is safe.
 */
function escapeTelegramHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;");
}

/* -------------------------------------------------------------- guardrails */

/**
 * Tier A guardrail. Runs on every message before it leaves, and again at send
 * time, because a manager may have edited the wording after it was drafted.
 *
 * Blocks: protected-class content, legal or lease commitments, rent negotiation,
 * availability promises, and invented numbers that are not in the unit facts.
 */
var PROTECTED_CLASS_PATTERNS = [
  { pattern: /\b(kids?|children|child|family friendly|families|school district)\b/i, label: "familial status" },
  { pattern: /\b(disab|wheelchair|handicap|mental health|service animal policy)\b/i, label: "disability" },
  { pattern: /\b(race|ethnic|nationality|immigration|citizen|visa status)\b/i, label: "national origin / race" },
  { pattern: /\b(church|mosque|temple|synagogue|religio)\b/i, label: "religion" },
  { pattern: /\b(marital status|married|single people|couples only)\b/i, label: "marital status" },
  { pattern: /\b(section 8|voucher|housing assistance|welfare)\b/i, label: "source of income" },
  { pattern: /\b(good neighborhood for|safe area for|type of people)\b/i, label: "steering" },
];

var COMMITMENT_PATTERNS = [
  { pattern: /\b(guarantee|guaranteed|we promise|you will be approved|pre-?approved)\b/i, label: "approval commitment" },
  { pattern: /\b(hold (it|the unit) for you|reserved for you|it'?s yours)\b/i, label: "availability commitment" },
  { pattern: /\b(we can lower|discount the rent|negotiate the rent|reduce the rent)\b/i, label: "rent negotiation" },
  { pattern: /\b(legally|by law|you are entitled|your rights under)\b/i, label: "legal statement" },
  { pattern: /\b(denied|rejected|you do not qualify|we cannot rent to you)\b/i, label: "adverse decision language" },
];

function guardrailCheck(text, knowledge) {
  var findings = [];
  var body = String(text || "");

  PROTECTED_CLASS_PATTERNS.forEach(function (rule) {
    if (rule.pattern.test(body)) {
      findings.push({ severity: "block", category: "protected_class", detail: rule.label });
    }
  });

  COMMITMENT_PATTERNS.forEach(function (rule) {
    if (rule.pattern.test(body)) {
      findings.push({ severity: "block", category: "commitment", detail: rule.label });
    }
  });

  // Any dollar figure in the message must appear in the unit facts. Catches the
  // model inventing a rent, fee, or deposit.
  if (knowledge) {
    var allowed = [];
    Object.keys(knowledge).forEach(function (key) {
      var value = knowledge[key];
      if (typeof value === "number") allowed.push(Math.round(value));
      if (typeof value === "string") {
        var found = value.match(/\d[\d,]*(\.\d+)?/g) || [];
        found.forEach(function (n) { allowed.push(Math.round(Number(n.replace(/,/g, "")))); });
      }
    });

    var quoted = body.match(/\$\s?\d[\d,]*(\.\d+)?/g) || [];
    quoted.forEach(function (raw) {
      var amount = Math.round(Number(raw.replace(/[$,\s]/g, "")));
      if (allowed.indexOf(amount) === -1) {
        findings.push({
          severity: "block",
          category: "unsupported_figure",
          detail: raw.trim() + " is not in the unit facts",
        });
      }
    });
  }

  var blocking = findings.filter(function (f) { return f.severity === "block"; });
  return {
    passed: blocking.length === 0,
    findings: findings,
    checked_at: new Date().toISOString(),
  };
}

/* ------------------------------------------------------- pre-qualification */

/**
 * Scheduling triage only. This is NOT a rental decision and its output must
 * never be phrased to a prospect as a denial.
 *
 * Deliberately narrow: move-in timing, self-reported income against the
 * published multiple, pet policy, and occupancy. Nothing else is considered and
 * nothing here is verified.
 */
function prequalGate(answers, unit, config) {
  var reasons = [];
  var missing = [];
  var incomeMultiple = config && config.income_multiple ? Number(config.income_multiple) : 3;

  if (!answers || answers.move_in_date === null || answers.move_in_date === undefined) {
    missing.push("move_in_date");
  } else {
    var availableFrom = new Date(unit.available_from);
    var wanted = new Date(answers.move_in_date);
    var daysAfter = (wanted - availableFrom) / 86400000;

    if (daysAfter < -14) {
      reasons.push({
        criterion: "move_in_timing",
        met: false,
        detail: "wants " + answers.move_in_date + ", unit is available from " + unit.available_from,
      });
    } else if (daysAfter > 60) {
      reasons.push({
        criterion: "move_in_timing",
        met: false,
        detail: "move-in is more than 60 days after the unit is available",
      });
    } else {
      reasons.push({ criterion: "move_in_timing", met: true, detail: answers.move_in_date });
    }
  }

  if (answers && (answers.stated_monthly_income === null || answers.stated_monthly_income === undefined)) {
    missing.push("stated_monthly_income");
  } else if (answers) {
    // Self-reported and unverified. Verification happens after an application.
    var rent = Number(unit.rent_amount);
    var stated = Number(answers.stated_monthly_income);
    var ratio = stated / rent;
    reasons.push({
      criterion: "stated_income",
      met: ratio >= incomeMultiple,
      detail: "$" + stated + "/mo stated against $" + rent + " rent = " + ratio.toFixed(2) + "x (unverified)",
    });
  }

  if (answers && answers.pets && String(answers.pets).toLowerCase() !== "none") {
    var weightMatch = String(answers.pets).match(/(\d+)\s?(lb|pound)/i);
    var overLimit = weightMatch && Number(weightMatch[1]) > 50;
    reasons.push({
      criterion: "pets",
      met: !overLimit,
      detail: overLimit ? "stated pet is over the 50 lb limit" : String(answers.pets),
    });
  }

  var failed = reasons.filter(function (r) { return r.met === false; });
  var result = missing.length ? "incomplete" : failed.length ? "not_clear" : "clear";

  return {
    result: result,
    reasons: reasons,
    missing: missing,
    evaluated_at: new Date().toISOString(),
  };
}

/* ------------------------------------------------------- AI output shape */

/**
 * Unwraps structured output from the OpenAI node.
 *
 * The payload arrives wrapped differently depending on node version, whether
 * simplify is on, and whether a JSON schema was applied - sometimes a parsed
 * object, sometimes a JSON string under `output`, sometimes nested one level
 * deeper. Probing for a known key is more robust than assuming a shape.
 *
 * @param {*} data       the item's json
 * @param {string} anchor a key that must exist on the real payload
 */
function unwrapAiPayload(data, anchor) {
  var value = data;

  for (var depth = 0; depth < 6; depth++) {
    if (value === null || value === undefined) break;

    if (typeof value === "string") {
      var trimmed = value.trim();
      if (trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "[") break;
      try {
        value = JSON.parse(trimmed);
      } catch (error) {
        break;
      }
      continue;
    }

    if (Array.isArray(value)) {
      value = value[0];
      continue;
    }

    if (typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, anchor)) return value;

      var next =
        value.output !== undefined ? value.output :
        value.message !== undefined ? value.message :
        value.content !== undefined ? value.content :
        value.text !== undefined ? value.text :
        value.json !== undefined ? value.json : undefined;

      if (next === undefined) break;
      value = next;
      continue;
    }

    break;
  }

  return value;
}

/* ------------------------------------------------------------- lock code */

/**
 * Self-guided tour entry code.
 *
 * MOCK. A real deployment issues this through a smart-lock platform
 * (Rently, Tour24, ButterflyMX) bound to the booking window. Here it is
 * generated locally and logged, and every record it touches is marked
 * source: "mock".
 */
function generateLockCode() {
  var code = String(Math.floor(Math.random() * 900000) + 100000);
  return { code: code, source: "mock", issued_at: new Date().toISOString() };
}

if (typeof module !== "undefined") {
  module.exports = {
    makeRefToken,
    extractRefToken,
    subjectWithToken,
    parseLeadEmail,
    buildUnitKnowledge,
    buildConversationKnowledge,
    escapeTelegramHtml,
    guardrailCheck,
    prequalGate,
    generateLockCode,
    unwrapAiPayload,
  };
}
