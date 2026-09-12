/**
 * Builds n8n-workflows/wf5-tour-booking.json.
 *
 * WF5 books the self-guided tour. It exists so the assistant can settle a time
 * inside the conversation - "Saturday morning works" - instead of handing the
 * renter a link and hoping they come back.
 *
 * THE MODEL NEVER BOOKS ANYTHING. It turns "Saturday morning" into an ISO
 * datetime and that is the end of its involvement. `matchTourSlot()` then picks
 * the nearest slot Cal.com actually returned, so the assistant can only ever
 * book a time that genuinely exists, and `classifyTourRequest()` decides whether
 * that time is inside the manager's published policy.
 *
 * Inside the policy  -> booked immediately, no human involved.
 * Outside it         -> HELD. The slot is not booked, the manager gets one card
 *                       saying exactly why it was held, and the renter is told
 *                       it is being checked. Nothing is confirmed until the tap.
 * No slot close      -> the renter is offered the nearest real alternatives.
 *
 * That is the point of the exception model: the manager keeps control of who is
 * in the building out of hours without standing in the way of an ordinary
 * booking at ten o'clock at night.
 *
 * Two entry points, both internal:
 *   1. tour-request   - WF1 calls this after a conversation turn names a time
 *   2. tour-decision  - WF3 calls this when the manager taps approve or decline
 *
 * WF5 RECORDS AND CONFIRMS ITS OWN BOOKINGS, deliberately. Cal.com's
 * BOOKING_CREATED webhook does NOT carry the metadata set when creating a
 * booking through the API, so the ref_token never comes back and the lead
 * cannot be identified from the webhook alone. WF1's Cal.com branch stays for
 * bookings made on the public booking page, where the token travels in the URL.
 *
 * Run: node scripts/build-wf5-tour-booking.js
 */

const path = require("path");
const wf = require("./lib/wf-common");
const { REPO_ROOT } = require("./lib/env");

const LIB = wf.inlineLib("leasing-lib.js");
const OUT = path.join(REPO_ROOT, "n8n-workflows", "wf5-tour-booking.json");

/* ------------------------------------------------------------- code bodies */

const matchCode = [
  LIB,
  "",
  "// Deterministic slot selection. Everything the renter gets from here is a",
  "// real Cal.com slot; nothing is invented and nothing is approximated beyond",
  "// the stated tolerance.",
  "const lead = $('Load Lead For Tour').first().json;",
  "const policy = $('Load Tour Policy').first().json;",
  "const request = $('Tour Requested (Internal)').first().json.body || {};",
  "const raw = $input.first().json || {};",
  "",
  "// Cal.com returns { data: { 'YYYY-MM-DD': [{ start }] } }. Flatten it.",
  "const byDay = (raw.data && typeof raw.data === 'object') ? raw.data : {};",
  "const slots = [];",
  "for (const day of Object.keys(byDay)) {",
  "  const entries = byDay[day];",
  "  if (!Array.isArray(entries)) continue;",
  "  for (const entry of entries) {",
  "    const start = typeof entry === 'string' ? entry : (entry && entry.start);",
  "    if (start) slots.push(start);",
  "  }",
  "}",
  "",
  "// The model returns a naive datetime meaning the PROPERTY's local time. Read",
  "// as UTC it books hours out with no error anywhere, so pin the zone first.",
  "const wanted = naiveLocalToUtcIso(request.preferred_iso, '__TOUR_TIMEZONE__');",
  "const match = matchTourSlot(wanted, slots, 4);",
  "const lock = generateLockCode();",
  "",
  "// Local hour and weekday, computed here because a Code node cannot rely on",
  "// the container's timezone being the property's timezone.",
  "function localParts(iso) {",
  "  const fmt = new Intl.DateTimeFormat('en-US', {",
  "    timeZone: '__TOUR_TIMEZONE__', hour: 'numeric', hour12: false, weekday: 'short',",
  "  });",
  "  const parts = fmt.formatToParts(new Date(iso));",
  "  const hour = Number((parts.find((p) => p.type === 'hour') || {}).value);",
  "  const names = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };",
  "  const weekday = names[(parts.find((p) => p.type === 'weekday') || {}).value];",
  "  return { hour: hour === 24 ? 0 : hour, weekday: weekday };",
  "}",
  "",
  "function pretty(iso) {",
  "  return new Intl.DateTimeFormat('en-US', {",
  "    timeZone: '__TOUR_TIMEZONE__', weekday: 'long', month: 'long', day: 'numeric',",
  "    hour: 'numeric', minute: '2-digit',",
  "  }).format(new Date(iso));",
  "}",
  "",
  "let action = 'offer';",
  "let classification = { is_exception: false, reasons: [] };",
  "",
  "if (match.matched) {",
  "  const parts = localParts(match.matched);",
  "  classification = classifyTourRequest(",
  "    match.matched, policy, new Date().toISOString(), parts.hour, parts.weekday",
  "  );",
  "  action = classification.is_exception ? 'hold' : 'book';",
  "}",
  "",
  "// Wording is fixed. The model is not involved in any message from here on.",
  "let prospectText = '';",
  "if (action === 'book') {",
  "  prospectText = 'Booking you in for ' + pretty(match.matched) + '. One moment.';",
  "} else if (action === 'hold') {",
  "  prospectText = 'I have put a hold on ' + pretty(match.matched) + '. That one needs a quick ' +",
  "    'check with the team - I will confirm shortly.';",
  "} else if (match.alternatives.length) {",
  "  prospectText = 'I could not find that exact time. The nearest I have are:\\n\\n' +",
  "    match.alternatives.map(function (s) { return '- ' + pretty(s); }).join('\\n') +",
  "    '\\n\\nAny of those work? You can also pick your own time here:\\n' +",
  "    '__CALCOM_BOOKING_URL__?metadata[ref_token]=' + lead.ref_token;",
  "} else {",
  "  prospectText = 'I do not have any tour slots open at the moment. You can check for new ' +",
  "    'times here:\\n__CALCOM_BOOKING_URL__?metadata[ref_token]=' + lead.ref_token;",
  "}",
  "",
  "return [{",
  "  json: {",
  "    ref_token: lead.ref_token,",
  "    telegram_chat_id: lead.telegram_chat_id,",
  "    prospect_name: lead.prospect_name,",
  "    lock_code: lock.code,",
  "    unit_code: lead.unit_code,",
  "    address: lead.address,",
  "    requested_iso: wanted,",
  "    slot_iso: match.matched,",
  "    slot_pretty: match.matched ? pretty(match.matched) : null,",
  "    delta_minutes: match.delta_minutes,",
  "    alternatives: match.alternatives,",
  "    slots_available: slots.length,",
  "    action: action,",
  "    should_book: action === 'book',",
  "    should_hold: action === 'hold',",
  "    exception_reasons: classification.reasons,",
  "    reasons_text: escapeTelegramHtml(classification.reasons.join('; ')),",
  "    prospect_text: escapeTelegramHtml(prospectText),",
  "  },",
  "}];",
].join("\n");

const decisionCode = [
  LIB,
  "",
  "// The manager tapped. Deterministic: the slot was decided when it was held,",
  "// and nothing about it can change here.",
  "const lead = $('Load Lead For Decision').first().json;",
  "const body = $('Tour Decision (Internal)').first().json.body || {};",
  "const approved = body.approved === true || body.approved === 'true';",
  "",
  "if (!lead || !lead.ref_token) {",
  "  throw new Error('No lead for tour decision: ' + JSON.stringify(body).slice(0, 200));",
  "}",
  "",
  "function pretty(iso) {",
  "  return new Intl.DateTimeFormat('en-US', {",
  "    timeZone: '__TOUR_TIMEZONE__', weekday: 'long', month: 'long', day: 'numeric',",
  "    hour: 'numeric', minute: '2-digit',",
  "  }).format(new Date(iso));",
  "}",
  "",
  "const slotIso = lead.pending_tour_starts_at;",
  "const lock = generateLockCode();",
  "const declineText = 'That time is not available after all, sorry. You can pick another ' +",
  "  'here and it will be confirmed straight away:\\n' +",
  "  '__CALCOM_BOOKING_URL__?metadata[ref_token]=' + lead.ref_token;",
  "",
  "return [{",
  "  json: {",
  "    ref_token: lead.ref_token,",
  "    telegram_chat_id: lead.telegram_chat_id,",
  "    prospect_name: lead.prospect_name,",
  "    slot_iso: slotIso,",
  "    slot_pretty: slotIso ? pretty(slotIso) : null,",
  "    lock_code: lock.code,",
  "    address: lead.address,",
  "    approved: approved,",
  "    decline_text: escapeTelegramHtml(declineText),",
  "  },",
  "}];",
].join("\n");

/** Cal.com v2 booking. Versions differ per endpoint, which is not obvious. */
function calBookingNode(name, startExpression, position) {
  return {
    ...wf.plaidNode(name, "/noop", "={{ '{}' }}", position),
    name,
    id: wf.slugFor(name),
    parameters: {
      method: "POST",
      url: "https://api.cal.com/v2/bookings",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer __CALCOM_API_KEY__" },
          // 2024-08-13 for bookings, 2024-09-04 for slots. Mixing them 404s.
          { name: "cal-api-version", value: "2024-08-13" },
        ],
      },
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      // The attendee address must be genuinely deliverable: Cal.com validates
      // the domain and rejects example.com outright with
      // email_domain_cannot_receive_mail. The fixture address is overridden the
      // same way the DocuSign signer is.
      jsonBody:
        "={{ JSON.stringify({\n" +
        "  start: " + startExpression + ",\n" +
        "  eventTypeId: Number('__CALCOM_EVENT_TYPE_ID__'),\n" +
        "  attendee: {\n" +
        "    name: $json.prospect_name || 'Prospective resident',\n" +
        "    email: '__PROSPECT_EMAIL__',\n" +
        "    timeZone: '__TOUR_TIMEZONE__',\n" +
        "    language: 'en'\n" +
        "  },\n" +
        "  metadata: { ref_token: $json.ref_token }\n" +
        "}) }}",
      options: { timeout: 20000 },
    },
    credentials: undefined,
  };
}

/* ------------------------------------------------------------------ nodes */

const nodes = [
  /* ---- entry 1: a conversation turn named a time ----------------------- */
  wf.webhookNode("Tour Requested (Internal)", "tour-request", [-760, 0]),

  wf.postgresNode(
    "Load Lead For Tour",
    "SELECT l.*, u.unit_code, u.address\n" +
      "FROM leads l JOIN units u ON u.id = l.unit_id\n" +
      "WHERE l.ref_token = $1 LIMIT 1;",
    [-540, 0],
    {
      queryOptions: { queryReplacement: "={{ [$json.body.ref_token] }}" },
      alwaysOutputData: true,
    }
  ),

  wf.postgresNode(
    "Load Tour Policy",
    "SELECT * FROM tour_policy WHERE is_active ORDER BY id DESC LIMIT 1;",
    [-320, 0]
  ),

  {
    ...wf.plaidNode("Cal.com: Get Slots", "/noop", "={{ '{}' }}", [-100, 0]),
    name: "Cal.com: Get Slots",
    id: "cal-com-get-slots",
    parameters: {
      method: "GET",
      url:
        "=https://api.cal.com/v2/slots?eventTypeId=__CALCOM_EVENT_TYPE_ID__" +
        "&start={{ $now.format('yyyy-MM-dd') }}" +
        "&end={{ $now.plus(14, 'days').format('yyyy-MM-dd') }}" +
        "&timeZone=__TOUR_TIMEZONE__",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer __CALCOM_API_KEY__" },
          { name: "cal-api-version", value: "2024-09-04" },
        ],
      },
      options: { timeout: 20000 },
    },
    credentials: undefined,
  },

  wf.codeNode("Match Slot And Check Policy", matchCode, [120, 0]),

  wf.telegramNode(
    "Tell Prospect What Is Happening",
    {
      bot: "prospect",
      failOnError: true,
      chatId: "={{ $json.telegram_chat_id }}",
      text: "={{ $json.prospect_text }}",
    },
    [340, 0]
  ),

  wf.ifNode(
    "Book Without Asking?",
    [wf.booleanCondition("={{ $('Match Slot And Check Policy').item.json.should_book }}", true)],
    [560, 0]
  ),

  calBookingNode(
    "Cal.com: Create Booking",
    "$('Match Slot And Check Policy').item.json.slot_iso",
    [780, -140]
  ),

  // Recorded here rather than waiting for Cal.com's webhook: that webhook does
  // not return the metadata we set, so it cannot say which lead this was for.
  wf.postgresNode(
    "Record Direct Booking",
    "UPDATE leads SET\n" +
      "  calcom_booking_uid = $2,\n" +
      "  tour_starts_at = $3::timestamptz,\n" +
      "  lock_code = $4,\n" +
      "  lock_code_source = 'mock',\n" +
      "  tour_approval_state = 'none',\n" +
      "  pending_tour_starts_at = NULL,\n" +
      "  status = 'tour_booked'\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [1000, -220],
    {
      queryOptions: {
        queryReplacement:
          "={{ [$('Match Slot And Check Policy').item.json.ref_token, " +
          "($json.data?.uid ?? ''), " +
          "$('Match Slot And Check Policy').item.json.slot_iso, " +
          "$('Match Slot And Check Policy').item.json.lock_code] }}",
      },
    }
  ),

  wf.telegramNode(
    "Confirm Tour Booked",
    {
      bot: "prospect",
      failOnError: true,
      chatId: "={{ $('Match Slot And Check Policy').item.json.telegram_chat_id }}",
      text:
        "=Your self-guided tour of {{ $('Match Slot And Check Policy').item.json.address }} is " +
        "confirmed for {{ $('Match Slot And Check Policy').item.json.slot_pretty }}.\n\n" +
        "Entry code: {{ $('Match Slot And Check Policy').item.json.lock_code }}\n\n" +
        "The code works during your booked slot only. Let yourself in, take your time, and " +
        "pull the door closed when you leave.",
    },
    [1220, -220]
  ),

  wf.postgresNode(
    "Record Approved Booking",
    "UPDATE leads SET\n" +
      "  calcom_booking_uid = $2,\n" +
      "  tour_starts_at = $3::timestamptz,\n" +
      "  lock_code = $4,\n" +
      "  lock_code_source = 'mock',\n" +
      "  tour_approval_state = 'approved',\n" +
      "  pending_tour_starts_at = NULL,\n" +
      "  status = 'tour_booked'\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [340, 360],
    {
      queryOptions: {
        queryReplacement:
          "={{ [$('Read Tour Decision').item.json.ref_token, " +
          "($json.data?.uid ?? ''), " +
          "$('Read Tour Decision').item.json.slot_iso, " +
          "$('Read Tour Decision').item.json.lock_code] }}",
      },
    }
  ),

  wf.telegramNode(
    "Confirm Approved Tour",
    {
      bot: "prospect",
      failOnError: true,
      chatId: "={{ $('Read Tour Decision').item.json.telegram_chat_id }}",
      text:
        "=Good news - your tour of {{ $('Read Tour Decision').item.json.address }} is confirmed " +
        "for {{ $('Read Tour Decision').item.json.slot_pretty }}.\n\n" +
        "Entry code: {{ $('Read Tour Decision').item.json.lock_code }}\n\n" +
        "The code works during your booked slot only.",
    },
    [560, 360]
  ),

  wf.ifNode(
    "Hold For Manager?",
    [wf.booleanCondition("={{ $('Match Slot And Check Policy').item.json.should_hold }}", true)],
    [780, 140]
  ),

  // The slot is NOT booked here. A declined request must never have occupied
  // the calendar in the first place.
  wf.postgresNode(
    "Hold Slot For Approval",
    "UPDATE leads SET\n" +
      "  pending_tour_starts_at = $2::timestamptz,\n" +
      "  tour_approval_state = 'pending'\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [1000, 60],
    {
      queryOptions: {
        queryReplacement:
          "={{ [$('Match Slot And Check Policy').item.json.ref_token, " +
          "$('Match Slot And Check Policy').item.json.slot_iso] }}",
      },
    }
  ),

  wf.telegramCardNode(
    "Ask Manager: Approve This Tour",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "=Tour request outside the usual policy.\n\n" +
        "{{ $('Match Slot And Check Policy').item.json.prospect_name }} " +
        "({{ $('Match Slot And Check Policy').item.json.ref_token }})\n" +
        "Unit: {{ $('Match Slot And Check Policy').item.json.unit_code }}\n" +
        "Requested: {{ $('Match Slot And Check Policy').item.json.slot_pretty }}\n\n" +
        "Held because: {{ $('Match Slot And Check Policy').item.json.reasons_text }}\n\n" +
        "Nothing is booked and they have not been given a time. Your call.",
      buttonRows: [
        [
          { text: "Approve tour", callbackData: "=tba:{{ $('Match Slot And Check Policy').item.json.ref_token }}" },
          { text: "Not that time", callbackData: "=tbd:{{ $('Match Slot And Check Policy').item.json.ref_token }}" },
        ],
      ],
    },
    [1220, 60]
  ),

  /* ---- entry 2: the manager decided ------------------------------------ */
  wf.webhookNode("Tour Decision (Internal)", "tour-decision", [-760, 460]),

  wf.postgresNode(
    "Load Lead For Decision",
    "SELECT l.*, u.unit_code, u.address\n" +
      "FROM leads l JOIN units u ON u.id = l.unit_id\n" +
      "WHERE l.ref_token = $1 AND l.tour_approval_state = 'pending' LIMIT 1;",
    [-540, 460],
    {
      queryOptions: { queryReplacement: "={{ [$json.body.ref_token] }}" },
      alwaysOutputData: true,
    }
  ),

  wf.codeNode("Read Tour Decision", decisionCode, [-320, 460]),

  wf.ifNode(
    "Tour Approved?",
    [wf.booleanCondition("={{ $json.approved }}", true)],
    [-100, 460]
  ),

  calBookingNode(
    "Cal.com: Create Approved Booking",
    "$('Read Tour Decision').item.json.slot_iso",
    [120, 360]
  ),

  wf.postgresNode(
    "Mark Tour Declined",
    "UPDATE leads SET tour_approval_state = 'declined', pending_tour_starts_at = NULL\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [120, 580],
    { queryOptions: { queryReplacement: "={{ [$('Read Tour Decision').item.json.ref_token] }}" } }
  ),

  // Never a refusal of the person - only of the time.
  wf.telegramNode(
    "Tell Prospect: Another Time",
    {
      bot: "prospect",
      failOnError: true,
      chatId: "={{ $('Read Tour Decision').item.json.telegram_chat_id }}",
      text: "={{ $('Read Tour Decision').item.json.decline_text }}",
    },
    [340, 580]
  ),
];

/* ------------------------------------------------------------ connections */

const connections = wf.connect({
  "Tour Requested (Internal)": [["Load Lead For Tour"]],
  "Load Lead For Tour": [["Load Tour Policy"]],
  "Load Tour Policy": [["Cal.com: Get Slots"]],
  "Cal.com: Get Slots": [["Match Slot And Check Policy"]],
  // The renter is told what is happening before anything else, so there is never
  // a silent gap between naming a time and hearing back.
  "Match Slot And Check Policy": [["Tell Prospect What Is Happening"]],
  "Tell Prospect What Is Happening": [["Book Without Asking?"]],
  "Book Without Asking?": [["Cal.com: Create Booking"], ["Hold For Manager?"]],
  "Cal.com: Create Booking": [["Record Direct Booking"]],
  "Record Direct Booking": [["Confirm Tour Booked"]],
  "Hold For Manager?": [["Hold Slot For Approval"], []],
  "Hold Slot For Approval": [["Ask Manager: Approve This Tour"]],

  "Tour Decision (Internal)": [["Load Lead For Decision"]],
  "Load Lead For Decision": [["Read Tour Decision"]],
  "Read Tour Decision": [["Tour Approved?"]],
  "Tour Approved?": [["Cal.com: Create Approved Booking"], ["Mark Tour Declined"]],
  "Cal.com: Create Approved Booking": [["Record Approved Booking"]],
  "Record Approved Booking": [["Confirm Approved Tour"]],
  "Mark Tour Declined": [["Tell Prospect: Another Time"]],
});

const workflow = wf.buildWorkflow({
  id: "wf5-tour-booking",
  name: "WF5 Tour Booking",
  nodes,
  connections,
  active: true,
});

const count = wf.writeWorkflow(workflow, OUT);
console.log(`wf5-tour-booking.json written, ${count} nodes`);
console.log("Import with: node scripts/import-workflows.js wf5-tour-booking");
