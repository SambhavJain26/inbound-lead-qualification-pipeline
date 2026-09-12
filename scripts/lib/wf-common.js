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

const PLACEHOLDER = {
  POSTGRES: "__POSTGRES_CREDENTIAL_ID__",
  OPENAI: "__OPENAI_CREDENTIAL_ID__",
  SMTP: "__SMTP_CREDENTIAL_ID__",
  IMAP: "__IMAP_CREDENTIAL_ID__",
  TELEGRAM: "__TELEGRAM_CREDENTIAL_ID__",
  AIRTABLE: "__AIRTABLE_CREDENTIAL_ID__",
  PLAID: "__PLAID_CREDENTIAL_ID__",
  DOCUSIGN: "__DOCUSIGN_CREDENTIAL_ID__",
};

const CREDENTIAL = {
  postgres: { postgres: { id: PLACEHOLDER.POSTGRES, name: "Leasing Postgres" } },
  openai: { openAiApi: { id: PLACEHOLDER.OPENAI, name: "Leasing OpenAI" } },
  smtp: { smtp: { id: PLACEHOLDER.SMTP, name: "Leasing SMTP (outbound mail)" } },
  imap: { imap: { id: PLACEHOLDER.IMAP, name: "Leasing IMAP (inbound mail)" } },
  telegram: { telegramApi: { id: PLACEHOLDER.TELEGRAM, name: "Leasing Telegram" } },
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

function codeNode(name, jsCode, position, options = {}) {
  const built = node(name, "n8n-nodes-base.code", 2, {
    mode: options.mode || "runOnceForAllItems",
    jsCode,
  }, position);
  if (options.continueOnFail) built.onError = "continueRegularOutput";
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

function telegramNode(name, { chatId, text }, position) {
  const built = node(name, "n8n-nodes-base.telegram", 1.2, {
    chatId,
    text,
    additionalFields: { appendAttribution: false },
  }, position, { credentials: CREDENTIAL.telegram });
  built.onError = "continueRegularOutput";
  return built;
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
function telegramCardNode(name, { chatId, text, buttonRows }, position) {
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
    additionalFields: { appendAttribution: false },
  }, position, { credentials: CREDENTIAL.telegram });
  built.onError = "continueRegularOutput";
  return built;
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
function formTriggerNode(name, { formPath, title, description, fields }, position) {
  return node(name, "n8n-nodes-base.formTrigger", 2.2, {
    path: formPath,
    formTitle: title,
    formDescription: description,
    formFields: { values: fields },
    options: {},
  }, position, { webhookId: formPath });
}

function webhookNode(name, urlPath, position, options = {}) {
  return node(name, "n8n-nodes-base.webhook", 2.1, {
    httpMethod: options.method || "POST",
    path: urlPath,
    responseMode: options.responseMode || "lastNode",
    responseData: "allEntries",
    options: {},
  }, position, { webhookId: urlPath });
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
function airtableMirrorNode(name, { tableName, bodyExpression }, position) {
  const built = node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
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

function writeWorkflow(workflow, outPath) {
  validateCodeNodes(workflow.nodes);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // No BOM: the n8n CLI rejects one at the first character.
  fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), { encoding: "utf8" });
  return workflow.nodes.length;
}

module.exports = {
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
  plaidNode,
  webhookNode,
  formTriggerNode,
  ifNode,
  booleanCondition,
  airtableMirrorNode,
  buildWorkflow,
  connect,
  writeWorkflow,
};
