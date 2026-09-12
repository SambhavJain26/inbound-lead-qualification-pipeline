/**
 * Creates n8n credentials from the values in .env, so they never have to be
 * typed into the n8n UI by hand.
 *
 * Each credential is imported on its own and reported separately, so one
 * failure never blocks the rest. Re-running is safe: an existing credential
 * with the same id is overwritten with the current .env values.
 *
 * Email uses SMTP/IMAP with an app password, so every credential in the
 * project is scriptable. Nothing has to be created in the n8n UI.
 *
 * Usage:
 *   node scripts/setup-credentials.js
 *   node scripts/setup-credentials.js postgres openai     (subset by name)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const CONTAINER = "leasing-n8n";
const env = loadEnv();

/**
 * Fixed ids so committed workflow JSON can reference credentials by a stable
 * placeholder and the import script can substitute predictably.
 */
const DEFINITIONS = [
  {
    name: "postgres",
    id: "leasing-postgres",
    displayName: "Leasing Postgres",
    type: "postgres",
    requires: ["POSTGRES_PASSWORD"],
    build: () => ({
      // 'postgres' is the service name on the compose network. From inside the
      // n8n container, localhost is the n8n container itself.
      host: "postgres",
      port: 5432,
      database: env.POSTGRES_DB || "leasing",
      user: env.POSTGRES_USER || "leasing",
      password: env.POSTGRES_PASSWORD,
      ssl: "disable",
    }),
  },
  {
    name: "smtp",
    id: "leasing-smtp",
    displayName: "Leasing SMTP (outbound mail)",
    type: "smtp",
    requires: ["GMAIL_ADDRESS", "GMAIL_APP_PASSWORD"],
    build: () => ({
      user: env.GMAIL_ADDRESS,
      password: env.GMAIL_APP_PASSWORD,
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: Number(env.SMTP_PORT || 465),
      secure: String(env.SMTP_PORT || 465) === "465",
      disableStartTls: false,
    }),
  },
  {
    name: "imap",
    id: "leasing-imap",
    displayName: "Leasing IMAP (inbound mail)",
    type: "imap",
    requires: ["GMAIL_ADDRESS", "GMAIL_APP_PASSWORD"],
    build: () => ({
      user: env.GMAIL_ADDRESS,
      password: env.GMAIL_APP_PASSWORD,
      host: env.IMAP_HOST || "imap.gmail.com",
      port: Number(env.IMAP_PORT || 993),
      secure: true,
      allowUnauthorizedCerts: false,
    }),
  },
  {
    name: "openai",
    id: "leasing-openai",
    displayName: "Leasing OpenAI",
    type: "openAiApi",
    requires: ["OPENAI_API_KEY"],
    build: () => ({ apiKey: env.OPENAI_API_KEY }),
  },
  {
    name: "telegram",
    id: "leasing-telegram",
    displayName: "Leasing Telegram",
    type: "telegramApi",
    requires: ["TELEGRAM_BOT_TOKEN"],
    build: () => ({ accessToken: env.TELEGRAM_BOT_TOKEN }),
  },
  {
    name: "airtable",
    id: "leasing-airtable",
    displayName: "Leasing Airtable (display mirror)",
    type: "airtableTokenApi",
    requires: ["AIRTABLE_PAT"],
    // The field is `accessToken`, not `apiKey`. Credential field names differ
    // per type - check the credential definition rather than assuming. Storing
    // it under the wrong key leaves the token empty and every request fails with
    // "Authorization failed - please check your credentials", which reads like a
    // bad token rather than a missing one.
    build: () => ({ accessToken: env.AIRTABLE_PAT }),
  },
  {
    name: "calcom",
    id: "leasing-calcom",
    displayName: "Leasing Cal.com",
    type: "calApi",
    requires: ["CALCOM_API_KEY"],
    build: () => ({ apiKey: env.CALCOM_API_KEY }),
  },
  {
    name: "plaid",
    id: "leasing-plaid",
    displayName: "Leasing Plaid Sandbox",
    // Plaid accepts client id and secret as headers. httpCustomAuth allows the
    // two headers a plain httpHeaderAuth credential cannot express.
    type: "httpCustomAuth",
    requires: ["PLAID_CLIENT_ID", "PLAID_SANDBOX_SECRET"],
    build: () => ({
      json: JSON.stringify({
        headers: {
          "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
          "PLAID-SECRET": env.PLAID_SANDBOX_SECRET,
          "Content-Type": "application/json",
        },
      }),
    }),
  },
  {
    name: "docusign",
    id: "leasing-docusign-jwt",
    displayName: "Leasing DocuSign JWT signing key",
    // The JWT node signs the DocuSign assertion with this RSA key; the signed
    // assertion is exchanged for an access token by an HTTP Request node.
    type: "jwtAuth",
    requires: ["DOCUSIGN_INTEGRATION_KEY"],
    optional: true,
    build: () => {
      const keyPath = path.join(REPO_ROOT, env.DOCUSIGN_PRIVATE_KEY_PATH || "docusign-private.key");
      if (!fs.existsSync(keyPath)) {
        throw new Error(`private key not found at ${path.relative(REPO_ROOT, keyPath)}`);
      }
      return {
        keyType: "pemKey",
        privateKey: fs.readFileSync(keyPath, "utf8"),
        publicKey: "",
        algorithm: "RS256",
      };
    },
  },
];

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", cwd: REPO_ROOT, ...options });
}

function containerRunning() {
  try {
    return docker(["inspect", "-f", "{{.State.Running}}", CONTAINER]).trim() === "true";
  } catch {
    return false;
  }
}

function importCredential(def) {
  const payload = [
    {
      id: def.id,
      name: def.displayName,
      type: def.type,
      data: def.build(),
    },
  ];

  // Piped in over stdin rather than `docker cp`, which writes as root and leaves
  // a file the in-container `node` user cannot delete. Written without a BOM:
  // the n8n CLI rejects one at the first character.
  const json = JSON.stringify(payload, null, 2);
  const remotePath = `/home/node/.cred-${def.name}.json`;

  docker(["compose", "exec", "-T", "n8n", "sh", "-lc", `cat > ${remotePath}`], {
    input: json,
    stdio: ["pipe", "pipe", "pipe"],
  });

  try {
    docker(
      ["compose", "exec", "-T", "n8n", "n8n", "import:credentials", `--input=${remotePath}`],
      { stdio: "pipe" }
    );
  } finally {
    // Best effort: the credential is already imported, so a cleanup failure is
    // not an import failure.
    try {
      docker(["compose", "exec", "-T", "n8n", "sh", "-lc", `rm -f ${remotePath}`], { stdio: "pipe" });
    } catch {
      /* ignore */
    }
  }
}

function main() {
  if (!containerRunning()) {
    console.error(`${CONTAINER} is not running. Start it with:\n  docker compose up -d`);
    process.exit(1);
  }

  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const targets = only.length ? DEFINITIONS.filter((d) => only.includes(d.name)) : DEFINITIONS;

  if (!targets.length) {
    console.error(`No match. Available: ${DEFINITIONS.map((d) => d.name).join(", ")}`);
    process.exit(1);
  }

  const done = [];
  const skipped = [];
  const failed = [];

  for (const def of targets) {
    const missing = def.requires.filter((key) => !env[key]);
    if (missing.length) {
      skipped.push(`${def.name} - not set in .env: ${missing.join(", ")}`);
      continue;
    }

    try {
      importCredential(def);
      done.push(`${def.name} -> "${def.displayName}" (${def.type})`);
    } catch (error) {
      const detail = (error.stderr || error.message || "").toString().trim().split("\n").pop();
      failed.push(`${def.name} - ${detail}`);
    }
  }

  if (done.length) console.log(`\nImported ${done.length}:\n  ${done.join("\n  ")}`);
  if (skipped.length) console.log(`\nSkipped ${skipped.length}:\n  ${skipped.join("\n  ")}`);
  if (failed.length) console.log(`\nFailed ${failed.length}:\n  ${failed.join("\n  ")}`);

  console.log("\nEvery credential is scripted - nothing needs the n8n UI.");
  if (failed.length) process.exit(1);
}

main();
