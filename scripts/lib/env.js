/**
 * Minimal .env reader/writer shared by the setup scripts.
 *
 * No dependency on dotenv so the scripts run on a clean checkout with no
 * npm install step.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const ENV_PATH = path.join(REPO_ROOT, ".env");

function loadEnv(required = []) {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(".env not found. Copy .env.example to .env first.");
  }

  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `Missing in .env: ${missing.join(", ")}\nSee docs/stage-1-setup.md for where each value comes from.`
    );
  }

  return env;
}

/** Rewrites a single key in .env in place, preserving comments and order. */
function setEnvValue(key, value) {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const pattern = new RegExp(`^(\\s*${key}\\s*=).*$`, "m");

  const updated = pattern.test(raw)
    ? raw.replace(pattern, `$1${value}`)
    : `${raw.replace(/\s*$/, "")}\n${key}=${value}\n`;

  fs.writeFileSync(ENV_PATH, updated, "utf8");
}

module.exports = { REPO_ROOT, ENV_PATH, loadEnv, setEnvValue };
