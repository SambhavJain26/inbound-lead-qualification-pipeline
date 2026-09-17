/**
 * Node factories for building workflow JSON.
 *
 * Committed workflow JSON carries placeholder credential ids only
 * (__POSTGRES_CREDENTIAL_ID__, ...). scripts/import-workflows.js resolves them
 * from the running n8n instance into an ignored tmp/ copy at import time, so no
 * local runtime identifier is ever committed.
 */

const fs = require("fs");
const path = require("path");
const CREDENTIAL_NAMES = require("./credential-names");

const PLACEHOLDER = {
  POSTGRES: "__POSTGRES_CREDENTIAL_ID__",
  OPENAI: "__OPENAI_CREDENTIAL_ID__",
  SMTP: "__SMTP_CREDENTIAL_ID__",
  IMAP: "__IMAP_CREDENTIAL_ID__",
  TELEGRAM: "__TELEGRAM_CREDENTIAL_ID__",
  TELEGRAM_PROSPECT: "__TELEGRAM_PROSPECT_CREDENTIAL_ID__",
  AIRTABLE: "__AIRTABLE_CREDENTIAL_ID__",
  PLAID: "__PLAID_CREDENTIAL_ID__",
  DOCUSIGN: "__DOCUSIGN_CREDENTIAL_ID__",
};

const CREDENTIAL = {
  postgres: { postgres: { id: PLACEHOLDER.POSTGRES, name: "Leasing Postgres" } },
  openai: { openAiApi: { id: PLACEHOLDER.OPENAI, name: "Leasing OpenAI" } },
  smtp: { smtp: { id: PLACEHOLDER.SMTP, name: "Leasing SMTP (outbound mail)" } },
  imap: { imap: { id: PLACEHOLDER.IMAP, name: "Leasing IMAP (inbound mail)" } },
  telegram: { telegramApi: { id: PLACEHOLDER.TELEGRAM, name: CREDENTIAL_NAMES.TELEGRAM_MANAGER } },
  telegramProspect: {
    telegramApi: { id: PLACEHOLDER.TELEGRAM_PROSPECT, name: CREDENTIAL_NAMES.TELEGRAM_PROSPECT },
  },
  airtable: { airtableTokenApi: { id: PLACEHOLDER.AIRTABLE, name: "Leasing Airtable (display mirror)" } },
  plaid: { httpCustomAuth: { id: PLACEHOLDER.PLAID, name: "Leasing Plaid Sandbox" } },
};

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function node(name, type, typeVersion, parameters, position, extra = {}) {
  return { id: slug(name), name, type, typeVersion, position, parameters, ...extra };
}

/**
 * Reads a library and strips its module.exports tail so it can be inlined into
 * a Code node. The libraries avoid backticks deliberately: template literals are
 * consumed before the code reaches the node.
 */
function inlineLib(name) {
  const source = fs.readFileSync(path.join(__dirname, name), "utf8");
  return source.replace(/if \(typeof module !== "undefined"\) \{[\s\S]*$/m, "").trimEnd();
}

/* ------------------------------------------------------------------ nodes */

/**
 * `errorOutput` gives the node a SECOND output carrying the failure, instead of
 * ending the run. Use it where a throw is correct but silence is not: the error
 * branch can still tell someone what happened. `continueOnFail` is the blunter
 * version - it merges failures back into the normal output.
 */
function codeNode(name, jsCode, position, options = {}) {
  const built = node(name, "n8n-nodes-base.code", 2, {
    mode: options.mode || "runOnceForAllItems",
    jsCode,
  }, position);
  if (options.continueOnFail) built.onError = "continueRegularOutput";
  if (options.errorOutput) built.onError = "continueErrorOutput";
  return built;
}

function postgresNode(name, query, position, options = {}) {
  const built = node(name, "n8n-nodes-base.postgres", 2.6, {
    operation: "executeQuery",
    query,
    options: options.queryOptions || {},
  }, position, { credentials: CREDENTIAL.postgres });
  if (options.continueOnFail) built.onError = "continueRegularOutput";
  if (options.alwaysOutputData) built.alwaysOutputData = true;
  return built;
}

/**
 * OpenAI Responses operation with JSON Schema structured output.
 *
 * gpt-5.6-luna rejects `temperature`, so it is never set here. `strict: true`
 * makes a schema violation an API error rather than a silently malformed reply,
 * which is what "fail visible" requires.
 */
function openAiNode(name, { model, instructions, content, schemaName, schema, maxTokens }, position) {
  return node(name, "@n8n/n8n-nodes-langchain.openAi", 2.3, {
    resource: "text",
    operation: "response",
    modelId: { __rl: true, mode: "id", value: model || "gpt-5.6-luna" },
    responses: { values: [{ type: "text", role: "user", content }] },
    simplify: true,
    options: {
      instructions,
      ...(maxTokens ? { maxTokens } : {}),
      // textOptions must be an OBJECT, not an array. The field's own default
      // shows an array, but the node reads `textFormat.textOptions.type`
      // directly - pass an array and the format is silently never sent, so the
      // model returns prose instead of JSON.
      textFormat: {
        textOptions: {
          type: "json_schema",
          name: schemaName,
          schema: JSON.stringify(schema, null, 2),
        },
      },
    },
  }, position, { credentials: CREDENTIAL.openai });
}

function imapTriggerNode(name, position, { customRules }) {
  return node(name, "n8n-nodes-base.emailReadImap", 2, {
    format: "simple",
    options: {
      customEmailConfig: customRules,
      // Marks handled mail as read so it is not picked up twice.
      forceReconnect: 60,
    },
  }, position, { credentials: CREDENTIAL.imap });
}

function emailSendNode(name, { fromEmail, toEmail, subject, text }, position) {
  return node(name, "n8n-nodes-base.emailSend", 2.1, {
    fromEmail,
    toEmail,
    subject,
    emailFormat: "text",
    text,
    // n8n appends "This email was sent automatically with n8n" unless this is
    // off. Fine for internal alerts, wrong for prospect-facing mail.
    options: { appendAttribution: false },
  }, position, { credentials: CREDENTIAL.smtp });
}

/**
 * Which bot a Telegram node talks through.
 *
 * "manager" is the WF3 router bot and every manager-facing alert. "prospect" is
 * the leasing assistant the renter chats with. They MUST be different bots:
 * Telegram allows one webhook per bot, so two triggers on one token means the
 * second registration silently evicts the first.
 *
 * Defaults to manager so every pre-existing call site is unchanged.
 */
function telegramCredential(bot) {
  if (bot === undefined || bot === "manager") return CREDENTIAL.telegram;
  if (bot === "prospect") return CREDENTIAL.telegramProspect;
  throw new Error('telegram bot must be "manager" or "prospect", got ' + JSON.stringify(bot));
}

/**
 * `failOnError` decides what a failed send means.
 *
 * Manager alerts swallow errors: a Telegram blip must not take down a pipeline
 * run, and the state is in Postgres either way. But a message to the PROSPECT
 * is the product, and the node after it writes a message_log row saying the
 * message went out - so a swallowed failure there would record a message the
 * renter never received. Those fail visibly, like the emailSend nodes on the
 * equivalent email path already do.
 */
function telegramNode(name, { chatId, text, bot, failOnError }, position) {
  const built = node(name, "n8n-nodes-base.telegram", 1.2, {
    chatId,
    text,
    // parse_mode is ALWAYS sent by this node, so text is parsed for entities
    // whether you ask for it or not. Left at its legacy Markdown default, a
    // single underscore - the one in a "?ref_token=" link, say - opens an
    // italic run that never closes and Telegram rejects the entire message
    // with a bare "Bad request - please check your parameters". Pin it to HTML
    // and escape & < > with escapeTelegramHtml() wherever the text is built.
    additionalFields: { appendAttribution: false, parse_mode: "HTML" },
  }, position, { credentials: telegramCredential(bot) });
  if (!failOnError) built.onError = "continueRegularOutput";
  return built;
}

/**
 * Telegram Trigger. Only ONE may be active per bot token.
 *
 * n8n derives the webhook secret itself as `${workflowId}_${nodeId}` with
 * anything outside [A-Za-z0-9_-] stripped, and Telegram sends it back as
 * X-Telegram-Bot-Api-Secret-Token. Any script posting a synthetic update has to
 * compute the same string for THIS workflow and THIS node or it gets a bare 403.
 *
 * Activating one of these registers a webhook on the bot, which disables
 * getUpdates - so get-telegram-chat-id.js stops working for that bot until the
 * workflow is deactivated.
 */
function telegramTriggerNode(name, position, { bot, updates, webhookId } = {}) {
  return node(name, "n8n-nodes-base.telegramTrigger", 1.2, {
    updates: updates || ["message"],
    additionalFields: {},
  }, position, { credentials: telegramCredential(bot), webhookId: webhookId || slug(name) });
}

/**
 * Telegram message carrying inline buttons.
 *
 * `replyMarkup` is a top-level enum and the buttons come from this fixed
 * collection. A JSON string in additionalFields.reply_markup is ignored and the
 * card posts with no buttons at all, so keep one node per card layout and drive
 * callback_data with an expression.
 *
 * callback_data is capped at 64 bytes; a short prefix plus a ref token is ~12.
 */
function telegramCardNode(name, { chatId, text, buttonRows, bot, failOnError }, position) {
  const built = node(name, "n8n-nodes-base.telegram", 1.2, {
    chatId,
    text,
    replyMarkup: "inlineKeyboard",
    inlineKeyboard: {
      rows: buttonRows.map((row) => ({
        row: {
          buttons: row.map((button) => ({
            text: button.text,
            additionalFields: { callback_data: button.callbackData },
          })),
        },
      })),
    },
    additionalFields: { appendAttribution: false, parse_mode: "HTML" },
  }, position, { credentials: telegramCredential(bot) });
  if (!failOnError) built.onError = "continueRegularOutput";
  return built;
}

/** Authenticated local workflow handoff. */
function internalActionNode(name, url, body, position, { authenticate = true, continueOnFail = false } = {}) {
  const built = node(name, 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'POST', url, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: body,
    ...(authenticate ? { sendHeaders: true, headerParameters: { parameters: [
      { name: 'X-Leasing-Action-Secret', value: '__INTERNAL_ACTION_SECRET__' }
    ] } } : {}), options: { timeout: 60000 },
  }, position);
  if (continueOnFail) built.onError = 'continueRegularOutput';
  return built;
}

function internalGuardCode() {
  return "const j=$input.first().json; if(j.headers?.['x-leasing-action-secret']!=='__INTERNAL_ACTION_SECRET__') throw new Error('Unauthorized internal action'); return $input.all();";
}

/** HTTP Request against Plaid Sandbox, authenticated by the header credential. */
function plaidNode(name, endpoint, bodyExpression, position) {
  return node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
    url: `https://sandbox.plaid.com${endpoint}`,
    // Custom Auth is a GENERIC credential type, not a predefined one. Declaring
    // it as predefined silently applies no auth at all, and Plaid answers
    // MISSING_FIELDS for client_id and secret as though they were never sent.
    authentication: "genericCredentialType",
    genericAuthType: "httpCustomAuth",
    sendBody: true,
    contentType: "json",
    specifyBody: "json",
    jsonBody: bodyExpression,
    options: { timeout: 30000 },
  }, position, { credentials: CREDENTIAL.plaid });
}

/**
 * n8n-hosted form.
 *
 * Built from scratch rather than from webhookNode: a Form Trigger registers two
 * webhooks (the page and the submission), and leftover webhook-only parameters
 * such as httpMethod stop the POST one from registering at all - the form page
 * still renders, so it looks fine until a submission silently 404s.
 */
function formTriggerNode(name, { formPath, title, description, fields, customCss, buttonLabel, version = 2.2 }, position) {
  const options = {};
  // Without this n8n stamps its own attribution on the form the prospect sees.
  options.appendAttribution = false;
  if (customCss) options.customCss = customCss;
  if (buttonLabel) options.buttonLabel = buttonLabel;

  return node(name, "n8n-nodes-base.formTrigger", version, {
    path: formPath,
    formTitle: title,
    formDescription: description,
    formFields: { values: fields },
    options,
  }, position, { webhookId: formPath });
}

/**
 * Form Trigger CSS, derived from the listing site's own palette.
 *
 * The prospect taps through from a Telegram message to this form having just
 * been on the listing site, so stock n8n chrome is a visible seam. Kept as a
 * small hand-written override rather than the whole site stylesheet: the form
 * markup is n8n's, so most of site-assets/styles.css would not apply anyway.
 */
const FORM_CSS = [
  ":root {",
  "  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;",
  "  --color-background: #f7f6f3;",
  "  --color-card-bg: #ffffff;",
  "  --color-card-border: #e3e6ea;",
  "  --color-card-shadow: rgba(28, 36, 48, 0.06);",
  "  --color-header-text: #1c2430;",
  "  --color-description-text: #5a6675;",
  "  --color-label: #5a6675;",
  "  --color-input-border: #e3e6ea;",
  "  --color-input-text: #1c2430;",
  "  --color-focus-border: #1f6f5c;",
  "  --color-submit-btn-bg: #1f6f5c;",
  "  --color-submit-btn-text: #ffffff;",
  "  --color-link: #1f6f5c;",
  "}",
  ".card { border-radius: 10px; }",
  "h1 { letter-spacing: -0.02em; }",
].join("\n");

function webhookNode(name, urlPath, position, options = {}) {
  const parameters = {
    httpMethod: options.method || "POST",
    path: urlPath,
    responseMode: options.responseMode || "lastNode",
    options: options.webhookOptions || {},
  };
  // responseData only means anything in lastNode mode. In responseNode mode a
  // Respond To Webhook node owns the response, and a leftover response
  // parameter is the same failure class as the Form Trigger note above: the
  // node registers in a way you did not intend and nothing says so.
  if (parameters.responseMode === "lastNode") {
    parameters.responseData = options.responseData || "allEntries";
  }
  return node(name, "n8n-nodes-base.webhook", 2.1, parameters, position, { webhookId: urlPath });
}

/**
 * Returns an HTML page from a webhook, for a form post the browser navigates to.
 *
 * `respondWith: "text"` not "json" - json sets application/json and the browser
 * downloads the page instead of rendering it. "text" alone defaults to
 * text/plain, so the Content-Type header is still required.
 *
 * The status code is a LITERAL on purpose. Respond-to-webhook status-code
 * expressions are unreliable, so branch to one Respond node per status rather
 * than computing one.
 *
 * Pass bodyExpression as a single-variable expression pointing at HTML built in
 * a Code node, so quoting and newlines never reach the expression parser.
 */
function respondHtmlNode(name, { bodyExpression, statusCode }, position) {
  return node(name, "n8n-nodes-base.respondToWebhook", 1.1, {
    respondWith: "text",
    responseBody: bodyExpression,
    options: {
      responseCode: statusCode || 200,
      responseHeaders: {
        entries: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
      },
    },
  }, position);
}

function ifNode(name, conditions, position) {
  return node(name, "n8n-nodes-base.if", 2.2, {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
      conditions,
      combinator: "and",
    },
    options: {},
  }, position);
}

/** Boolean condition helper. Strict IF nodes reject truthy strings. */
function booleanCondition(leftValue, expected = true) {
  return {
    id: slug(String(leftValue)).slice(0, 30),
    leftValue,
    rightValue: expected,
    operator: { type: "boolean", operation: expected ? "true" : "false", singleValue: true },
  };
}

/**
 * Airtable mirror write. Fire-and-forget by design: Postgres is the system of
 * record, so a capped or failing mirror must never stop the pipeline.
 */
/**
 * Fire-and-forget mirror write to the Airtable display board.
 *
 * Pass `upsertOn` (a field name) to use Airtable's native upsert: PATCH with
 * `performUpsert.fieldsToMergeOn`. Without it every write CREATES a row, so a
 * lead mirrored at more than one phase boundary appears several times on the
 * board. The native upsert is one call and needs no read-back, which matters -
 * Postgres is the system of record and Airtable state is never read back.
 */
function airtableMirrorNode(name, { tableName, bodyExpression, upsertOn }, position) {
  const built = node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: upsertOn ? "PATCH" : "POST",
    url: `=https://api.airtable.com/v0/__AIRTABLE_BASE_ID__/${tableName}`,
    authentication: "predefinedCredentialType",
    nodeCredentialType: "airtableTokenApi",
    sendBody: true,
    contentType: "json",
    specifyBody: "json",
    jsonBody: bodyExpression,
    options: { timeout: 10000 },
  }, position, { credentials: CREDENTIAL.airtable });
  built.onError = "continueRegularOutput";
  built.retryOnFail = false;
  return built;
}

/* ------------------------------------------------------------- assembly */

function buildWorkflow({ id, name, nodes, connections, active = true, settings = {} }) {
  return {
    id,
    name,
    active,
    nodes,
    connections,
    settings: { executionOrder: "v1", ...settings },
    tags: [],
  };
}

/** connections[from] = [[{node, type, index}]] - one entry per output branch. */
function connect(pairs) {
  const connections = {};
  for (const [from, outputs] of Object.entries(pairs)) {
    connections[from] = {
      main: outputs.map((targets) =>
        (Array.isArray(targets) ? targets : [targets])
          .filter(Boolean)
          .map((target) => ({ node: target, type: "main", index: 0 }))
      ),
    };
  }
  return connections;
}

/** Parses every Code node before the JSON is written; a syntax error here would
 *  otherwise surface as an opaque runtime failure inside n8n. */
function validateCodeNodes(nodes) {
  const vm = require("vm");
  for (const n of nodes) {
    if (n.type !== "n8n-nodes-base.code") continue;
    try {
      // n8n wraps a Code node body in an async function, so a top-level return
      // is legal there. Parse it in the same shape or every node looks broken.
      new vm.Script(`(async function(){\n${n.parameters.jsCode}\n})`);
    } catch (error) {
      throw new Error(`Code node "${n.name}" has a syntax error: ${error.message}`);
    }
  }
}

/**
 * Every `$('Node Name')` reference must name a node that exists.
 *
 * Renaming a node and missing one reference is invisible until that branch
 * actually runs, and then it fails with "Node 'X' hasn't been executed" - which
 * reads like a wiring problem rather than a typo. Worse, a reference can point
 * at a REAL node on a different branch, which only fails on the runs where that
 * branch did not execute. Catching it at build time costs nothing.
 */
function validateNodeReferences(nodes) {
  const known = new Set(nodes.map((n) => n.name));
  const problems = [];

  for (const n of nodes) {
    const haystack = JSON.stringify(n.parameters || {});
    const matches = haystack.match(/\$\(\\?['"]([^'"\\]+)\\?['"]\)/g) || [];
    for (const raw of matches) {
      const name = raw.replace(/^\$\(\\?['"]/, "").replace(/\\?['"]\)$/, "");
      if (!known.has(name)) problems.push(`"${n.name}" references unknown node "${name}"`);
    }
  }

  if (problems.length) {
    throw new Error("Unresolvable node references:\n  " + [...new Set(problems)].join("\n  "));
  }
}

function writeWorkflow(workflow, outPath) {
  validateCodeNodes(workflow.nodes);
  validateNodeReferences(workflow.nodes);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // No BOM: the n8n CLI rejects one at the first character.
  fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), { encoding: "utf8" });
  return workflow.nodes.length;
}

module.exports = {
  slugFor: slug,
  PLACEHOLDER,
  CREDENTIAL,
  inlineLib,
  codeNode,
  postgresNode,
  openAiNode,
  imapTriggerNode,
  emailSendNode,
  telegramNode,
  telegramCardNode,
  telegramTriggerNode,
  telegramCredential,
  internalActionNode,
  internalGuardCode,
  respondHtmlNode,
  plaidNode,
  webhookNode,
  formTriggerNode,
  FORM_CSS,
  ifNode,
  booleanCondition,
  airtableMirrorNode,
  buildWorkflow,
  connect,
  writeWorkflow,
};
