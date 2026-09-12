/**
 * Serves the generated listing site on http://localhost:8080.
 *
 * Zero dependencies, like everything else in scripts/ - node's own http and fs
 * are enough for a few static files, and adding a container or an npm package
 * for this would be the only new infrastructure in the whole project.
 *
 * Deliberately NOT tunnelled. A cloudflared quick tunnel maps one origin and
 * that origin has to stay n8n. Only the operator's browser needs the site; the
 * Telegram handoff works from any device because t.me links are public.
 *
 * Usage:
 *   node scripts/serve-listing-site.js            # foreground
 *   node scripts/serve-listing-site.js --detach   # background, pid file in TEMP
 *   node scripts/serve-listing-site.js --stop
 */

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { REPO_ROOT } = require("./lib/env");

const ROOT = path.join(REPO_ROOT, "data", "listing-site");
const PORT = Number(process.env.LISTING_SITE_PORT || 8080);
const PID_PATH = path.join(os.tmpdir(), "leasing-listing-site.pid");
const LOG_PATH = path.join(os.tmpdir(), "leasing-listing-site.log");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function stopExisting() {
  if (!fs.existsSync(PID_PATH)) return false;
  const pid = Number(fs.readFileSync(PID_PATH, "utf8").trim());
  fs.unlinkSync(PID_PATH);
  if (!pid) return false;
  try {
    process.kill(pid);
    console.log(`Stopped listing site (pid ${pid}).`);
    return true;
  } catch {
    return false; // already gone
  }
}

/**
 * Resolves a URL path to a file inside ROOT, or null.
 * The realpath check is what stops ../ escaping the site directory.
 */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const target = path.resolve(ROOT, rel);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
  return target;
}

function serve() {
  if (!fs.existsSync(ROOT)) {
    console.error("data/listing-site does not exist yet.");
    console.error("Build it first:  node scripts/build-listing-site.js");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const file = resolve(req.url || "/");
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><meta charset="utf-8"><p>Not found. <a href="/">Back to listings</a>.</p>');
      console.log(`  404 ${req.method} ${req.url}`);
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    // No caching: the site is regenerated between takes and a cached page
    // showing a leased unit as available would be a bad surprise on camera.
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
    console.log(`  200 ${req.method} ${req.url}`);
  });

  server.listen(PORT, () => {
    console.log(`Listing site on http://localhost:${PORT}`);
    console.log(`  serving ${ROOT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      console.error("Stop the other server, or set LISTING_SITE_PORT to something else.");
      process.exit(1);
    }
    throw err;
  });
}

function detach() {
  stopExisting();
  const log = fs.openSync(LOG_PATH, "a");
  const child = spawn(process.execPath, [__filename], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  fs.writeFileSync(PID_PATH, String(child.pid), "utf8");
  console.log(`Listing site started in the background (pid ${child.pid}).`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  log:  ${LOG_PATH}`);
  console.log(`  stop: node scripts/serve-listing-site.js --stop`);
}

function main() {
  if (process.argv.includes("--stop")) {
    if (!stopExisting()) console.log("No listing site process was running.");
    return;
  }
  if (process.argv.includes("--detach")) return detach();
  serve();
}

main();
