/**
 * Derives the secret header n8n registers with Telegram for a Telegram Trigger.
 *
 * n8n computes it as `${workflowId}_${nodeId}` with anything outside
 * [A-Za-z0-9_-] stripped, and Telegram sends it back as
 * X-Telegram-Bot-Api-Secret-Token on every update. A posted update without the
 * right value gets a bare 403 with no explanation, which is a genuinely
 * confusing hour to lose.
 *
 * There are TWO triggers in this project - WF1's prospect conversation and
 * WF3's manager router, on two different bots - so the secret must be derived
 * per workflow and per node, never hardcoded and never shared.
 *
 * Read from the committed workflow JSON rather than hardcoded so renaming a
 * node cannot silently break the scripted drivers.
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT } = require("./env");

function loadWorkflow(workflowName) {
  const file = path.join(REPO_ROOT, "n8n-workflows", `${workflowName}.json`);
  if (!fs.existsSync(file)) throw new Error(`missing n8n-workflows/${workflowName}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * @param {string} workflowName  e.g. "wf1-leasing-front"
 * @param {string} [nodeName]    which trigger, when a workflow has more than one
 * @returns {{ secret: string, webhookId: string, nodeName: string }}
 */
function telegramTrigger(workflowName, nodeName) {
  const workflow = loadWorkflow(workflowName);
  const triggers = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.telegramTrigger");

  if (!triggers.length) throw new Error(`no Telegram Trigger in ${workflowName}`);
  const trigger = nodeName ? triggers.find((n) => n.name === nodeName) : triggers[0];
  if (!trigger) {
    throw new Error(
      `no Telegram Trigger named "${nodeName}" in ${workflowName}. ` +
        `Found: ${triggers.map((n) => n.name).join(", ")}`
    );
  }
  if (!nodeName && triggers.length > 1) {
    throw new Error(
      `${workflowName} has ${triggers.length} Telegram Triggers - name the one you mean`
    );
  }

  return {
    secret: `${workflow.id}_${trigger.id}`.replace(/[^a-zA-Z0-9_-]+/g, ""),
    webhookId: trigger.webhookId,
    nodeName: trigger.name,
  };
}

module.exports = { telegramTrigger };
