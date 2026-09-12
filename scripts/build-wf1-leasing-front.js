/**
 * Builds n8n-workflows/wf1-leasing-front.json.
 *
 * WF1 is the front of funnel: a listing-site lead arrives by email, the model
 * answers it from the unit's own facts, pre-qualification is collected, a tour
 * is booked, and an application link goes out afterwards.
 *
 * Four entry points:
 *   1. IMAP        - new leads and prospect replies, filtered to the demo sender
 *   2. Cal.com     - booking created webhook
 *   3. Tour done   - demo helper webhook that stands in for "the tour happened"
 *
 * Run: node scripts/build-wf1-leasing-front.js
 */

const path = require("path");
const wf = require("./lib/wf-common");
const { REPO_ROOT } = require("./lib/env");

const LIB = wf.inlineLib("leasing-lib.js");
const OUT = path.join(REPO_ROOT, "n8n-workflows", "wf1-leasing-front.json");

/* --------------------------------------------------------------- schemas */

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

const FAQ_INSTRUCTIONS = [
  "You are a leasing assistant for a property management company, replying to a rental inquiry.",
  "",
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
  "",
  "After answering, ask these pre-qualification questions in one short natural paragraph:",
  "intended move-in date, approximate gross monthly income, pets, number of vehicles, and how many",
  "adults will be living there. Explain that it is to check which units fit, not a decision.",
  "",
  "Tone: warm, brief, professional. Sign off as the leasing team. Do not include a subject line.",
].join("\n");

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

/* ------------------------------------------------------------- code bodies */

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
  "  const unit = $('Find Unit For Inquiry').first().json;",
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

/* ------------------------------------------------------------------ nodes */

const nodes = [
  /* ---- entry 1: inbound mail ------------------------------------------- */
  wf.imapTriggerNode("Receive Prospect Mail (IMAP)", [-560, 0], {
    // Restricted to the demo prospect address so unrelated mail in the same
    // inbox is never processed as a rental lead.
    customRules: '["UNSEEN", ["FROM", "__PROSPECT_EMAIL__"]]',
  }),

  wf.codeNode("Classify Inbound Mail", classifyCode, [-340, 0]),

  wf.ifNode(
    "Is Reply To Existing Lead?",
    [wf.booleanCondition("={{ $json.is_reply }}", true)],
    [-120, 0]
  ),

  /* ---- branch A: new lead ---------------------------------------------- */
  wf.postgresNode(
    "Find Unit For Inquiry",
    "SELECT * FROM units\n" +
      "WHERE status = 'available'\n" +
      "  AND (position(unit_code in $1) > 0 OR position(split_part(address, ',', 2) in $1) > 0)\n" +
      "ORDER BY id LIMIT 1;",
    [120, 160],
    { queryOptions: { queryReplacement: "={{ [$json.unit_hint || ''] }}" }, alwaysOutputData: true }
  ),

  wf.postgresNode(
    "Create Lead Record",
    "INSERT INTO leads (ref_token, unit_id, source, prospect_name, prospect_email, prospect_phone, status)\n" +
      "VALUES ($1, (SELECT id FROM units WHERE unit_code = $2), 'zillow_email', $3, $4, NULLIF($5::text,''), 'engaged')\n" +
      "ON CONFLICT (ref_token) DO UPDATE SET status = leads.status\n" +
      "RETURNING *;",
    [340, 160],
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
        "{{ JSON.stringify($('Find Unit For Inquiry').item.json) }}",
    },
    [560, 160]
  ),

  wf.codeNode("Check Tier A Guardrails", guardrailCode, [780, 160]),

  wf.ifNode(
    "Reply Passed Guardrails?",
    [wf.booleanCondition("={{ $json.guardrail_passed }}", true)],
    [1000, 160]
  ),

  wf.emailSendNode(
    "Send Grounded Reply",
    {
      fromEmail: "=__SYSTEM_EMAIL__",
      toEmail: "={{ $json.prospect_email }}",
      subject: "={{ $json.subject_line }}",
      text: "={{ $json.reply_text }}",
    },
    [1240, 60]
  ),

  wf.postgresNode(
    "Log Outbound Reply",
    "INSERT INTO message_log\n" +
      "  (ref_token, direction, channel, tier, from_addr, to_addr, subject, body,\n" +
      "   message_id, guardrail_passed, guardrail_result)\n" +
      "VALUES ($1, 'outbound', 'email', 'A', $2, $3, $4, $5, $6, TRUE, $7::jsonb);",
    [1460, 60],
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
    "Mirror Lead To Airtable",
    {
      tableName: "Leads",
      bodyExpression:
        "={{ JSON.stringify({ fields: {\n" +
        "  'Ref Token': $('Check Tier A Guardrails').item.json.ref_token,\n" +
        "  'Prospect': $('Check Tier A Guardrails').item.json.prospect_name,\n" +
        "  'Email': $('Check Tier A Guardrails').item.json.prospect_email,\n" +
        "  'Unit': $('Check Tier A Guardrails').item.json.unit_code,\n" +
        "  'Status': 'Engaged'\n" +
        "} }) }}",
    },
    [1680, 60]
  ),

  wf.telegramNode(
    "Alert Manager: Reply Blocked",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Guardrail blocked an automated reply.\n\n" +
        "Lead: {{ $json.ref_token }} ({{ $json.prospect_name }})\n" +
        "Unit: {{ $json.unit_code }}\n\n" +
        "Findings: {{ JSON.stringify($json.guardrail_result.findings) }}\n\n" +
        "Nothing was sent. This one needs a human.",
    },
    [1240, 280]
  ),

  /* ---- branch B: prospect reply ---------------------------------------- */
  wf.postgresNode(
    "Load Lead By Token",
    "SELECT l.*, u.unit_code, u.address, u.rent_amount, u.available_from, u.pet_policy\n" +
      "FROM leads l JOIN units u ON u.id = l.unit_id\n" +
      "WHERE l.ref_token = $1 LIMIT 1;",
    [120, -200],
    { queryOptions: { queryReplacement: "={{ [$json.ref_token] }}" }, alwaysOutputData: true }
  ),

  wf.postgresNode(
    "Load Active Criteria",
    "SELECT * FROM criteria_config WHERE is_active ORDER BY id DESC LIMIT 1;",
    [340, -200]
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
    [560, -200]
  ),

  wf.codeNode("Run Prequal Gate", prequalCode, [780, -200]),

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
    [1000, -200],
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
    [1220, -200]
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
    [1460, -300]
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
    [1460, -100]
  ),

  wf.telegramNode(
    "Notify Manager: Prequal Needs Review",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Pre-qualification did not clear for {{ $('Run Prequal Gate').item.json.ref_token }} " +
        "({{ $('Run Prequal Gate').item.json.prospect_name }}).\n\n" +
        "Unit: {{ $('Run Prequal Gate').item.json.unit_code }}\n" +
        "Result: {{ $('Run Prequal Gate').item.json.prequal_result }}\n" +
        "Reasons: {{ JSON.stringify($('Run Prequal Gate').item.json.prequal_reasons) }}\n\n" +
        "This is scheduling triage on unverified answers, not a rental decision. " +
        "They were offered alternatives, not a refusal.",
    },
    [1680, -100]
  ),

  /* ---- entry 2: Cal.com booking ---------------------------------------- */
  wf.webhookNode("Receive Tour Booking (Cal.com)", "calcom-booking", [-560, 420]),

  wf.codeNode("Issue Lock Code (MOCK)", lockCodeCode, [-340, 420]),

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
    [-120, 420],
    {
      queryOptions: {
        queryReplacement:
          "={{ [($json.ref_token ?? ''), ($json.booking_uid ?? ''), " +
          "($json.starts_at ?? ''), ($json.lock_code ?? '')] }}",
      },
      alwaysOutputData: true,
    }
  ),

  wf.emailSendNode(
    "Send Tour Confirmation",
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
    [100, 420]
  ),

  /* ---- entry 3: tour completed (demo helper) --------------------------- */
  wf.webhookNode("Receive Tour Completed (Demo)", "tour-completed", [-560, 640]),

  wf.postgresNode(
    "Mark Lead Toured",
    "UPDATE leads SET status = 'toured'\n" +
      "WHERE ref_token = $1\n" +
      "RETURNING *, (SELECT address FROM units WHERE id = leads.unit_id) AS address;",
    [-340, 640],
    {
      queryOptions: { queryReplacement: "={{ [($json.body?.ref_token || $json.query?.ref_token || '')] }}" },
      alwaysOutputData: true,
    }
  ),

  wf.emailSendNode(
    "Send Application Link",
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
    [-120, 640]
  ),
];

/* ------------------------------------------------------------ connections */

const connections = wf.connect({
  "Receive Prospect Mail (IMAP)": [["Classify Inbound Mail"]],
  "Classify Inbound Mail": [["Is Reply To Existing Lead?"]],
  // true branch = reply, false branch = new lead
  "Is Reply To Existing Lead?": [["Load Lead By Token"], ["Find Unit For Inquiry"]],

  "Find Unit For Inquiry": [["Create Lead Record"]],
  "Create Lead Record": [["Draft Grounded Reply"]],
  "Draft Grounded Reply": [["Check Tier A Guardrails"]],
  "Check Tier A Guardrails": [["Reply Passed Guardrails?"]],
  "Reply Passed Guardrails?": [["Send Grounded Reply"], ["Alert Manager: Reply Blocked"]],
  "Send Grounded Reply": [["Log Outbound Reply"]],
  "Log Outbound Reply": [["Mirror Lead To Airtable"]],

  "Load Lead By Token": [["Load Active Criteria"]],
  "Load Active Criteria": [["Extract Prequal Answers"]],
  "Extract Prequal Answers": [["Run Prequal Gate"]],
  "Run Prequal Gate": [["Update Lead After Prequal"]],
  "Update Lead After Prequal": [["Prequal Clear For Tour?"]],
  "Prequal Clear For Tour?": [["Send Tour Booking Link"], ["Send Alternatives Offer"]],
  "Send Alternatives Offer": [["Notify Manager: Prequal Needs Review"]],

  "Receive Tour Booking (Cal.com)": [["Issue Lock Code (MOCK)"]],
  "Issue Lock Code (MOCK)": [["Record Tour Booking"]],
  "Record Tour Booking": [["Send Tour Confirmation"]],

  "Receive Tour Completed (Demo)": [["Mark Lead Toured"]],
  "Mark Lead Toured": [["Send Application Link"]],
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
