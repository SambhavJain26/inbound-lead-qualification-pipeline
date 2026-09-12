/**
 * Builds n8n-workflows/wf1-leasing-front.json.
 *
 * WF1 is the front of funnel. A renter finds a unit on the listing site, submits
 * the contact form, and is handed to the leasing assistant on Telegram, where
 * the whole conversation happens: questions answered from the unit's own facts,
 * pre-qualification collected across turns, a tour booked, and an application
 * link sent afterwards.
 *
 * Entry points:
 *   1. Listing site  - POST /webhook/listing-inquiry, answers with an HTML page
 *                      carrying a t.me deep link
 *   2. Telegram      - the prospect conversation, on the PROSPECT bot
 *   3. Cal.com       - booking created webhook
 *   4. Tour done     - demo helper webhook standing in for "the tour happened"
 *   5. IMAP          - the original Zillow-format email path, kept as a proven
 *                      second entry point and a talking point
 *
 * Two rules shape the Telegram branch:
 *
 *   IDENTITY IS DETERMINISTIC. The /start R-xxxx deep-link payload binds the
 *   chat to a lead; every later message resolves by chat_id. SQL does it. The
 *   model never sees the question and never emits a record id.
 *
 *   THE GATE DRIVES THE CONVERSATION, NOT THE MODEL. prequalGate() decides the
 *   outcome and a fixed COLLECT_ORDER decides what is still outstanding; the
 *   next question is a FIXED STRING from QUESTION_PROMPTS. The model answers
 *   what was asked and extracts what was stated. It is told, explicitly, not to
 *   ask the pre-qualification question itself.
 *
 * Run: node scripts/build-wf1-leasing-front.js
 */

const path = require("path");
const wf = require("./lib/wf-common");
const { REPO_ROOT } = require("./lib/env");

const LIB = wf.inlineLib("leasing-lib.js");
const OUT = path.join(REPO_ROOT, "n8n-workflows", "wf1-leasing-front.json");

/* --------------------------------------------------------------- schemas */

/**
 * One call per conversation turn: answer grounded, extract what was stated,
 * classify the message. All three are inside the four bounded AI jobs, and two
 * calls would double latency and cost for no compliance gain.
 *
 * No field here can carry a decision, score, rank, risk label or recommendation,
 * and none may exist. `intent` labels the MESSAGE, never the person.
 */
const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply_text: {
      type: "string",
      description:
        "Your answer to the prospect's message, grounded ONLY in the supplied unit facts. " +
        "Two to four sentences, chat register. Do NOT ask the pre-qualification question - " +
        "the system appends that itself. No greeting block, no email sign-off, no subject line.",
    },
    questions_answered: {
      type: "array",
      items: { type: "string" },
      description: "Each prospect question answered from the supplied facts.",
    },
    questions_unanswered: {
      type: "array",
      items: { type: "string" },
      description: "Questions that could not be answered because the fact was not supplied.",
    },
    refused_questions: {
      type: "array",
      items: { type: "string" },
      description: "Questions refused because answering would touch a protected class.",
    },
    prequal: {
      type: "object",
      properties: {
        move_in_date: {
          type: ["string", "null"],
          description: "ISO date YYYY-MM-DD, or null if not stated in THIS message.",
        },
        stated_monthly_income: {
          type: ["number", "null"],
          description:
            "Gross MONTHLY income as stated. Annual figures divided by 12, ranges take the " +
            "lower bound. Null if not stated in this message.",
        },
        pets: {
          type: ["string", "null"],
          description: "Verbatim description of pets, or 'none', or null if not stated.",
        },
        vehicles: { type: ["integer", "null"], description: "Number of vehicles, or null." },
        occupants: {
          type: ["integer", "null"],
          description:
            "Number of ADULTS who will live there. Never record children or family composition.",
        },
      },
      additionalProperties: false,
      required: ["move_in_date", "stated_monthly_income", "pets", "vehicles", "occupants"],
    },
    intent: {
      type: "string",
      enum: ["question", "prequal_answer", "book_tour", "apply", "handoff_request", "smalltalk", "other"],
      description: "What this MESSAGE is doing. Never a label about the person.",
    },
    wants_human: {
      type: "boolean",
      description: "True only if the prospect explicitly asked to speak to a person.",
    },
  },
  additionalProperties: false,
  required: [
    "reply_text", "questions_answered", "questions_unanswered", "refused_questions",
    "prequal", "intent", "wants_human",
  ],
};

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    reply_text: {
      type: "string",
      description: "The full email body to send to the prospect. Plain text, no subject line.",
    },
    questions_answered: {
      type: "array",
      items: { type: "string" },
      description: "Each prospect question that was answered from the supplied facts.",
    },
    questions_unanswered: {
      type: "array",
      items: { type: "string" },
      description: "Questions that could not be answered because the fact was not supplied.",
    },
    refused_questions: {
      type: "array",
      items: { type: "string" },
      description: "Questions refused because answering would touch a protected class.",
    },
  },
  additionalProperties: false,
  required: ["reply_text", "questions_answered", "questions_unanswered", "refused_questions"],
};

const PREQUAL_SCHEMA = {
  type: "object",
  properties: {
    move_in_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD, or null if not stated." },
    stated_monthly_income: { type: ["number", "null"], description: "Gross monthly income as stated, or null." },
    pets: { type: ["string", "null"], description: "Verbatim description of pets, or 'none', or null." },
    vehicles: { type: ["integer", "null"], description: "Number of vehicles, or null." },
    occupants: { type: ["integer", "null"], description: "Number of adults who will live there, or null." },
    other_questions: {
      type: "array",
      items: { type: "string" },
      description: "Any new questions the prospect asked in this reply.",
    },
  },
  additionalProperties: false,
  required: ["move_in_date", "stated_monthly_income", "pets", "vehicles", "occupants", "other_questions"],
};

/* ------------------------------------------------------------ instructions */

/** Shared by the email reply and the Telegram turn. Grounding + fair housing. */
const GROUNDING_RULES = [
  "ANSWER ONLY FROM THE SUPPLIED UNIT FACTS. If a fact is not in the JSON you are given, say you",
  "will check with the team and have someone follow up. Never estimate, never infer, never invent",
  "a number, and never state a figure that is not in the facts.",
  "",
  "FAIR HOUSING - THIS IS NOT OPTIONAL:",
  "Never mention or ask about race, colour, national origin, religion, sex, familial status,",
  "children, disability, age, marital status, or source of income. If the prospect asks anything",
  "that would require you to characterise the neighbourhood's people, schools, or suitability for",
  "families, do not answer it. Give the factual property details instead and list the question in",
  "refused_questions.",
  "",
  "NEVER: promise approval, hold or reserve a unit, negotiate rent, state anything about legal",
  "rights, or tell anyone they do not qualify.",
];

const TURN_INSTRUCTIONS = [
  "You are a leasing assistant talking to a prospective renter in a Telegram chat.",
  "",
].concat(GROUNDING_RULES).concat([
  "",
  "EXTRACTION:",
  "Report in `prequal` ONLY what the prospect actually stated IN THIS MESSAGE. If something was",
  "not stated in this message, return null for it - even if you can see it earlier in the",
  "conversation. Never infer, estimate, or fill in a plausible value.",
  "Convert income to a gross MONTHLY number. If an annual figure is given, divide by 12. If a",
  "range is given, take the lower bound. Convert relative dates ('early October', 'next month')",
  "to an ISO date using the supplied current date.",
  "Do not record anything about children, family composition, disability, religion, national",
  "origin, marital status, or source of income, even if the prospect volunteers it.",
  "Do not output any judgement, score, ranking, or recommendation.",
  "",
  "DO NOT ASK THE NEXT PRE-QUALIFICATION QUESTION. The system appends it to your reply from a",
  "fixed script. If you ask one too, the prospect gets the same question twice.",
  "",
  "Tone: warm, brief, human. This is a chat, not an email - keep reply_text under about 500",
  "characters, no greeting block, no sign-off, no subject line. Answer what they asked and stop.",
]).join("\n");

const FAQ_INSTRUCTIONS = [
  "You are a leasing assistant for a property management company, replying to a rental inquiry.",
  "",
].concat(GROUNDING_RULES).concat([
  "",
  "After answering, ask these pre-qualification questions in one short natural paragraph:",
  "intended move-in date, approximate gross monthly income, pets, number of vehicles, and how many",
  "adults will be living there. Explain that it is to check which units fit, not a decision.",
  "",
  "Tone: warm, brief, professional. Sign off as the leasing team. Do not include a subject line.",
]).join("\n");

const PREQUAL_INSTRUCTIONS = [
  "Extract pre-qualification answers from a prospect's email reply.",
  "",
  "Report ONLY what the prospect actually stated. If something was not stated, return null for it.",
  "Never infer, estimate, or fill in a plausible value.",
  "",
  "Convert income to a gross MONTHLY number. If an annual figure is given, divide by 12. If a range",
  "is given, take the lower bound.",
  "Convert relative dates ('early October', 'next month') to an ISO date using the supplied",
  "current date.",
  "",
  "Do not record anything about children, family composition, disability, religion, national origin,",
  "marital status, or source of income, even if the prospect volunteers it.",
  "Do not output any judgement, score, or recommendation.",
].join("\n");

/* ------------------------------------------------- shared code fragments */

/**
 * The conversation script, as data.
 *
 * COLLECT_ORDER is what the assistant still wants to know, in the order it
 * asks. prequalGate() only ever reports move_in_date and stated_monthly_income
 * as `missing`, because only those two gate anything - pets, vehicles and
 * occupants are collected for the file and never used to triage. Keeping the
 * ask order here rather than widening the gate preserves the gate's meaning:
 * every entry in prequal_reasons is a criterion that actually mattered.
 *
 * QUESTION_PROMPTS is fixed wording. The model never writes these.
 */
const CONVERSATION_SCRIPT = [
  "var COLLECT_ORDER = ['move_in_date', 'stated_monthly_income', 'pets', 'vehicles', 'occupants'];",
  "",
  "var QUESTION_PROMPTS = {",
  "  move_in_date: 'When are you hoping to move in?',",
  "  stated_monthly_income: 'Roughly what is your gross monthly income? This is just to check which units fit, not a decision.',",
  "  pets: 'Do you have any pets? If so, what kind and roughly what weight?',",
  "  vehicles: 'How many vehicles would need parking?',",
  "  occupants: 'How many adults would be living there?',",
  "};",
  "",
  "var TOUR_PROMPT = 'Everything looks like a fit so far. Here is the link to pick a tour time that suits you:';",
  "var ALTERNATIVES_PROMPT = 'Thanks for those details. Based on what you have told us this one may not be the closest match on timing or size, but we would still like to help - a member of the team will follow up with other options. If you would like to tour this unit anyway, just say so and we will set it up.';",
  "var HANDOFF_PROMPT = 'Let me get a member of the team to pick this up with you. They will be in touch shortly.';",
  "var MAX_TELEGRAM = 4000;",
].join("\n");

/* ------------------------------------------------------------- code bodies */

const normalizeInquiryCode = [
  LIB,
  "",
  "// Listing-site contact form. Deterministic: no model, no inference.",
  "// The lead reference is minted here so the confirmation page can carry it",
  "// into the Telegram deep link.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const body = item.json.body || item.json;",
  "  const text = (value) => (value === null || value === undefined ? '' : String(value).trim());",
  "",
  "  const unitCode = text(body.unit_code);",
  "  const name = text(body.prospect_name);",
  "  const email = text(body.prospect_email);",
  "",
  "  out.push({",
  "    json: {",
  "      ref_token: makeRefToken('R'),",
  "      unit_code: unitCode,",
  "      prospect_name: name,",
  "      prospect_email: email,",
  "      prospect_phone: text(body.prospect_phone),",
  "      inquiry_text: text(body.inquiry_text),",
  "      nonce: text(body.nonce) || ('n-' + Date.now()),",
  "      is_valid: Boolean(unitCode && name && email && email.indexOf('@') > 0),",
  "      received_at: new Date().toISOString(),",
  "    },",
  "  });",
  "}",
  "return out;",
].join("\n");

const confirmationPageCode = [
  "// The page the browser lands on after the contact form posts.",
  "// Built here, not in the Respond node's parameter, so quoting, newlines and",
  "// prospect-supplied text never reach the expression parser.",
  "const esc = (value) => String(value === null || value === undefined ? '' : value)",
  "  .split('&').join('&amp;')",
  "  .split('<').join('&lt;')",
  "  .split('>').join('&gt;')",
  "  .split('\"').join('&quot;');",
  "",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const lead = item.json;",
  "  const inquiry = $('Normalize Inquiry Form').first().json;",
  "  const unit = $('Find Unit For Inquiry').first().json;",
  "  const token = lead.ref_token || inquiry.ref_token;",
  "",
  "  // Telegram deep-link payload charset is [A-Za-z0-9_-], max 64 bytes.",
  "  // R-1234 is legal as-is, so the token goes through unchanged.",
  "  const link = 'https://t.me/__TELEGRAM_PROSPECT_BOT_USERNAME__?start=' + token;",
  "",
  "  const html = [",
  "    '<!doctype html>',",
  "    '<html lang=\"en\"><head><meta charset=\"utf-8\">',",
  "    '<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">',",
  "    '<title>Thanks - we have your message</title>',",
  "    '<link rel=\"stylesheet\" href=\"http://localhost:8080/styles.css\">',",
  "    '</head><body>',",
  "    '<div class=\"confirm\">',",
  "    '<h1>Thanks, ' + esc(inquiry.prospect_name) + '</h1>',",
  "    '<p>We have your message about ' + esc(unit.address) + '.</p>',",
  "    '<p>Your reference is <span class=\"ref\">' + esc(token) + '</span>.</p>',",
  "    '<p>Open the leasing assistant on Telegram and your question will be answered straight away. You can ask anything else about the home in the same chat.</p>',",
  "    '<p><a class=\"cta\" href=\"' + link + '\">Open the leasing assistant</a></p>',",
  "    '<p class=\"small\">Demonstration system. Synthetic data only.</p>',",
  "    '<p class=\"small\"><a href=\"http://localhost:8080/\">Back to listings</a></p>',",
  "    '</div></body></html>',",
  "  ].join('\\n');",
  "",
  "  out.push({ json: { ref_token: token, telegram_link: link, confirmation_html: html } });",
  "}",
  "return out;",
].join("\n");

const rejectPageCode = [
  "// Static 400 page. A separate Respond node rather than a computed status:",
  "// respond-to-webhook status-code expressions are unreliable.",
  "const html = [",
  "  '<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">',",
  "  '<title>We could not read that</title>',",
  "  '<link rel=\"stylesheet\" href=\"http://localhost:8080/styles.css\"></head><body>',",
  "  '<div class=\"confirm\"><h1>We could not read that</h1>',",
  "  '<p>Please go back and check your name, email and question are filled in.</p>',",
  "  '<p class=\"small\"><a href=\"http://localhost:8080/\">Back to listings</a></p>',",
  "  '</div></body></html>',",
  "].join('\\n');",
  "return [{ json: { confirmation_html: html } }];",
].join("\n");

const normalizeTelegramCode = [
  LIB,
  "",
  "// Normalises one Telegram update. No model, no identity resolution here -",
  "// this only pulls out the raw facts the deterministic binding SQL needs.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const update = item.json || {};",
  "  const message = update.message || update;",
  "  const chat = message.chat || {};",
  "  const from = message.from || {};",
  "  const text = (message.text || message.caption || '').trim();",
  "",
  "  // /start carries the lead reference from the listing site's deep link.",
  "  // extractRefToken expects brackets, so the payload is wrapped rather than",
  "  // matched with a second regex - one source of truth for the token format.",
  "  let startToken = null;",
  "  let isStart = false;",
  "  if (text.indexOf('/start') === 0) {",
  "    isStart = true;",
  "    const payload = text.slice('/start'.length).trim();",
  "    if (payload) startToken = extractRefToken('[' + payload + ']');",
  "  }",
  "",
  "  const chatId = chat.id || from.id || null;",
  "  const messageId = message.message_id || null;",
  "",
  "  out.push({",
  "    json: {",
  "      chat_id: chatId,",
  "      message_id: messageId,",
  "      // Stable per (chat, message). Telegram re-delivers an update it thinks",
  "      // was not acknowledged, and message_log.message_id is UNIQUE, so the",
  "      // insert downstream is what makes a replay a no-op.",
  "      dedupe_key: 'tg-' + chatId + '-' + messageId,",
  "      text: text,",
  "      is_start: isStart,",
  "      start_token: startToken,",
  "      username: from.username || null,",
  "      first_name: from.first_name || null,",
  "      received_at: new Date().toISOString(),",
  "    },",
  "  });",
  "}",
  "return out;",
].join("\n");

const markReplayCode = [
  "// The claim insert returns a row only the first time a message is seen.",
  "// Strict IF nodes need a real boolean, never truthiness on an id.",
  "const claimed = $input.all().filter((item) => item.json && item.json.id);",
  "const inbound = $('Normalize Telegram Message').first().json;",
  "return [{ json: Object.assign({}, inbound, { is_new_message: claimed.length > 0 }) }];",
].join("\n");

const checkBindingCode = [
  "// Did the deterministic lookup find a lead for this chat?",
  "const rows = $input.all().filter((item) => item.json && item.json.ref_token);",
  "const inbound = $('Normalize Telegram Message').first().json;",
  "if (!rows.length) {",
  "  return [{ json: Object.assign({}, inbound, { is_bound: false }) }];",
  "}",
  "return [{ json: Object.assign({}, rows[0].json, inbound, { is_bound: true, lead: rows[0].json }) }];",
].join("\n");

const buildContextCode = [
  LIB,
  "",
  "// Assembles what the model is allowed to see: the unit's own facts, the slots",
  "// already on record, and a capped transcript.",
  "const MAX_BODY = 600;",
  "const MAX_TRANSCRIPT = 4000;",
  "const HANDOFF_AFTER_TURNS = 20;",
  "",
  "const lead = $('Bind Lead Identity').first().json;",
  "const inbound = $('Normalize Telegram Message').first().json;",
  "const history = $input.all().map((item) => item.json).filter((row) => row && row.body);",
  "",
  "// Oldest first for the model, then trimmed from the oldest end until the",
  "// whole transcript fits. A hard ceiling regardless of how long the chat runs.",
  "const lines = history",
  "  .slice()",
  "  .reverse()",
  "  .map((row) => {",
  "    const who = row.direction === 'inbound' ? 'Prospect' : 'Assistant';",
  "    let body = String(row.body || '').replace(/\\s+/g, ' ').trim();",
  "    if (body.length > MAX_BODY) body = body.slice(0, MAX_BODY) + '...';",
  "    return who + ': ' + body;",
  "  });",
  "",
  "while (lines.length && lines.join('\\n').length > MAX_TRANSCRIPT) lines.shift();",
  "",
  "const unit = {",
  "  unit_code: lead.unit_code,",
  "  address: lead.address,",
  "  beds: lead.beds,",
  "  baths: lead.baths,",
  "  sqft: lead.sqft,",
  "  rent_amount: lead.rent_amount,",
  "  deposit_amount: lead.deposit_amount,",
  "  available_from: lead.available_from,",
  "  lease_term_months: lead.lease_term_months,",
  "  pet_policy: lead.pet_policy,",
  "  pet_fee_monthly: lead.pet_fee_monthly,",
  "  parking: lead.parking,",
  "  utilities_included: lead.utilities_included,",
  "  laundry: lead.laundry,",
  "  faq_facts: lead.faq_facts,",
  "};",
  "",
  "const state = lead.conversation_state || {};",
  "const turnCount = Number(state.turn_count || 0) + 1;",
  "",
  "// A /start with no other text has nothing to answer, so the question the",
  "// prospect typed on the listing site is used as the opening message. That is",
  "// what makes the answer already be waiting when the chat opens.",
  "let current = inbound.text;",
  "if (inbound.is_start) {",
  "  current = String(state.inquiry_text || '').trim() || 'Hi, I am interested in this unit.';",
  "}",
  "",
  "return [{",
  "  json: {",
  "    ref_token: lead.ref_token,",
  "    unit_knowledge: buildUnitKnowledge(unit),",
  "    unit: unit,",
  "    known_slots: {",
  "      move_in_date: lead.move_in_date,",
  "      stated_monthly_income: lead.stated_monthly_income,",
  "      pets: lead.pets,",
  "      vehicles: lead.vehicles,",
  "      occupants: lead.occupants,",
  "    },",
  "    transcript: lines.join('\\n') || '(this is the first message)',",
  "    current_message: current,",
  "    turn_count: turnCount,",
  "    force_handoff: turnCount > HANDOFF_AFTER_TURNS,",
  "  },",
  "}];",
].join("\n");

const turnGateCode = [
  LIB,
  "",
  CONVERSATION_SCRIPT,
  "",
  "// The deterministic half of a conversation turn.",
  "//",
  "// The model produced an answer and an extraction. Everything that decides",
  "// what happens next - which slot to ask for, whether a tour is offered, what",
  "// wording is used - happens here, in plain JavaScript, over the manager's",
  "// configured criteria.",
  "const context = $('Build Conversation Context').first().json;",
  "const lead = $('Bind Lead Identity').first().json;",
  "const config = $('Load Active Criteria').first().json;",
  "const inbound = $('Normalize Telegram Message').first().json;",
  "",
  "const payload = unwrapAiPayload($input.first().json, 'reply_text');",
  "const replyText = payload && typeof payload === 'object' ? String(payload.reply_text || '') : '';",
  "",
  "// One call now carries both the answer and the extraction, so a malformed",
  "// payload could blank the reply AND wipe the slots. Throw before anything is",
  "// merged rather than sending an empty message and recording empty answers.",
  "if (!replyText.trim() || !payload.prequal || typeof payload.prequal !== 'object') {",
  "  throw new Error(",
  "    'Conversation turn returned an unexpected shape. Raw keys: ' +",
  "    JSON.stringify(Object.keys($input.first().json || {})) +",
  "    ' unwrapped: ' + JSON.stringify(payload).slice(0, 400)",
  "  );",
  "}",
  "",
  "// Merge: a slot the prospect did not restate keeps the value already on",
  "// record. A null never overwrites a stated answer.",
  "const known = context.known_slots || {};",
  "const answers = {};",
  "for (const key of COLLECT_ORDER) {",
  "  const fresh = payload.prequal[key];",
  "  answers[key] = fresh === null || fresh === undefined || fresh === '' ? known[key] : fresh;",
  "  if (answers[key] === undefined) answers[key] = null;",
  "}",
  "if (answers.stated_monthly_income !== null) {",
  "  answers.stated_monthly_income = Number(answers.stated_monthly_income);",
  "}",
  "",
  "const outcome = prequalGate(answers, context.unit, config);",
  "",
  "const state = lead.conversation_state || {};",
  "const asked = Array.isArray(state.asked) ? state.asked.slice() : [];",
  "const wantsHuman = Boolean(payload.wants_human) || context.force_handoff;",
  "",
  "// What is still outstanding, in ask order, skipping anything already asked.",
  "const outstanding = COLLECT_ORDER.filter(function (key) {",
  "  return answers[key] === null || answers[key] === undefined || answers[key] === '';",
  "});",
  "const unasked = outstanding.filter(function (key) { return asked.indexOf(key) === -1; });",
  "",
  "let stage;",
  "let nextAsk = null;",
  "let appended;",
  "",
  "if (wantsHuman) {",
  "  stage = 'handoff';",
  "  appended = HANDOFF_PROMPT;",
  "} else if (outcome.result === 'not_clear') {",
  "  // Never a refusal. Pre-qualification is scheduling triage on unverified",
  "  // answers and is never phrased to the prospect as a decision.",
  "  stage = 'not_clear';",
  "  appended = ALTERNATIVES_PROMPT;",
  "} else if (unasked.length) {",
  "  stage = 'collecting';",
  "  nextAsk = unasked[0];",
  "  appended = QUESTION_PROMPTS[nextAsk];",
  "} else if (outcome.result === 'clear') {",
  "  stage = 'clear';",
  "  appended = TOUR_PROMPT + '\\n__CALCOM_BOOKING_URL__?metadata[ref_token]=' + lead.ref_token;",
  "} else if (outstanding.length) {",
  "  // Everything has been asked once and something is still missing. Ask the",
  "  // most important one again rather than looping silently.",
  "  stage = 'reasking';",
  "  nextAsk = outstanding[0];",
  "  appended = QUESTION_PROMPTS[nextAsk];",
  "} else {",
  "  stage = 'handoff';",
  "  appended = HANDOFF_PROMPT;",
  "}",
  "",
  "let finalText = replyText.trim() + '\\n\\n' + appended;",
  "if (finalText.length > MAX_TELEGRAM) finalText = finalText.slice(0, MAX_TELEGRAM);",
  "",
  "if (nextAsk && asked.indexOf(nextAsk) === -1) asked.push(nextAsk);",
  "",
  "const nextState = {",
  "  inquiry_text: state.inquiry_text || null,",
  "  asked: asked,",
  "  last_intent: payload.intent || null,",
  "  reask_count: stage === 'reasking' ? Number(state.reask_count || 0) + 1 : Number(state.reask_count || 0),",
  "  turn_count: context.turn_count,",
  "  wants_human: wantsHuman,",
  "};",
  "",
  "// Mirror at PHASE BOUNDARIES ONLY. Airtable Free allows 1000 API calls a",
  "// month per workspace, and a chat is many turns - mirroring every turn would",
  "// burn the quota and stack duplicate-looking writes on the board. This mirrors",
  "// the same status transition the UPDATE below applies, so the two cannot",
  "// disagree about what phase the lead is in.",
  "let nextStatus = lead.status;",
  "if (outcome.result === 'clear' && (lead.status === 'new' || lead.status === 'engaged')) {",
  "  nextStatus = 'prequalified';",
  "} else if (lead.status === 'new') {",
  "  nextStatus = 'engaged';",
  "}",
  "const phaseChanged = nextStatus !== lead.status;",
  "",
  "const STATUS_LABELS = {",
  "  new: 'New',",
  "  engaged: 'Engaged',",
  "  prequalified: 'Prequalified',",
  "  tour_booked: 'Tour Booked',",
  "  toured: 'Toured',",
  "  applied: 'Applied',",
  "};",
  "",
  "return [{",
  "  json: {",
  "    ref_token: lead.ref_token,",
  "    telegram_chat_id: lead.telegram_chat_id || inbound.chat_id,",
  "    prospect_name: lead.prospect_name,",
  "    prospect_email: lead.prospect_email,",
  "    unit_code: context.unit.unit_code,",
  "    address: context.unit.address,",
  "    answers: answers,",
  "    prequal_result: outcome.result,",
  "    prequal_reasons: outcome.reasons,",
  "    prequal_missing: outcome.missing,",
  "    stage: stage,",
  "    next_ask: nextAsk,",
  "    intent: payload.intent || null,",
  "    wants_human: wantsHuman,",
  "    questions_answered: payload.questions_answered || [],",
  "    questions_unanswered: payload.questions_unanswered || [],",
  "    refused_questions: payload.refused_questions || [],",
  "    reply_text: finalText,",
  "    conversation_state: nextState,",
  "    needs_manager: stage === 'not_clear' || wantsHuman,",
  "    phase_changed: phaseChanged,",
  "    next_status: nextStatus,",
  "    next_status_label: STATUS_LABELS[nextStatus] || 'Engaged',",
  "  },",
  "}];",
].join("\n");

const telegramGuardrailCode = [
  LIB,
  "",
  "// Tier A guardrail, run on the COMPOSED text - the model's answer plus the",
  "// fixed question or booking link the system appended. Whatever is about to",
  "// leave is what gets checked, never an earlier draft.",
  "const turn = $input.first().json;",
  "const context = $('Build Conversation Context').first().json;",
  "",
  "// The allowlist is unit facts PLUS what the prospect themselves stated.",
  "// Confirming a figure someone just gave you is not an invented figure, and",
  "// without this every 'got it, $5,000 a month' reply is blocked and the",
  "// conversation stalls in silence on the most ordinary turn there is.",
  "const knowledge = buildConversationKnowledge(context.unit, turn.answers);",
  "const verdict = guardrailCheck(turn.reply_text, knowledge);",
  "",
  "// The guardrail and the message_log see the real text. Only the copy that",
  "// goes to Telegram is escaped, because that one is parsed for HTML entities.",
  "return [{ json: Object.assign({}, turn, {",
  "  guardrail_passed: verdict.passed,",
  "  guardrail_result: verdict,",
  "  reply_html: escapeTelegramHtml(turn.reply_text),",
  "  findings_text: escapeTelegramHtml(JSON.stringify(verdict.findings)),",
  "  reasons_text: escapeTelegramHtml(JSON.stringify(turn.prequal_reasons)),",
  "}) }];",
].join("\n");

const classifyCode = [
  LIB,
  "",
  "// Splits inbound mail into new leads and replies to an existing lead.",
  "// Matching is deterministic: reference token first, sender address never guessed.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const mail = item.json;",
  "  const subject = mail.subject || '';",
  "  const body = mail.textPlain || mail.text || mail.textHtml || '';",
  "  const from = mail.from || '';",
  "  const replyTo = mail.replyTo || mail['reply-to'] || from;",
  "  const messageId = mail.messageId || mail['message-id'] || null;",
  "",
  "  const token = extractRefToken(subject);",
  "  const base = {",
  "    is_reply: Boolean(token),",
  "    ref_token: token,",
  "    message_id: messageId,",
  "    subject: subject,",
  "    body_text: body,",
  "    from_addr: from,",
  "    reply_to: replyTo,",
  "    received_at: new Date().toISOString(),",
  "  };",
  "",
  "  if (token) {",
  "    out.push({ json: base });",
  "  } else {",
  "    const parsed = parseLeadEmail({ subject: subject, body: body, replyTo: replyTo });",
  "    out.push({ json: Object.assign({}, base, parsed, { new_ref_token: makeRefToken('R') }) });",
  "  }",
  "}",
  "return out;",
].join("\n");

const guardrailCode = [
  LIB,
  "",
  "// Tier A guardrail. Runs before the reply leaves, and again at send time in",
  "// later stages, because wording can be edited after it is drafted.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const payload = unwrapAiPayload(item.json, 'reply_text');",
  "  const draft = payload && typeof payload === 'object' ? (payload.reply_text || '') : '';",
  "",
  "  // An empty draft means the model call did not produce what the schema",
  "  // promised. Sending a blank email instead would be a silent failure.",
  "  if (!draft.trim()) {",
  "    throw new Error(",
  "      'Draft reply was empty. Raw keys: ' +",
  "      JSON.stringify(Object.keys(item.json || {})) +",
  "      ' unwrapped: ' + JSON.stringify(payload).slice(0, 400)",
  "    );",
  "  }",
  "",
  "  const lead = $('Create Lead Record').first().json;",
  "  const unit = $('Find Unit For Email Inquiry').first().json;",
  "  const knowledge = buildUnitKnowledge(unit);",
  "  const verdict = guardrailCheck(draft, knowledge);",
  "",
  "  out.push({",
  "    json: {",
  "      ref_token: lead.ref_token,",
  "      lead_id: lead.id,",
  "      prospect_email: lead.prospect_email,",
  "      prospect_name: lead.prospect_name,",
  "      unit_code: unit.unit_code,",
  "      reply_text: draft,",
  "      questions_answered: payload.questions_answered || [],",
  "      questions_unanswered: payload.questions_unanswered || [],",
  "      refused_questions: payload.refused_questions || [],",
  "      guardrail_passed: verdict.passed,",
  "      guardrail_result: verdict,",
  "      findings_text: escapeTelegramHtml(JSON.stringify(verdict.findings)),",
  "      subject_line: subjectWithToken('Re: ' + unit.address, lead.ref_token),",
  "    },",
  "  });",
  "}",
  "return out;",
].join("\n");

const prequalCode = [
  LIB,
  "",
  "// Deterministic scheduling triage. NOT a rental decision and never phrased to",
  "// the prospect as one.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const answers = unwrapAiPayload(item.json, 'move_in_date');",
  "",
  "  // A payload with none of the expected keys means the model call did not",
  "  // return what the schema promised. Recording that as 'incomplete' would",
  "  // hide a real failure behind a legitimate-looking outcome.",
  "  if (!answers || typeof answers !== 'object' || !('move_in_date' in answers)) {",
  "    throw new Error(",
  "      'Prequal extraction returned an unexpected shape. Raw keys: ' +",
  "      JSON.stringify(Object.keys(item.json || {})) +",
  "      ' unwrapped: ' + JSON.stringify(answers).slice(0, 300)",
  "    );",
  "  }",
  "",
  "  const lead = $('Load Lead By Token').first().json;",
  "  const config = $('Load Active Criteria').first().json;",
  "  const unit = {",
  "    unit_code: lead.unit_code,",
  "    address: lead.address,",
  "    rent_amount: lead.rent_amount,",
  "    available_from: lead.available_from,",
  "  };",
  "",
  "  const outcome = prequalGate(answers, unit, config);",
  "",
  "  out.push({",
  "    json: {",
  "      lead_id: lead.id,",
  "      ref_token: lead.ref_token,",
  "      prospect_email: lead.prospect_email,",
  "      prospect_name: lead.prospect_name,",
  "      unit_code: unit.unit_code,",
  "      address: unit.address,",
  "      answers: answers,",
  "      prequal_result: outcome.result,",
  "      prequal_reasons: outcome.reasons,",
  "      prequal_missing: outcome.missing,",
  "      reasons_text: escapeTelegramHtml(JSON.stringify(outcome.reasons)),",
  "      is_clear: outcome.result === 'clear',",
  "      subject_line: subjectWithToken('Re: ' + unit.address, lead.ref_token),",
  "    },",
  "  });",
  "}",
  "return out;",
].join("\n");

const lockCodeCode = [
  LIB,
  "",
  "// Self-guided tour entry code. MOCK - a real deployment issues this through a",
  "// smart-lock platform bound to the booking window.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const payload = item.json.body || item.json;",
  "  const booking = payload.payload || payload;",
  "  const attendee = (booking.attendees && booking.attendees[0]) || {};",
  "  const lock = generateLockCode();",
  "",
  "  out.push({",
  "    json: {",
  "      booking_uid: booking.uid || booking.bookingId || null,",
  "      starts_at: booking.startTime || booking.start_time || null,",
  "      attendee_email: attendee.email || null,",
  "      attendee_name: attendee.name || null,",
  "      ref_token: extractRefToken(booking.title || '') ||",
  "                 extractRefToken((booking.description || '')) ||",
  "                 (booking.metadata && booking.metadata.ref_token) || null,",
  "      lock_code: lock.code,",
  "      lock_code_source: lock.source,",
  "    },",
  "  });",
  "}",
  "return out;",
].join("\n");

/**
 * Whether a lead is reachable on Telegram. Used by the tour and application-link
 * branches to pick a channel: a lead that came in through the listing site is
 * answered on Telegram, one that came in by email is answered by email.
 */
function deliveryChannelCode(kind) {
  var body =
    kind === "tour"
      ? [
          "  const text = 'Your self-guided tour of ' + lead.address + ' is confirmed.' +",
          "    '\\n\\nEntry code: ' + lead.lock_code +",
          "    '\\n\\nThe code works during your booked slot only. Let yourself in, take your ' +",
          "    'time, and pull the door closed when you leave.';",
        ]
      : [
          "  const text = 'Hope the tour of ' + lead.address + ' went well. If you would like ' +",
          "    'to apply, here is the application:\\n\\n' +",
          "    '__APPLICATION_FORM_URL__?ref_token=' + lead.ref_token +",
          "    '\\n\\nThere is no obligation - applying just puts you forward for consideration. ' +",
          "    'If it was not the right fit, tell me what did not work and we will look for ' +",
          "    'something closer.';",
        ];

  return [
    LIB,
    "",
    "// Picks the channel and composes the message.",
    "//",
    "// Composed here rather than in the Telegram node's own parameter so the text",
    "// can be escaped for HTML parse mode. The application link carries",
    "// ?ref_token=, and an unescaped underscore opens a Markdown entity that never",
    "// closes - Telegram rejects the whole message and the node reports only",
    "// 'Bad request - please check your parameters'.",
    "const out = [];",
    "for (const item of $input.all()) {",
    "  const lead = item.json;",
  ]
    .concat(body)
    .concat([
      "  out.push({ json: Object.assign({}, lead, {",
      "    on_telegram: Boolean(lead.telegram_chat_id),",
      "    message_text: text,",
      "    message_html: escapeTelegramHtml(text),",
      "  }) });",
      "}",
      "return out;",
    ])
    .join("\n");
}

/* ------------------------------------------------------------------ nodes */

const nodes = [
  /* ---- entry 1: listing-site contact form ------------------------------ */
  wf.webhookNode("Receive Listing Inquiry (Web)", "listing-inquiry", [-780, -1180], {
    responseMode: "responseNode",
  }),

  wf.codeNode("Normalize Inquiry Form", normalizeInquiryCode, [-560, -1180]),

  wf.ifNode(
    "Inquiry Fields Valid?",
    [wf.booleanCondition("={{ $json.is_valid }}", true)],
    [-340, -1180]
  ),

  wf.postgresNode(
    "Find Unit For Inquiry",
    // Exact match: the form posts the unit code from the page the prospect was
    // reading, so there is nothing to guess at.
    "SELECT * FROM units WHERE unit_code = $1 LIMIT 1;",
    [-120, -1280],
    { queryOptions: { queryReplacement: "={{ [$json.unit_code] }}" }, alwaysOutputData: true }
  ),

  // Idempotent. A resubmit - browser back, double-click, a replayed webhook -
  // returns the SAME ref_token, so the deep link stays stable and no second
  // lead appears on the board.
  wf.postgresNode(
    "Create Lead From Inquiry",
    "WITH existing AS (\n" +
      "  SELECT * FROM leads\n" +
      "   WHERE prospect_email = $4\n" +
      "     AND unit_id = (SELECT id FROM units WHERE unit_code = $2)\n" +
      "     AND status IN ('new','engaged','prequalified','tour_booked')\n" +
      "   ORDER BY id DESC LIMIT 1\n" +
      "), created AS (\n" +
      "  INSERT INTO leads (ref_token, unit_id, source, prospect_name, prospect_email,\n" +
      "                     prospect_phone, status, conversation_state)\n" +
      "  SELECT $1, (SELECT id FROM units WHERE unit_code = $2), 'listing_site', $3, $4,\n" +
      "         NULLIF($5::text,''), 'new',\n" +
      "         jsonb_build_object('inquiry_text', $6::text, 'asked', '[]'::jsonb, 'turn_count', 0)\n" +
      "   WHERE NOT EXISTS (SELECT 1 FROM existing)\n" +
      "  RETURNING *\n" +
      ")\n" +
      "SELECT * FROM created UNION ALL SELECT * FROM existing LIMIT 1;",
    [100, -1280],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$('Normalize Inquiry Form').item.json.ref_token," +
          "$('Normalize Inquiry Form').item.json.unit_code," +
          "$('Normalize Inquiry Form').item.json.prospect_name," +
          "$('Normalize Inquiry Form').item.json.prospect_email," +
          "($('Normalize Inquiry Form').item.json.prospect_phone ?? '')," +
          "($('Normalize Inquiry Form').item.json.inquiry_text ?? '')" +
          "] }}",
      },
    }
  ),

  wf.postgresNode(
    "Log Inbound Inquiry",
    "INSERT INTO message_log (ref_token, direction, channel, from_addr, body, message_id)\n" +
      "VALUES ($1, 'inbound', 'web_form', $2, $3, $4)\n" +
      "ON CONFLICT (message_id) DO NOTHING;",
    [320, -1280],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$json.ref_token," +
          "($('Normalize Inquiry Form').item.json.prospect_email ?? '')," +
          "($('Normalize Inquiry Form').item.json.inquiry_text ?? '')," +
          "'web-' + $('Normalize Inquiry Form').item.json.nonce" +
          "] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Build Confirmation Page", confirmationPageCode, [540, -1280]),

  wf.respondHtmlNode(
    "Respond With Confirmation Page",
    { bodyExpression: "={{ $json.confirmation_html }}", statusCode: 200 },
    [760, -1280]
  ),

  wf.airtableMirrorNode(
    "Mirror New Lead To Airtable",
    {
      tableName: "Leads",
      upsertOn: "Ref Token",
      bodyExpression:
        "={{ JSON.stringify({\n" +
        "  performUpsert: { fieldsToMergeOn: ['Ref Token'] },\n" +
        "  typecast: true,\n" +
        "  records: [{ fields: {\n" +
        "    'Ref Token': $('Create Lead From Inquiry').item.json.ref_token,\n" +
        "    'Prospect': $('Normalize Inquiry Form').item.json.prospect_name,\n" +
        "    'Email': $('Normalize Inquiry Form').item.json.prospect_email,\n" +
        "    'Unit': $('Normalize Inquiry Form').item.json.unit_code,\n" +
        "    'Status': 'New'\n" +
        "  } }]\n" +
        "}) }}",
    },
    [980, -1280]
  ),

  wf.codeNode("Build Rejection Page", rejectPageCode, [-120, -1080]),

  wf.respondHtmlNode(
    "Respond: Inquiry Not Accepted",
    { bodyExpression: "={{ $json.confirmation_html }}", statusCode: 400 },
    [100, -1080]
  ),

  /* ---- entry 2: the Telegram conversation ------------------------------ */
  // The PROSPECT bot. WF3's manager router owns the other one. Two bots because
  // Telegram allows one webhook per bot.
  wf.telegramTriggerNode("Prospect Messages (Telegram)", [-780, -700], {
    bot: "prospect",
    updates: ["message"],
    webhookId: "leasing-prospect-bot",
  }),

  wf.codeNode("Normalize Telegram Message", normalizeTelegramCode, [-560, -700]),

  // Claims the message. message_log.message_id is UNIQUE, so a re-delivered
  // update inserts nothing and returns nothing - which is what stops a second
  // reply going out.
  wf.postgresNode(
    "Claim Message (Dedupe)",
    "INSERT INTO message_log (direction, channel, from_addr, body, message_id)\n" +
      "VALUES ('inbound', 'telegram', $1, $2, $3)\n" +
      "ON CONFLICT (message_id) DO NOTHING\n" +
      "RETURNING id;",
    [-340, -700],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "String($json.username ?? $json.chat_id ?? '')," +
          "($json.text ?? '')," +
          "$json.dedupe_key" +
          "] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Mark Replay Or New", markReplayCode, [-120, -700]),

  wf.ifNode(
    "Is New Message?",
    [wf.booleanCondition("={{ $json.is_new_message }}", true)],
    [100, -700]
  ),

  // Deterministic identity. /start R-xxxx binds the chat to that lead; every
  // later message resolves by chat_id. NULLIF($n::text,'') with the explicit
  // ::text cast - without it Postgres infers bigint from context and the empty
  // string fails before NULLIF ever runs.
  wf.postgresNode(
    "Bind Lead Identity",
    "WITH bound AS (\n" +
      "  UPDATE leads\n" +
      "     SET telegram_chat_id = $2::bigint,\n" +
      "         telegram_username = NULLIF($3::text,'')\n" +
      "   WHERE ref_token = NULLIF($1::text,'')\n" +
      "   RETURNING id\n" +
      ")\n" +
      "SELECT l.*, u.unit_code, u.address, u.beds, u.baths, u.sqft, u.rent_amount,\n" +
      "       u.deposit_amount, u.available_from, u.lease_term_months, u.pet_policy,\n" +
      "       u.pet_fee_monthly, u.parking, u.utilities_included, u.laundry, u.faq_facts\n" +
      "  FROM leads l JOIN units u ON u.id = l.unit_id\n" +
      " WHERE (NULLIF($1::text,'') IS NOT NULL AND l.ref_token = $1)\n" +
      "    OR (NULLIF($1::text,'') IS NULL AND l.telegram_chat_id = $2::bigint)\n" +
      " ORDER BY l.id DESC LIMIT 1;",
    [320, -700],
    {
      queryOptions: {
        queryReplacement:
          "={{ [($json.start_token ?? ''), $json.chat_id, ($json.username ?? '')] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Check Identity Binding", checkBindingCode, [540, -700]),

  wf.ifNode(
    "Lead Identified?",
    [wf.booleanCondition("={{ $json.is_bound }}", true)],
    [760, -700]
  ),

  // No lead for this chat, and none is invented. The model is never asked to
  // work out who someone is.
  wf.telegramNode(
    "Send: Start From A Listing",
    {
      bot: "prospect",
      chatId: "={{ $json.chat_id }}",
      text:
        "=I do not have a listing attached to this chat yet. Open the unit you are " +
        "interested in on our site and use the contact form there, and I will pick up " +
        "the conversation here with your question already answered.",
    },
    [980, -520]
  ),

  wf.postgresNode(
    "Load Active Criteria",
    "SELECT * FROM criteria_config WHERE is_active ORDER BY id DESC LIMIT 1;",
    [980, -820]
  ),

  // Backfills the ref token onto the message just claimed (it was inserted
  // before the lead was known) and returns the recent history in one round trip.
  wf.postgresNode(
    "Load Recent Messages",
    "WITH tagged AS (\n" +
      "  UPDATE message_log SET ref_token = $1\n" +
      "   WHERE message_id = $2 AND ref_token IS NULL\n" +
      "   RETURNING id\n" +
      ")\n" +
      "SELECT direction, body, created_at\n" +
      "  FROM message_log\n" +
      " WHERE ref_token = $1 AND channel = 'telegram' AND message_id <> $2\n" +
      " ORDER BY id DESC\n" +
      " LIMIT 12;",
    [1200, -820],
    {
      queryOptions: {
        queryReplacement:
          "={{ [$('Bind Lead Identity').item.json.ref_token, " +
          "$('Normalize Telegram Message').item.json.dedupe_key] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Build Conversation Context", buildContextCode, [1420, -820]),

  // Pure polish, and worth it: the model call takes a few seconds and a silent
  // chat looks broken on camera. Fire-and-forget.
  {
    ...wf.plaidNode("Show Typing", "/noop", "={{ '{}' }}", [1640, -820]),
    name: "Show Typing",
    id: "show-typing",
    parameters: {
      method: "POST",
      url: "=https://api.telegram.org/bot__TELEGRAM_PROSPECT_BOT_TOKEN__/sendChatAction",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody:
        "={{ JSON.stringify({ chat_id: $('Normalize Telegram Message').item.json.chat_id, action: 'typing' }) }}",
      options: { timeout: 10000 },
    },
    credentials: undefined,
    onError: "continueRegularOutput",
  },

  wf.openAiNode(
    "Answer, Extract And Classify",
    {
      instructions: TURN_INSTRUCTIONS,
      schemaName: "leasing_turn",
      schema: TURN_SCHEMA,
      maxTokens: 900,
      content:
        "=Current date: {{ $now.format('yyyy-MM-dd') }}\n\n" +
        "UNIT FACTS (the only facts you may use):\n" +
        "{{ JSON.stringify($('Build Conversation Context').item.json.unit_knowledge) }}\n\n" +
        "ALREADY ON RECORD (do not re-extract unless the prospect corrects it):\n" +
        "{{ JSON.stringify($('Build Conversation Context').item.json.known_slots) }}\n\n" +
        "CONVERSATION SO FAR:\n" +
        "{{ $('Build Conversation Context').item.json.transcript }}\n\n" +
        "THEIR NEW MESSAGE:\n" +
        "{{ JSON.stringify($('Build Conversation Context').item.json.current_message) }}",
    },
    [1860, -820]
  ),

  wf.codeNode("Merge Slots And Run Prequal Gate", turnGateCode, [2080, -820]),

  wf.codeNode("Check Guardrails (Telegram)", telegramGuardrailCode, [2300, -820]),

  wf.postgresNode(
    "Update Lead From Conversation",
    // The status CASE is the re-ingest invariant: a later chat turn can never
    // pull a lead that already booked a tour back to 'engaged'.
    "UPDATE leads SET\n" +
      "  move_in_date = COALESCE(NULLIF($2::text,'')::date, move_in_date),\n" +
      "  stated_monthly_income = COALESCE(NULLIF($3::text,'')::numeric, stated_monthly_income),\n" +
      "  pets = COALESCE(NULLIF($4::text,''), pets),\n" +
      "  vehicles = COALESCE(NULLIF($5::text,'')::int, vehicles),\n" +
      "  occupants = COALESCE(NULLIF($6::text,'')::int, occupants),\n" +
      "  prequal_result = $7,\n" +
      "  prequal_reasons = $8::jsonb,\n" +
      "  conversation_state = $9::jsonb,\n" +
      "  last_prospect_message_at = now(),\n" +
      "  status = CASE\n" +
      "             WHEN $7 = 'clear' AND status IN ('new','engaged') THEN 'prequalified'\n" +
      "             WHEN status = 'new' THEN 'engaged'\n" +
      "             ELSE status\n" +
      "           END\n" +
      "WHERE ref_token = $1\n" +
      "RETURNING *;",
    [2520, -820],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$json.ref_token," +
          "($json.answers.move_in_date ?? '')," +
          "($json.answers.stated_monthly_income ?? '')," +
          "($json.answers.pets ?? '')," +
          "($json.answers.vehicles ?? '')," +
          "($json.answers.occupants ?? '')," +
          "$json.prequal_result," +
          "JSON.stringify($json.prequal_reasons)," +
          "JSON.stringify($json.conversation_state)" +
          "] }}",
      },
    }
  ),

  wf.ifNode(
    "Reply Passed Guardrails?",
    [wf.booleanCondition("={{ $('Check Guardrails (Telegram)').item.json.guardrail_passed }}", true)],
    [2740, -820]
  ),

  wf.telegramNode(
    "Send Prospect Reply (Telegram)",
    {
      bot: "prospect",
      // Prospect-facing: a failed send must not be logged as delivered.
      failOnError: true,
      chatId: "={{ $('Check Guardrails (Telegram)').item.json.telegram_chat_id }}",
      text: "={{ $('Check Guardrails (Telegram)').item.json.reply_html }}",
    },
    [2960, -920]
  ),

  wf.postgresNode(
    "Log Outbound Telegram Reply",
    "INSERT INTO message_log\n" +
      "  (ref_token, direction, channel, tier, from_addr, to_addr, body,\n" +
      "   message_id, guardrail_passed, guardrail_result)\n" +
      "VALUES ($1, 'outbound', 'telegram', 'A', 'leasing-assistant', $2, $3, $4, TRUE, $5::jsonb);",
    [3180, -920],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$('Check Guardrails (Telegram)').item.json.ref_token," +
          "String($('Check Guardrails (Telegram)').item.json.telegram_chat_id)," +
          "$('Check Guardrails (Telegram)').item.json.reply_text," +
          "'tgout-' + $('Check Guardrails (Telegram)').item.json.ref_token + '-' + Date.now()," +
          "JSON.stringify($('Check Guardrails (Telegram)').item.json.guardrail_result)" +
          "] }}",
      },
    }
  ),

  wf.ifNode(
    "Needs Manager Notice?",
    [wf.booleanCondition("={{ $('Check Guardrails (Telegram)').item.json.needs_manager }}", true)],
    [3400, -920]
  ),

  wf.telegramNode(
    "Notify Manager: Prequal Needs Review",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Pre-qualification did not clear for {{ $('Check Guardrails (Telegram)').item.json.ref_token }} " +
        "({{ $('Check Guardrails (Telegram)').item.json.prospect_name }}).\n\n" +
        "Unit: {{ $('Check Guardrails (Telegram)').item.json.unit_code }}\n" +
        "Result: {{ $('Check Guardrails (Telegram)').item.json.prequal_result }}\n" +
        "Reasons: {{ $('Check Guardrails (Telegram)').item.json.reasons_text }}\n\n" +
        "This is scheduling triage on unverified answers, not a rental decision. " +
        "They were offered alternatives, not a refusal.",
    },
    [3620, -1020]
  ),

  wf.ifNode(
    "Phase Changed?",
    [wf.booleanCondition("={{ $('Check Guardrails (Telegram)').item.json.phase_changed }}", true)],
    [3620, -820]
  ),

  wf.airtableMirrorNode(
    "Mirror Lead To Airtable (Phase)",
    {
      tableName: "Leads",
      upsertOn: "Ref Token",
      bodyExpression:
        "={{ JSON.stringify({\n" +
        "  performUpsert: { fieldsToMergeOn: ['Ref Token'] },\n" +
        "  typecast: true,\n" +
        "  records: [{ fields: {\n" +
        "    'Ref Token': $('Check Guardrails (Telegram)').item.json.ref_token,\n" +
        "    'Prospect': $('Check Guardrails (Telegram)').item.json.prospect_name,\n" +
        "    'Unit': $('Check Guardrails (Telegram)').item.json.unit_code,\n" +
        "    'Status': $('Check Guardrails (Telegram)').item.json.next_status_label\n" +
        "  } }]\n" +
        "}) }}",
    },
    [3840, -820]
  ),

  // Guardrail failed: nothing goes to the renter, and the manager is told on
  // the MANAGER bot.
  wf.telegramNode(
    "Alert Manager: Reply Blocked",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Guardrail blocked an automated reply.\n\n" +
        "Lead: {{ $('Check Guardrails (Telegram)').item.json.ref_token }} " +
        "({{ $('Check Guardrails (Telegram)').item.json.prospect_name }})\n" +
        "Unit: {{ $('Check Guardrails (Telegram)').item.json.unit_code }}\n\n" +
        "Findings: {{ $('Check Guardrails (Telegram)').item.json.findings_text }}\n\n" +
        "Nothing was sent. This one needs a human.",
    },
    [2960, -680]
  ),

  /* ---- entry 3: Cal.com booking ---------------------------------------- */
  wf.webhookNode("Receive Tour Booking (Cal.com)", "calcom-booking", [-780, 120]),

  wf.codeNode("Issue Lock Code (MOCK)", lockCodeCode, [-560, 120]),

  wf.postgresNode(
    "Record Tour Booking",
    "UPDATE leads SET\n" +
      "  calcom_booking_uid = NULLIF($2::text,''),\n" +
      "  tour_starts_at = NULLIF($3::text,'')::timestamptz,\n" +
      "  lock_code = $4,\n" +
      "  lock_code_source = 'mock',\n" +
      "  status = 'tour_booked'\n" +
      "WHERE ref_token = $1\n" +
      "RETURNING *, (SELECT address FROM units WHERE id = leads.unit_id) AS address;",
    [-340, 120],
    {
      queryOptions: {
        queryReplacement:
          "={{ [($json.ref_token ?? ''), ($json.booking_uid ?? ''), " +
          "($json.starts_at ?? ''), ($json.lock_code ?? '')] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Tour: Pick Delivery Channel", deliveryChannelCode("tour"), [-120, 120]),

  wf.ifNode(
    "Tour: On Telegram?",
    [wf.booleanCondition("={{ $json.on_telegram }}", true)],
    [100, 120]
  ),

  wf.telegramNode(
    "Send Tour Confirmation (Telegram)",
    {
      bot: "prospect",
      // Prospect-facing: a failed send must not be logged as delivered.
      failOnError: true,
      chatId: "={{ $json.telegram_chat_id }}",
      text: "={{ $json.message_html }}",
    },
    [340, 20]
  ),

  wf.emailSendNode(
    "Send Tour Confirmation (Email)",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $json.prospect_email }}",
      subject: "=Your tour is booked [{{ $json.ref_token }}]",
      text:
        "=Hi {{ $json.prospect_name }},\n\n" +
        "Your self-guided tour of {{ $json.address }} is confirmed.\n\n" +
        "Entry code: {{ $json.lock_code }}\n\n" +
        "The code works during your booked slot only. Let yourself in, take your time, " +
        "and pull the door closed when you leave.\n\n" +
        "The leasing team",
    },
    [340, 220]
  ),

  /* ---- entry 4: tour completed (demo helper) --------------------------- */
  wf.webhookNode("Receive Tour Completed (Demo)", "tour-completed", [-780, 420]),

  wf.postgresNode(
    "Mark Lead Toured",
    "UPDATE leads SET status = 'toured'\n" +
      "WHERE ref_token = $1\n" +
      "RETURNING *, (SELECT address FROM units WHERE id = leads.unit_id) AS address;",
    [-560, 420],
    {
      queryOptions: { queryReplacement: "={{ [($json.body?.ref_token || $json.query?.ref_token || '')] }}" },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Application: Pick Delivery Channel", deliveryChannelCode("application"), [-340, 420]),

  wf.ifNode(
    "Application: On Telegram?",
    [wf.booleanCondition("={{ $json.on_telegram }}", true)],
    [-120, 420]
  ),

  wf.telegramNode(
    "Send Application Link (Telegram)",
    {
      bot: "prospect",
      // Prospect-facing: a failed send must not be logged as delivered.
      failOnError: true,
      chatId: "={{ $json.telegram_chat_id }}",
      text: "={{ $json.message_html }}",
    },
    [100, 320]
  ),

  wf.emailSendNode(
    "Send Application Link (Email)",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $json.prospect_email }}",
      subject: "=How was {{ $json.address }}? [{{ $json.ref_token }}]",
      text:
        "=Hi {{ $json.prospect_name }},\n\n" +
        "Hope the tour went well. If you would like to apply, here is the application:\n\n" +
        "__APPLICATION_FORM_URL__?ref_token={{ $json.ref_token }}\n\n" +
        "There is no obligation - applying just puts you forward for consideration. " +
        "If it was not the right fit, reply and tell us what did not work and we will " +
        "look for something closer.\n\n" +
        "The leasing team",
    },
    [100, 520]
  ),

  /* ---- entry 5: the email path, kept -----------------------------------
   * The original Zillow-format lead path. The listing site is the demo's front
   * door now, but real leads genuinely do arrive as email from syndication
   * sites, so this stays: it works, it costs nothing to keep, and it is a
   * talking point.
   */
  wf.imapTriggerNode("Receive Prospect Mail (IMAP)", [-780, 760], {
    // Restricted to the demo prospect address so unrelated mail in the same
    // inbox is never processed as a rental lead.
    customRules: '["UNSEEN", ["FROM", "__PROSPECT_EMAIL__"]]',
  }),

  wf.codeNode("Classify Inbound Mail", classifyCode, [-560, 760]),

  wf.ifNode(
    "Is Reply To Existing Lead?",
    [wf.booleanCondition("={{ $json.is_reply }}", true)],
    [-340, 760]
  ),

  wf.postgresNode(
    "Find Unit For Email Inquiry",
    "SELECT * FROM units\n" +
      "WHERE status = 'available'\n" +
      "  AND (position(unit_code in $1) > 0 OR position(split_part(address, ',', 2) in $1) > 0)\n" +
      "ORDER BY id LIMIT 1;",
    [-120, 920],
    { queryOptions: { queryReplacement: "={{ [$json.unit_hint || ''] }}" }, alwaysOutputData: true }
  ),

  wf.postgresNode(
    "Create Lead Record",
    "INSERT INTO leads (ref_token, unit_id, source, prospect_name, prospect_email, prospect_phone, status)\n" +
      "VALUES ($1, (SELECT id FROM units WHERE unit_code = $2), 'zillow_email', $3, $4, NULLIF($5::text,''), 'engaged')\n" +
      "ON CONFLICT (ref_token) DO UPDATE SET status = leads.status\n" +
      "RETURNING *;",
    [100, 920],
    {
      queryOptions: {
        // Array expression, not a comma-separated string: a null value would
        // otherwise shorten the list and a comma inside an address would split it.
        queryReplacement:
          "={{ [" +
          "$('Classify Inbound Mail').item.json.new_ref_token," +
          "$json.unit_code," +
          "$('Classify Inbound Mail').item.json.prospect_name," +
          "$('Classify Inbound Mail').item.json.prospect_email," +
          "($('Classify Inbound Mail').item.json.prospect_phone ?? '')" +
          "] }}",
      },
    }
  ),

  wf.openAiNode(
    "Draft Grounded Reply",
    {
      instructions: FAQ_INSTRUCTIONS,
      schemaName: "leasing_reply",
      schema: REPLY_SCHEMA,
      maxTokens: 900,
      content:
        "=Prospect name: {{ $('Classify Inbound Mail').item.json.prospect_name }}\n" +
        "Their message: {{ JSON.stringify($('Classify Inbound Mail').item.json.inquiry_text) }}\n\n" +
        "UNIT FACTS (the only facts you may use):\n" +
        "{{ JSON.stringify($('Find Unit For Email Inquiry').item.json) }}",
    },
    [320, 920]
  ),

  wf.codeNode("Check Tier A Guardrails", guardrailCode, [540, 920]),

  wf.ifNode(
    "Email Reply Passed Guardrails?",
    [wf.booleanCondition("={{ $json.guardrail_passed }}", true)],
    [760, 920]
  ),

  wf.emailSendNode(
    "Send Grounded Reply",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $json.prospect_email }}",
      subject: "={{ $json.subject_line }}",
      text: "={{ $json.reply_text }}",
    },
    [980, 820]
  ),

  wf.postgresNode(
    "Log Outbound Reply",
    "INSERT INTO message_log\n" +
      "  (ref_token, direction, channel, tier, from_addr, to_addr, subject, body,\n" +
      "   message_id, guardrail_passed, guardrail_result)\n" +
      "VALUES ($1, 'outbound', 'email', 'A', $2, $3, $4, $5, $6, TRUE, $7::jsonb);",
    [1200, 820],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$('Check Tier A Guardrails').item.json.ref_token," +
          "'__SYSTEM_EMAIL__'," +
          "$('Check Tier A Guardrails').item.json.prospect_email," +
          "$('Check Tier A Guardrails').item.json.subject_line," +
          "$('Check Tier A Guardrails').item.json.reply_text," +
          "'out-' + $('Check Tier A Guardrails').item.json.ref_token + '-' + Date.now()," +
          "JSON.stringify($('Check Tier A Guardrails').item.json.guardrail_result)" +
          "] }}",
      },
    }
  ),

  wf.airtableMirrorNode(
    "Mirror Email Lead To Airtable",
    {
      tableName: "Leads",
      upsertOn: "Ref Token",
      bodyExpression:
        "={{ JSON.stringify({\n" +
        "  performUpsert: { fieldsToMergeOn: ['Ref Token'] },\n" +
        "  typecast: true,\n" +
        "  records: [{ fields: {\n" +
        "    'Ref Token': $('Check Tier A Guardrails').item.json.ref_token,\n" +
        "    'Prospect': $('Check Tier A Guardrails').item.json.prospect_name,\n" +
        "    'Email': $('Check Tier A Guardrails').item.json.prospect_email,\n" +
        "    'Unit': $('Check Tier A Guardrails').item.json.unit_code,\n" +
        "    'Status': 'Engaged'\n" +
        "  } }]\n" +
        "}) }}",
    },
    [1420, 820],
  ),

  wf.telegramNode(
    "Alert Manager: Email Reply Blocked",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Guardrail blocked an automated email reply.\n\n" +
        "Lead: {{ $json.ref_token }} ({{ $json.prospect_name }})\n" +
        "Unit: {{ $json.unit_code }}\n\n" +
        "Findings: {{ $json.findings_text }}\n\n" +
        "Nothing was sent. This one needs a human.",
    },
    [980, 1020]
  ),

  wf.postgresNode(
    "Load Lead By Token",
    "SELECT l.*, u.unit_code, u.address, u.rent_amount, u.available_from, u.pet_policy\n" +
      "FROM leads l JOIN units u ON u.id = l.unit_id\n" +
      "WHERE l.ref_token = $1 LIMIT 1;",
    [-120, 620],
    { queryOptions: { queryReplacement: "={{ [$json.ref_token] }}" }, alwaysOutputData: true }
  ),

  wf.postgresNode(
    "Load Criteria For Email Prequal",
    "SELECT * FROM criteria_config WHERE is_active ORDER BY id DESC LIMIT 1;",
    [100, 620]
  ),

  wf.openAiNode(
    "Extract Prequal Answers",
    {
      instructions: PREQUAL_INSTRUCTIONS,
      schemaName: "prequal_answers",
      schema: PREQUAL_SCHEMA,
      maxTokens: 500,
      content:
        "=Current date: {{ $now.format('yyyy-MM-dd') }}\n\n" +
        "Prospect reply:\n{{ JSON.stringify($('Classify Inbound Mail').item.json.body_text) }}",
    },
    [320, 620]
  ),

  wf.codeNode("Run Prequal Gate", prequalCode, [540, 620]),

  wf.postgresNode(
    "Update Lead After Prequal",
    "UPDATE leads SET\n" +
      "  move_in_date = COALESCE(NULLIF($2::text,'')::date, move_in_date),\n" +
      "  stated_monthly_income = COALESCE(NULLIF($3::text,'')::numeric, stated_monthly_income),\n" +
      "  pets = COALESCE(NULLIF($4::text,''), pets),\n" +
      "  vehicles = COALESCE(NULLIF($5::text,'')::int, vehicles),\n" +
      "  occupants = COALESCE(NULLIF($6::text,'')::int, occupants),\n" +
      "  prequal_result = $7,\n" +
      "  prequal_reasons = $8::jsonb,\n" +
      "  status = CASE WHEN $7 = 'clear' THEN 'prequalified' ELSE 'engaged' END\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [760, 620],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$json.ref_token," +
          "($json.answers.move_in_date ?? '')," +
          "($json.answers.stated_monthly_income ?? '')," +
          "($json.answers.pets ?? '')," +
          "($json.answers.vehicles ?? '')," +
          "($json.answers.occupants ?? '')," +
          "$json.prequal_result," +
          "JSON.stringify($json.prequal_reasons)" +
          "] }}",
      },
    }
  ),

  wf.ifNode(
    "Prequal Clear For Tour?",
    [wf.booleanCondition("={{ $('Run Prequal Gate').item.json.is_clear }}", true)],
    [980, 620]
  ),

  wf.emailSendNode(
    "Send Tour Booking Link",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $('Run Prequal Gate').item.json.prospect_email }}",
      subject: "={{ $('Run Prequal Gate').item.json.subject_line }}",
      text:
        "=Hi {{ $('Run Prequal Gate').item.json.prospect_name }},\n\n" +
        "Thanks for those details. {{ $('Run Prequal Gate').item.json.address }} looks like a fit, " +
        "so here is the link to pick a tour time that suits you:\n\n" +
        "__CALCOM_BOOKING_URL__?metadata[ref_token]={{ $('Run Prequal Gate').item.json.ref_token }}\n\n" +
        "Tours are self-guided. You will get a one-time door code shortly before your slot.\n\n" +
        "The leasing team",
    },
    [1200, 520]
  ),

  // A prospect who does not clear pre-qualification is never told they are
  // denied. Pre-qual is scheduling triage on unverified answers.
  wf.emailSendNode(
    "Send Alternatives Offer",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $('Run Prequal Gate').item.json.prospect_email }}",
      subject: "={{ $('Run Prequal Gate').item.json.subject_line }}",
      text:
        "=Hi {{ $('Run Prequal Gate').item.json.prospect_name }},\n\n" +
        "Thanks for those details. Based on what you have told us, " +
        "{{ $('Run Prequal Gate').item.json.address }} may not be the closest match on timing or " +
        "size, but we would still like to help.\n\n" +
        "A member of the team will follow up with other options that may suit you better. " +
        "If you would like to go ahead and tour this unit anyway, just reply and we will set it up.\n\n" +
        "The leasing team",
    },
    [1200, 700]
  ),

  wf.telegramNode(
    "Notify Manager: Email Prequal Needs Review",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Pre-qualification did not clear for {{ $('Run Prequal Gate').item.json.ref_token }} " +
        "({{ $('Run Prequal Gate').item.json.prospect_name }}).\n\n" +
        "Unit: {{ $('Run Prequal Gate').item.json.unit_code }}\n" +
        "Result: {{ $('Run Prequal Gate').item.json.prequal_result }}\n" +
        "Reasons: {{ $('Run Prequal Gate').item.json.reasons_text }}\n\n" +
        "This is scheduling triage on unverified answers, not a rental decision. " +
        "They were offered alternatives, not a refusal.",
    },
    [1420, 700]
  ),
];

/* ------------------------------------------------------------ connections */

const connections = wf.connect({
  /* listing-site inquiry */
  "Receive Listing Inquiry (Web)": [["Normalize Inquiry Form"]],
  "Normalize Inquiry Form": [["Inquiry Fields Valid?"]],
  "Inquiry Fields Valid?": [["Find Unit For Inquiry"], ["Build Rejection Page"]],
  "Find Unit For Inquiry": [["Create Lead From Inquiry"]],
  "Create Lead From Inquiry": [["Log Inbound Inquiry"]],
  "Log Inbound Inquiry": [["Build Confirmation Page"]],
  "Build Confirmation Page": [["Respond With Confirmation Page"]],
  // The mirror runs after the browser already has its page, so a slow or capped
  // Airtable can never hold up the response.
  "Respond With Confirmation Page": [["Mirror New Lead To Airtable"]],
  "Build Rejection Page": [["Respond: Inquiry Not Accepted"]],

  /* Telegram conversation */
  "Prospect Messages (Telegram)": [["Normalize Telegram Message"]],
  "Normalize Telegram Message": [["Claim Message (Dedupe)"]],
  "Claim Message (Dedupe)": [["Mark Replay Or New"]],
  "Mark Replay Or New": [["Is New Message?"]],
  // false branch is a dead end on purpose: a re-delivered update does nothing.
  "Is New Message?": [["Bind Lead Identity"], []],
  "Bind Lead Identity": [["Check Identity Binding"]],
  "Check Identity Binding": [["Lead Identified?"]],
  "Lead Identified?": [["Load Active Criteria"], ["Send: Start From A Listing"]],
  "Load Active Criteria": [["Load Recent Messages"]],
  "Load Recent Messages": [["Build Conversation Context"]],
  "Build Conversation Context": [["Show Typing"]],
  "Show Typing": [["Answer, Extract And Classify"]],
  "Answer, Extract And Classify": [["Merge Slots And Run Prequal Gate"]],
  "Merge Slots And Run Prequal Gate": [["Check Guardrails (Telegram)"]],
  "Check Guardrails (Telegram)": [["Update Lead From Conversation"]],
  // State is written before the send. If the send fails the turn is still
  // recorded, which is recoverable; sending and failing to record is not.
  "Update Lead From Conversation": [["Reply Passed Guardrails?"]],
  "Reply Passed Guardrails?": [["Send Prospect Reply (Telegram)"], ["Alert Manager: Reply Blocked"]],
  "Send Prospect Reply (Telegram)": [["Log Outbound Telegram Reply"]],
  "Log Outbound Telegram Reply": [["Needs Manager Notice?"]],
  "Needs Manager Notice?": [
    ["Notify Manager: Prequal Needs Review", "Phase Changed?"],
    ["Phase Changed?"],
  ],
  // Mirror at phase boundaries only. The false branch is a dead end: a turn that
  // did not move the lead to a new phase has nothing to show on the board.
  "Phase Changed?": [["Mirror Lead To Airtable (Phase)"], []],

  /* Cal.com booking */
  "Receive Tour Booking (Cal.com)": [["Issue Lock Code (MOCK)"]],
  "Issue Lock Code (MOCK)": [["Record Tour Booking"]],
  "Record Tour Booking": [["Tour: Pick Delivery Channel"]],
  "Tour: Pick Delivery Channel": [["Tour: On Telegram?"]],
  "Tour: On Telegram?": [["Send Tour Confirmation (Telegram)"], ["Send Tour Confirmation (Email)"]],

  /* tour completed */
  "Receive Tour Completed (Demo)": [["Mark Lead Toured"]],
  "Mark Lead Toured": [["Application: Pick Delivery Channel"]],
  "Application: Pick Delivery Channel": [["Application: On Telegram?"]],
  "Application: On Telegram?": [
    ["Send Application Link (Telegram)"],
    ["Send Application Link (Email)"],
  ],

  /* email path */
  "Receive Prospect Mail (IMAP)": [["Classify Inbound Mail"]],
  "Classify Inbound Mail": [["Is Reply To Existing Lead?"]],
  "Is Reply To Existing Lead?": [["Load Lead By Token"], ["Find Unit For Email Inquiry"]],
  "Find Unit For Email Inquiry": [["Create Lead Record"]],
  "Create Lead Record": [["Draft Grounded Reply"]],
  "Draft Grounded Reply": [["Check Tier A Guardrails"]],
  "Check Tier A Guardrails": [["Email Reply Passed Guardrails?"]],
  "Email Reply Passed Guardrails?": [["Send Grounded Reply"], ["Alert Manager: Email Reply Blocked"]],
  "Send Grounded Reply": [["Log Outbound Reply"]],
  "Log Outbound Reply": [["Mirror Email Lead To Airtable"]],

  "Load Lead By Token": [["Load Criteria For Email Prequal"]],
  "Load Criteria For Email Prequal": [["Extract Prequal Answers"]],
  "Extract Prequal Answers": [["Run Prequal Gate"]],
  "Run Prequal Gate": [["Update Lead After Prequal"]],
  "Update Lead After Prequal": [["Prequal Clear For Tour?"]],
  "Prequal Clear For Tour?": [["Send Tour Booking Link"], ["Send Alternatives Offer"]],
  "Send Alternatives Offer": [["Notify Manager: Email Prequal Needs Review"]],
});

const workflow = wf.buildWorkflow({
  id: "wf1-leasing-front",
  name: "WF1 Leasing Front",
  nodes,
  connections,
  active: true,
});

const count = wf.writeWorkflow(workflow, OUT);
console.log(`wf1-leasing-front.json written, ${count} nodes`);
console.log("Import with: node scripts/import-workflows.js wf1-leasing-front");
