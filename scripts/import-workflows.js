/**
 * Substitutes placeholders into committed workflow JSON and imports it into the
 * running n8n.
 *
 * Committed JSON carries placeholders only. Real credential ids, addresses, base
 * ids and URLs are resolved here into an ignored tmp/ copy. Nothing resolved is
 * ever written back to a committed file.
 *
 * Usage:
 *   node scripts/import-workflows.js                      all workflows
 *   node scripts/import-workflows.js wf1-leasing-front
 *   node scripts/import-workflows.js --dry-run wf1-leasing-front
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const {
  TELEGRAM_MANAGER: TELEGRAM_MANAGER_CREDENTIAL,
  TELEGRAM_PROSPECT: TELEGRAM_PROSPECT_CREDENTIAL,
} = require("./lib/credential-names");

const env = loadEnv();
const CONTAINER = "leasing-n8n";
const WORKFLOW_DIR = path.join(REPO_ROOT, "n8n-workflows");
const TMP_DIR = path.join(REPO_ROOT, "tmp");

const dryRun = process.argv.includes("--dry-run");
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", cwd: REPO_ROOT, ...options });
}

/**
 * Reads credential ids from n8n without ever decrypting credential data.
 *
 * Returns BOTH a type map and a name map. The type map cannot disambiguate the
 * two Telegram credentials - this project runs two bots, because Telegram
 * allows one webhook per bot and both the prospect assistant (WF1) and the
 * manager router (WF3) need a trigger. A last-wins type lookup would point both
 * placeholders at the same bot, and activating WF1 would then silently
 * re-register the manager bot's webhook onto WF1, killing every approval button
 * with no error anywhere. So telegram resolves by NAME.
 */
function resolveCredentialIds() {
  const script = [
    "n8n export:credentials --all --output=/home/node/.creds.json >/dev/null 2>&1",
    "node -e \"require('/home/node/.creds.json').forEach(c=>console.log(c.type+'|'+c.id+'|'+c.name))\"",
    "rm -f /home/node/.creds.json",
  ].join("; ");

  const out = docker(["compose", "exec", "-T", "n8n", "sh", "-lc", script], { stdio: "pipe" });
  const byType = {};
  const byName = {};
  for (const line of out.split(/\r?\n/)) {
    const [type, id, ...rest] = line.trim().split("|");
    const name = rest.join("|");
    if (!type || !id) continue;
    // First wins, not last: a silent overwrite is the failure mode described above.
    if (!byType[type]) byType[type] = id;
    if (name) byName[name] = id;
  }
  return { byType, byName };
}

function buildReplacements({ byType, byName }) {
  const tunnel = (env.TUNNEL_URL || "").replace(/\/?$/, "/");

  return {
    __POSTGRES_CREDENTIAL_ID__: byType.postgres,
    __OPENAI_CREDENTIAL_ID__: byType.openAiApi,
    __SMTP_CREDENTIAL_ID__: byType.smtp,
    __IMAP_CREDENTIAL_ID__: byType.imap,
    __AIRTABLE_CREDENTIAL_ID__: byType.airtableTokenApi,
    __PLAID_CREDENTIAL_ID__: byType.httpCustomAuth,
    __DOCUSIGN_CREDENTIAL_ID__: byType.jwtAuth,

    // Resolved by NAME, never by type. These names are load-bearing and must
    // match scripts/setup-credentials.js and scripts/lib/wf-common.js exactly.
    // There is deliberately no fallback to byType.telegramApi: an ambiguous
    // lookup is the thing being removed.
    __TELEGRAM_CREDENTIAL_ID__: byName[TELEGRAM_MANAGER_CREDENTIAL],
    __TELEGRAM_PROSPECT_CREDENTIAL_ID__: byName[TELEGRAM_PROSPECT_CREDENTIAL],

    __SYSTEM_EMAIL__: env.GMAIL_ADDRESS,
    __PROSPECT_EMAIL__: env.PROSPECT_GMAIL_ADDRESS,
    __TELEGRAM_CHAT_ID__: env.TELEGRAM_MANAGER_CHAT_ID,
    __AIRTABLE_BASE_ID__: env.AIRTABLE_BASE_ID,

    __TELEGRAM_BOT_TOKEN__: env.TELEGRAM_BOT_TOKEN,
    __TELEGRAM_PROSPECT_BOT_TOKEN__: env.TELEGRAM_PROSPECT_BOT_TOKEN,
    // Used to build the t.me deep link on the inquiry confirmation page.
    // Stored without the leading @.
    __TELEGRAM_PROSPECT_BOT_USERNAME__: (env.TELEGRAM_PROSPECT_BOT_USERNAME || "").replace(/^@/, ""),
    __TUNNEL_URL__: tunnel,

    __DOCUSIGN_INTEGRATION_KEY__: env.DOCUSIGN_INTEGRATION_KEY,
    __DOCUSIGN_USER_ID__: env.DOCUSIGN_USER_ID,
    __DOCUSIGN_ACCOUNT_ID__: env.DOCUSIGN_ACCOUNT_ID,
    __DOCUSIGN_AUTH_BASE__: env.DOCUSIGN_AUTH_BASE,
    __DOCUSIGN_BASE_PATH__: env.DOCUSIGN_BASE_PATH,

    __CALCOM_BOOKING_URL__: env.CALCOM_BOOKING_URL,
    __CALCOM_API_KEY__: env.CALCOM_API_KEY,
    __CALCOM_EVENT_TYPE_ID__: env.CALCOM_EVENT_TYPE_ID,
    __TOUR_TIMEZONE__: env.GENERIC_TIMEZONE || "America/New_York",
    // The application form lives in WF2. Until that exists, the tunnel-relative
    // path is still correct - n8n serves Form Triggers under /form/<path>.
    __APPLICATION_FORM_URL__:
      env.APPLICATION_FORM_URL || (tunnel ? `${tunnel}form/rental-application` : ""),
  };
}

function substitute(raw, replacements, name) {
  let out = raw;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!out.includes(placeholder)) continue;
    if (!value) {
      throw new Error(
        `${name} needs ${placeholder} but it could not be resolved.\n` +
          `  Set it in .env, or create the missing credential first.`
      );
    }
    out = out.split(placeholder).join(value);
  }

  const leftover = [...new Set(out.match(/__[A-Z_]+__/g) || [])];
  if (leftover.length) throw new Error(`${name} has unresolved placeholders: ${leftover.join(", ")}`);
  return out;
}

function importWorkflow(name, replacements) {
  const sourcePath = path.join(WORKFLOW_DIR, `${name}.json`);
  if (!fs.existsSync(sourcePath)) throw new Error(`missing ${path.relative(REPO_ROOT, sourcePath)}`);

  const resolved = substitute(fs.readFileSync(sourcePath, "utf8"), replacements, name);
  const parsed = JSON.parse(resolved);

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${name}.resolved.json`);
  // No BOM: the n8n CLI rejects one at the first character.
  fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), { encoding: "utf8" });

  if (dryRun) return { nodes: parsed.nodes.length, imported: false };

  const remote = `/home/node/.${name}.json`;
  docker(["compose", "exec", "-T", "n8n", "sh", "-lc", `cat > ${remote}`], {
    input: JSON.stringify(parsed, null, 2),
    stdio: ["pipe", "pipe", "pipe"],
  });

  docker(["compose", "exec", "-T", "n8n", "n8n", "import:workflow", `--input=${remote}`], {
    stdio: "pipe",
  });

  const shouldActivate = parsed.active !== false;
  docker(
    ["compose", "exec", "-T", "n8n", "n8n", "update:workflow", `--id=${parsed.id}`,
     `--active=${shouldActivate}`],
    { stdio: "pipe" }
  );

  try {
    docker(["compose", "exec", "-T", "n8n", "sh", "-lc", `rm -f ${remote}`], { stdio: "pipe" });
  } catch {
    /* cleanup is best effort */
  }

  return { nodes: parsed.nodes.length, imported: true, active: shouldActivate };
}

function main() {
  const targets = names.length
    ? names
    : fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

  if (!targets.length) {
    console.log("No workflows found in n8n-workflows/.");
    return;
  }

  // The dry-run proxy stands in for both lookup maps, so --dry-run still
  // exercises substitution without a running n8n.
  const dryProxy = new Proxy({}, { get: (_, k) => `dry-${String(k)}` });
  const credentials = dryRun
    ? { byType: dryProxy, byName: dryProxy }
    : resolveCredentialIds();
  const replacements = buildReplacements(credentials);

  const failures = [];
  for (const name of targets) {
    try {
      const result = importWorkflow(name, replacements);
      console.log(
        `  ${name}: ${result.nodes} nodes` +
          (result.imported ? `, imported and ${result.active ? "activated" : "left inactive"}` : ", dry run only")
      );
    } catch (error) {
      const detail = (error.stderr || error.message || "").toString().trim().split("\n").slice(0, 3).join("\n    ");
      failures.push(`  ${name}: ${detail}`);
    }
  }

  if (failures.length) {
    console.log(`\nFailed:\n${failures.join("\n")}`);
    process.exit(1);
  }

  if (!dryRun) {
    console.log(
      "\nCLI activation needs an n8n restart to take effect:\n" +
        "  docker compose restart n8n"
    );
  }
}

main();
