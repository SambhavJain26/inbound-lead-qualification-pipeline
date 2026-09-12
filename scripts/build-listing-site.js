/**
 * Generates the demo listing website from the `units` rows in Postgres.
 *
 * The site is the front door of the demo: a prospect browses listings, opens a
 * unit, and submits the contact form, which creates the lead and hands them to
 * the leasing assistant on Telegram.
 *
 * Why generated from Postgres rather than hand-written HTML: the listing a
 * prospect reads and the facts the assistant is allowed to quote then come from
 * one record and cannot drift apart. "Every number on that page and every
 * number in the reply came out of the same row" is a demo beat.
 *
 * THE CONTACT FORM POSTS TO localhost:5678, NOT THE TUNNEL.
 * A native form POST is a top-level navigation, so there is no CORS preflight
 * and the browser renders the HTML that n8n returns - which is the whole point
 * of the Telegram handoff page. Two consequences:
 *   - the site does NOT need rebuilding when the tunnel hostname changes; only
 *     when unit content changes
 *   - do not convert the form to fetch(). Cross-origin (:8080 -> :5678) would
 *     then need `allowedOrigins` on the webhook, and the returned HTML page
 *     would be pointless because nothing would render it.
 *
 * Photos: drop real files into site-assets/ named after the photo keys in
 * fixtures/demo-data.js (MAPLE-2B-1.jpg and so on). Anything missing gets a
 * generated SVG placeholder, so the site always renders. See docs/listing-site.md.
 *
 * Usage:
 *   node scripts/build-listing-site.js
 *   node scripts/build-listing-site.js --from-fixtures   # skip Postgres
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv();
const OUT_DIR = path.join(REPO_ROOT, "data", "listing-site");
const IMG_DIR = path.join(OUT_DIR, "img");
const ASSET_DIR = path.join(REPO_ROOT, "site-assets");

/** Where the contact form posts. Local n8n, deliberately not the tunnel. */
const N8N_PORT = env.N8N_PORT || "5678";
const FORM_ACTION = `http://localhost:${N8N_PORT}/webhook/listing-inquiry`;

const BRAND = "Maple Grove Residential";
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/* ------------------------------------------------------------------ data --- */

function psql(sql) {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql",
     "-U", env.POSTGRES_USER || "leasing", "-d", env.POSTGRES_DB || "leasing",
     "-tA", "-v", "ON_ERROR_STOP=1"],
    { cwd: REPO_ROOT, input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

/**
 * Reads the units as JSON. One row per line keeps parsing trivial and avoids
 * psql's column formatting entirely.
 */
function loadUnitsFromDb() {
  const raw = psql(
    "SELECT row_to_json(u) FROM (SELECT * FROM units ORDER BY rent_amount) u;"
  );
  if (!raw) throw new Error("no units in the database - run node scripts/seed-demo.js first");
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function loadUnitsFromFixtures() {
  const { units } = require("../fixtures/demo-data");
  return units.map((u) => ({ ...u, status: "available" }));
}

/* ----------------------------------------------------------------- html --- */

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value) {
  return "$" + Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function prettyDate(value) {
  const d = new Date(String(value).slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function page(title, bodyHtml, { wide = false } = {}) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(title)} | ${BRAND}</title>`,
    '<link rel="stylesheet" href="styles.css">',
    "</head>",
    "<body>",
    '<header class="site-header">',
    '  <a class="brand" href="index.html">',
    `    <span class="brand-mark">MG</span><span>${BRAND}</span>`,
    "  </a>",
    '  <nav><a href="index.html">Available rentals</a></nav>',
    "</header>",
    `<main class="${wide ? "wide" : ""}">`,
    bodyHtml,
    "</main>",
    '<footer class="site-footer">',
    `  <p>${BRAND} &middot; Equal Housing Opportunity</p>`,
    '  <p class="demo-note">Demonstration site. Every property, price and person shown here is synthetic.</p>',
    "</footer>",
    "</body>",
    "</html>",
  ].join("\n");
}

function photoSrc(key) {
  for (const ext of PHOTO_EXTENSIONS) {
    if (fs.existsSync(path.join(ASSET_DIR, key + ext))) return "img/" + key + ext;
  }
  return "img/" + key + ".svg";
}

function unitCard(unit) {
  const keys = unit.photos && unit.photos.length ? unit.photos : [unit.unit_code + "-1"];
  return [
    '<article class="card">',
    `  <a class="card-photo" href="unit-${esc(unit.unit_code)}.html">`,
    `    <img src="${esc(photoSrc(keys[0]))}" alt="${esc(unit.title || unit.address)}">`,
    "  </a>",
    '  <div class="card-body">',
    `    <p class="price">${money(unit.rent_amount)}<span>/month</span></p>`,
    `    <h2><a href="unit-${esc(unit.unit_code)}.html">${esc(unit.title || unit.address)}</a></h2>`,
    `    <p class="address">${esc(unit.address)}</p>`,
    '    <ul class="specs">',
    `      <li><strong>${esc(unit.beds)}</strong> bed</li>`,
    `      <li><strong>${esc(Number(unit.baths))}</strong> bath</li>`,
    `      <li><strong>${esc(Number(unit.sqft).toLocaleString("en-US"))}</strong> sq ft</li>`,
    "    </ul>",
    `    <p class="available">Available ${esc(prettyDate(unit.available_from))}</p>`,
    `    <a class="card-cta" href="unit-${esc(unit.unit_code)}.html">View details</a>`,
    "  </div>",
    "</article>",
  ].join("\n");
}

function indexPage(units) {
  const body = [
    '<section class="hero">',
    "  <h1>Available rentals in Springfield</h1>",
    "  <p>Self-guided tours daily. Questions answered the moment you ask them.</p>",
    "</section>",
    `<p class="result-count">${units.length} available ${units.length === 1 ? "home" : "homes"}</p>`,
    '<section class="grid">',
    units.map(unitCard).join("\n"),
    "</section>",
  ].join("\n");
  return page("Available rentals", body, { wide: true });
}

function factRows(unit) {
  const rows = [
    ["Rent", money(unit.rent_amount) + " / month"],
    ["Security deposit", money(unit.deposit_amount)],
    ["Available from", prettyDate(unit.available_from)],
    ["Lease term", unit.lease_term_months + " months"],
    ["Bedrooms", unit.beds],
    ["Bathrooms", Number(unit.baths)],
    ["Square feet", Number(unit.sqft).toLocaleString("en-US")],
    ["Parking", unit.parking],
    ["Laundry", unit.laundry],
    ["Utilities", unit.utilities_included],
    ["Pets", unit.pet_policy],
    ["Pet fee", money(unit.pet_fee_monthly) + " / month"],
  ];
  const facts = unit.faq_facts || {};
  for (const key of Object.keys(facts)) {
    rows.push([key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), facts[key]]);
  }
  return rows
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`)
    .join("\n");
}

function contactForm(unit) {
  return [
    '<section class="contact" id="contact">',
    "  <h2>Contact about this unit</h2>",
    "  <p>Ask anything about the home. Someone will come back to you straight away.</p>",
    `  <form method="post" action="${esc(FORM_ACTION)}">`,
    `    <input type="hidden" name="unit_code" value="${esc(unit.unit_code)}">`,
    // The nonce dedupes a resubmitted form. Generated per page build, which is
    // enough: a fresh page load is a fresh build for demo purposes, and the
    // lead upsert is idempotent on (email, unit) regardless.
    `    <input type="hidden" name="nonce" value="${esc(unit.unit_code)}-${Date.now()}-${Math.floor(Math.random() * 1e6)}">`,
    '    <label>Your name<input type="text" name="prospect_name" required autocomplete="name"></label>',
    '    <label>Email<input type="email" name="prospect_email" required autocomplete="email"></label>',
    '    <label>Phone <span class="optional">(optional)</span><input type="tel" name="prospect_phone" autocomplete="tel"></label>',
    '    <label>Your question<textarea name="inquiry_text" rows="4" required placeholder="Is parking included? Do you allow a small dog?"></textarea></label>',
    // The listing site says nothing about where the conversation continues.
    // A real rental listing does not advertise the operator's internal tooling,
    // and naming a chat app here makes the site look like a demo of that app.
    // The handoff is introduced on the confirmation page, after they send.
    '    <button type="submit">Send message</button>',
    '    <p class="form-note">You will get an answer straight back, day or night.</p>',
    "  </form>",
    "</section>",
  ].join("\n");
}

function unitPage(unit) {
  const keys = unit.photos && unit.photos.length ? unit.photos : [unit.unit_code + "-1"];
  const body = [
    '<p class="breadcrumb"><a href="index.html">Available rentals</a> / ' + esc(unit.unit_code) + "</p>",
    '<section class="gallery">',
    `  <img class="gallery-main" src="${esc(photoSrc(keys[0]))}" alt="${esc(unit.title || unit.address)}">`,
    '  <div class="gallery-rest">',
    keys.slice(1, 3).map((k) =>
      `    <img src="${esc(photoSrc(k))}" alt="${esc(unit.title || unit.address)}">`
    ).join("\n"),
    "  </div>",
    "</section>",
    '<div class="unit-layout">',
    '  <div class="unit-main">',
    `    <p class="price">${money(unit.rent_amount)}<span>/month</span></p>`,
    `    <h1>${esc(unit.title || unit.address)}</h1>`,
    `    <p class="address">${esc(unit.address)}</p>`,
    '    <ul class="specs big">',
    `      <li><strong>${esc(unit.beds)}</strong> bed</li>`,
    `      <li><strong>${esc(Number(unit.baths))}</strong> bath</li>`,
    `      <li><strong>${esc(Number(unit.sqft).toLocaleString("en-US"))}</strong> sq ft</li>`,
    `      <li>Available <strong>${esc(prettyDate(unit.available_from))}</strong></li>`,
    "    </ul>",
    unit.description ? `    <p class="description">${esc(unit.description)}</p>` : "",
    '    <h2>Property details</h2>',
    '    <table class="facts">',
    factRows(unit),
    "    </table>",
    "  </div>",
    '  <aside class="unit-aside">',
    contactForm(unit),
    "  </aside>",
    "</div>",
  ].join("\n");
  return page(unit.title || unit.address, body, { wide: true });
}

/* ---------------------------------------------------------------- photos --- */

/**
 * A generated stand-in so the site always renders before real photos exist.
 * Raw SVG, hand-written, zero dependencies - the same approach as
 * docs/architecture-preview.svg and scripts/generate-paystubs.js.
 */
function placeholderSvg(key, unit, index) {
  const palettes = [
    ["#dfe7ef", "#b9c7d6", "#8fa2b7"],
    ["#e6e2da", "#cdc4b6", "#a79b88"],
    ["#dde7e2", "#bcccc4", "#93a89d"],
  ];
  const [bg, mid, dark] = palettes[index % palettes.length];
  const label = (unit.title || unit.address) + " - photo " + (index + 1);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" role="img">',
    `<title>${esc(label)}</title>`,
    `<rect width="1200" height="800" fill="${bg}"/>`,
    `<rect x="0" y="560" width="1200" height="240" fill="${mid}"/>`,
    `<polygon points="600,150 980,430 220,430" fill="${dark}" opacity="0.55"/>`,
    `<rect x="380" y="430" width="440" height="200" fill="${dark}" opacity="0.35"/>`,
    `<rect x="470" y="480" width="110" height="110" fill="${bg}" opacity="0.85"/>`,
    `<rect x="640" y="480" width="110" height="110" fill="${bg}" opacity="0.85"/>`,
    `<text x="600" y="716" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#44505e" text-anchor="middle">${esc(unit.unit_code)} &#183; photo ${index + 1}</text>`,
    `<text x="600" y="756" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="#6b7887" text-anchor="middle">placeholder image</text>`,
    "</svg>",
  ].join("\n");
}

function writePhotos(units) {
  let real = 0;
  let generated = 0;
  for (const unit of units) {
    const keys = unit.photos && unit.photos.length ? unit.photos : [unit.unit_code + "-1"];
    keys.forEach((key, index) => {
      const supplied = PHOTO_EXTENSIONS
        .map((ext) => path.join(ASSET_DIR, key + ext))
        .find((candidate) => fs.existsSync(candidate));
      if (supplied) {
        fs.copyFileSync(supplied, path.join(IMG_DIR, key + path.extname(supplied)));
        real += 1;
      } else {
        fs.writeFileSync(path.join(IMG_DIR, key + ".svg"), placeholderSvg(key, unit, index), "utf8");
        generated += 1;
      }
    });
  }
  return { real, generated };
}

/* ------------------------------------------------------------------ main --- */

function main() {
  const fromFixtures = process.argv.includes("--from-fixtures");
  const units = fromFixtures ? loadUnitsFromFixtures() : loadUnitsFromDb();
  const available = units.filter((u) => u.status === "available");

  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexPage(available), "utf8");
  for (const unit of units) {
    fs.writeFileSync(
      path.join(OUT_DIR, `unit-${unit.unit_code}.html`),
      unitPage(unit),
      "utf8"
    );
  }

  const css = fs.readFileSync(path.join(REPO_ROOT, "site-assets", "styles.css"), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "styles.css"), css, "utf8");

  const photos = writePhotos(units);

  console.log("Listing site built -> data/listing-site");
  console.log(`  ${available.length} available of ${units.length} unit(s)`);
  console.log(`  photos: ${photos.real} supplied, ${photos.generated} placeholder`);
  console.log(`  contact form posts to: ${FORM_ACTION}`);
  console.log("");
  console.log("  Serve it with:  node scripts/serve-listing-site.js");
  if (photos.generated) {
    console.log("  Real photos: drop files in site-assets/ named e.g. MAPLE-2B-1.jpg, then rebuild.");
  }
}

main();
