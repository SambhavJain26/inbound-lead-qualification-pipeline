/**
 * Generates the local secrets that do not come from an external account and
 * writes them into .env: the n8n credential encryption key and the Postgres
 * password.
 *
 * Safe to re-run: it refuses to overwrite a value that is already set, because
 * changing N8N_ENCRYPTION_KEY makes every stored credential unreadable and
 * changing POSTGRES_PASSWORD locks you out of an existing volume.
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --force-encryption-key   (only on a clean n8n volume)
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { REPO_ROOT, ENV_PATH, loadEnv, setEnvValue } = require("./lib/env");

if (!fs.existsSync(ENV_PATH)) {
  fs.copyFileSync(path.join(REPO_ROOT, ".env.example"), ENV_PATH);
  console.log("Created .env from .env.example");
}

const env = loadEnv();
const force = process.argv.includes("--force-encryption-key");

function ensure(key, generate, warning) {
  if (env[key] && !(key === "N8N_ENCRYPTION_KEY" && force)) {
    console.log(`  ${key} already set, leaving it alone`);
    return;
  }
  if (env[key] && force) console.log(`  ${key} being regenerated (--force)`);

  setEnvValue(key, generate());
  console.log(`  ${key} generated`);
  if (warning) console.log(`    ${warning}`);
}

console.log("Local secrets:");

ensure(
  "N8N_ENCRYPTION_KEY",
  () => crypto.randomBytes(32).toString("hex"),
  "Never change this once credentials exist - they become unreadable."
);

ensure(
  "POSTGRES_PASSWORD",
  () => crypto.randomBytes(18).toString("base64url"),
  "Changing this later requires wiping the postgres_data volume."
);

console.log("\nDone. Next: fill the CREDENTIALS block in .env (see docs/stage-1-setup.md).");
