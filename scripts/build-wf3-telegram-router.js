/**
 * Builds n8n-workflows/wf3-telegram-router.json.
 *
 * WF3 owns the only Telegram Trigger in the project. Telegram allows one webhook
 * per bot, so every button tap and command enters here.
 *
 * Its job is narrow: identify the tap, refuse it if the file was already
 * decided, record who decided what and when, and hand approved files to WF4.
 *
 * There is deliberately no button that sends a denial.
 *
 * Run: node scripts/build-wf3-telegram-router.js
 */

const path = require("path");
const wf = require("./lib/wf-common");
const { REPO_ROOT } = require("./lib/env");

const OUT = path.join(REPO_ROOT, "n8n-workflows", "wf3-telegram-router.json");

const parseCallbackCode = [
  "// callback_data is capped at 64 bytes, so it carries a three-letter action",
  "// and the application reference only - never a decision payload.",
  "const ACTIONS = {",
  "  apr: { decision: 'approved', label: 'Approved', triggers_lease: true },",
  "  con: { decision: 'conditional', label: 'Approved with conditions', triggers_lease: true },",
  "  rev: { decision: 'sent_to_review', label: 'Sent for closer review', triggers_lease: false },",
  "};",
  "",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const update = item.json;",
  "  const callback = update.callback_query;",
  "",
  "  if (!callback) {",
  "    // Not a button tap. Nothing else enters this workflow yet.",
  "    continue;",
  "  }",
  "",
  "  const raw = String(callback.data || '');",
  "  const separator = raw.indexOf(':');",
  "  const prefix = separator === -1 ? '' : raw.slice(0, separator);",
  "  const refToken = separator === -1 ? '' : raw.slice(separator + 1);",
  "  const action = ACTIONS[prefix];",
  "",
  "  if (!action || !refToken) {",
  "    throw new Error('Unrecognised callback_data: ' + raw);",
  "  }",
  "",
  "  const from = callback.from || {};",
  "  const actor = from.username ? '@' + from.username",
  "    : [from.first_name, from.last_name].filter(Boolean).join(' ') || String(from.id || 'unknown');",
  "",
  "  out.push({ json: {",
  "    ref_token: refToken,",
  "    decision: action.decision,",
  "    decision_label: action.label,",
  "    triggers_lease: action.triggers_lease,",
  "    actor: actor,",
  "    callback_query_id: callback.id,",
  "    chat_id: (callback.message && callback.message.chat && callback.message.chat.id) || null,",
  "  } });",
  "}",
  "return out;",
].join("\n");

const nodes = [
  // The MANAGER bot. WF1's prospect conversation runs on a second bot, because
  // Telegram allows one webhook per bot. The node id is pinned to its original
  // value: n8n derives the webhook secret from `${workflowId}_${nodeId}`, and
  // there is no reason to churn it.
  {
    ...wf.telegramTriggerNode("Manager Actions (Telegram)", [-620, 0], {
      bot: "manager",
      updates: ["callback_query", "message"],
      webhookId: "leasing-telegram-router",
    }),
    id: "telegram-trigger",
  },

  wf.codeNode("Parse Manager Action", parseCallbackCode, [-400, 0]),

  // Stops the Telegram spinner immediately. A human waiting on a callback is a
  // terrible look mid-demo, and the tap is acknowledged before any work runs.
  {
    ...wf.plaidNode("Acknowledge Tap", "/noop", "={{ '{}' }}", [-180, 0]),
    name: "Acknowledge Tap",
    id: "acknowledge-tap",
    parameters: {
      method: "POST",
      url: "=https://api.telegram.org/bot__TELEGRAM_BOT_TOKEN__/answerCallbackQuery",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify({ callback_query_id: $json.callback_query_id }) }}",
      options: { timeout: 10000 },
    },
    credentials: undefined,
    onError: "continueRegularOutput",
  },

  wf.postgresNode(
    "Load Application For Decision",
    "SELECT a.*, u.unit_code, u.address, u.rent_amount, u.deposit_amount, u.lease_term_months,\n" +
      "       (a.decision IS NOT NULL) AS already_decided\n" +
      "FROM applications a JOIN units u ON u.id = a.unit_id\n" +
      "WHERE a.ref_token = $1 LIMIT 1;",
    [40, 0],
    {
      queryOptions: {
        queryReplacement: "={{ [$('Parse Manager Action').first().json.ref_token] }}",
      },
    }
  ),

  // Double-tap guard. People double-tap, and a second tap must never produce a
  // second envelope. The check is on stored state, not on anything in the tap.
  wf.ifNode(
    "Already Decided?",
    [wf.booleanCondition("={{ $json.already_decided }}", true)],
    [260, 0]
  ),

  wf.telegramNode(
    "Notify: Already Actioned",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "={{ $json.ref_token }} was already {{ $json.decision }} by {{ $json.decided_by }} " +
        "on {{ $json.decided_at }}.\n\nNo second action was taken.",
    },
    [480, -160]
  ),

  wf.postgresNode(
    "Record Decision",
    "UPDATE applications SET\n" +
      "  decision = $2,\n" +
      "  decided_by = $3,\n" +
      "  decided_at = now(),\n" +
      "  status = 'decided'\n" +
      "WHERE ref_token = $1 AND decision IS NULL\n" +
      "RETURNING *, (SELECT unit_code FROM units WHERE id = applications.unit_id) AS unit_code;",
    [480, 120],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$('Parse Manager Action').first().json.ref_token," +
          "$('Parse Manager Action').first().json.decision," +
          "$('Parse Manager Action').first().json.actor" +
          "] }}",
      },
    }
  ),

  wf.ifNode(
    "Send Lease Now?",
    [wf.booleanCondition("={{ $('Parse Manager Action').first().json.triggers_lease }}", true)],
    [700, 120]
  ),

  {
    ...wf.plaidNode("Start Lease Workflow", "/noop", "={{ '{}' }}", [920, 40]),
    name: "Start Lease Workflow",
    id: "start-lease-workflow",
    parameters: {
      method: "POST",
      url: "=__TUNNEL_URL__webhook/lease-create",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody:
        "={{ JSON.stringify({ ref_token: $('Parse Manager Action').first().json.ref_token }) }}",
      options: { timeout: 60000 },
    },
    credentials: undefined,
  },

  wf.telegramNode(
    "Confirm Decision Recorded",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "={{ $('Parse Manager Action').first().json.decision_label }} - " +
        "{{ $('Parse Manager Action').first().json.ref_token }} " +
        "by {{ $('Parse Manager Action').first().json.actor }}.\n\n" +
        "{{ $('Parse Manager Action').first().json.triggers_lease " +
        "? 'Preparing the lease for signature now.' " +
        ": 'No lease prepared. Nothing has been sent to the applicant.' }}",
    },
    [920, 220]
  ),
];

const connections = wf.connect({
  "Manager Actions (Telegram)": [["Parse Manager Action"]],
  "Parse Manager Action": [["Acknowledge Tap"]],
  "Acknowledge Tap": [["Load Application For Decision"]],
  "Load Application For Decision": [["Already Decided?"]],
  "Already Decided?": [["Notify: Already Actioned"], ["Record Decision"]],
  "Record Decision": [["Send Lease Now?"]],
  "Send Lease Now?": [["Start Lease Workflow"], ["Confirm Decision Recorded"]],
  "Start Lease Workflow": [["Confirm Decision Recorded"]],
});

const workflow = wf.buildWorkflow({
  id: "wf3-telegram-router",
  name: "WF3 Telegram Router",
  nodes,
  connections,
  active: true,
});

console.log(`wf3-telegram-router.json written, ${wf.writeWorkflow(workflow, OUT)} nodes`);
