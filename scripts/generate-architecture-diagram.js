/**
 * Generates docs/architecture.excalidraw.
 *
 * The diagram is the honesty artifact: it shows the pipeline as built, and
 * directly beneath each box, what a production deployment would put there
 * instead. Green boxes are real integrations running now. Amber boxes are
 * labelled mocks. Grey boxes are the production swaps.
 *
 * Open it at excalidraw.com (File > Open) and export a PNG for the deck.
 *
 * Usage:
 *   node scripts/generate-architecture-diagram.js
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT } = require("./lib/env");

const OUT = path.join(REPO_ROOT, "docs", "architecture.excalidraw");

const COLOR = {
  real: { stroke: "#2f9e44", fill: "#b2f2bb" },
  mock: { stroke: "#e8590c", fill: "#ffd8a8" },
  swap: { stroke: "#868e96", fill: "#f1f3f5" },
  human: { stroke: "#1971c2", fill: "#a5d8ff" },
  text: "#1e1e1e",
};

let seed = 1;
const elements = [];

function nextSeed() {
  seed += 1;
  return seed * 10007;
}

function base(extra) {
  return {
    angle: 0,
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    ...extra,
  };
}

function box({ id, x, y, w, h, kind }) {
  elements.push(base({
    id,
    type: "rectangle",
    x, y, width: w, height: h,
    strokeColor: COLOR[kind].stroke,
    backgroundColor: COLOR[kind].fill,
    fillStyle: "solid",
  }));
}

function label({ id, x, y, w, text, size = 16, bold = false, color = COLOR.text, align = "center" }) {
  const lines = String(text).split("\n");
  elements.push(base({
    id,
    type: "text",
    x, y,
    width: w,
    height: lines.length * (size + 5),
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    roundness: null,
    text,
    originalText: text,
    fontSize: size,
    fontFamily: bold ? 2 : 1,
    textAlign: align,
    verticalAlign: "top",
    containerId: null,
    lineHeight: 1.25,
    baseline: size,
  }));
}

function arrow({ id, x, y, dx, dy, color = "#495057", dashed = false }) {
  elements.push(base({
    id,
    type: "arrow",
    x, y,
    width: Math.abs(dx),
    height: Math.abs(dy),
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeStyle: dashed ? "dashed" : "solid",
    strokeWidth: dashed ? 1 : 2,
    roundness: { type: 2 },
    points: [[0, 0], [dx, dy]],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
  }));
}

/* --------------------------------------------------------------- content */

const STAGES = [
  {
    title: "Lead arrives",
    built: "Gmail (IMAP)\nZillow-format lead email",
    kind: "real",
    production: "ILS feed or\nZillow Rental Manager",
  },
  {
    title: "Instant reply",
    built: "OpenAI\ngrounded in unit facts\n+ Tier A guardrails",
    kind: "real",
    production: "Same, plus SMS\n(A2P 10DLC registered)",
  },
  {
    title: "Pre-qualification",
    built: "Deterministic gate\nself-reported answers",
    kind: "real",
    production: "Same",
  },
  {
    title: "Tour",
    built: "Cal.com booking\n+ entry code (MOCK)",
    kind: "mock",
    production: "Rently / Tour24\nreal smart lock",
  },
  {
    title: "Application",
    built: "n8n Form\n+ document upload",
    kind: "real",
    production: "PMS application\nor hosted form",
  },
  {
    title: "Document read",
    built: "OpenAI extraction\nevery value cited",
    kind: "real",
    production: "Same",
  },
  {
    title: "Income verified",
    built: "PLAID SANDBOX\nreal API, test data",
    kind: "real",
    production: "Plaid Production\n+ Hosted Link",
  },
  {
    title: "Background check",
    built: "Screening Bureau\n(MOCK)\nShareAble v3 shape",
    kind: "mock",
    production: "TransUnion ShareAble\nFCRA credentialing",
  },
  {
    title: "Criteria applied",
    built: "Deterministic engine\nmanager thresholds\nevidence per criterion",
    kind: "real",
    production: "Same",
  },
  {
    title: "Human decides",
    built: "Telegram card\nApprove / Conditional\n/ Review",
    kind: "human",
    production: "Same, or in-PMS\napproval queue",
  },
  {
    title: "Lease signed",
    built: "DocuSign sandbox\nwatermarked",
    kind: "real",
    production: "DocuSign production\n(paid plan)",
  },
  {
    title: "Unit leased",
    built: "Postgres\n+ welcome packet",
    kind: "real",
    production: "Yardi / AppFolio /\nEntrata",
  },
];

const BOX_W = 205;
const BOX_H = 108;
const GAP_X = 44;
const COLS = 6;
const ROW_GAP_Y = 300;
const ORIGIN_X = 80;
const ORIGIN_Y = 210;

label({
  id: "title",
  x: ORIGIN_X, y: 60, w: 1200,
  text: "Automated Leasing & Tenant Screening",
  size: 30, bold: true, align: "left",
});
label({
  id: "subtitle",
  x: ORIGIN_X, y: 104, w: 1400,
  text:
    "Green = real integration running today.   Amber = labelled mock.   Blue = the human decision.\n" +
    "Grey beneath each box = what a production deployment puts there instead.",
  size: 15, align: "left", color: "#495057",
});

STAGES.forEach((stage, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = ORIGIN_X + col * (BOX_W + GAP_X);
  const y = ORIGIN_Y + row * ROW_GAP_Y;

  label({ id: `n${index}`, x, y: y - 30, w: BOX_W, text: `${index + 1}. ${stage.title}`, size: 15, bold: true });
  box({ id: `b${index}`, x, y, w: BOX_W, h: BOX_H, kind: stage.kind });
  label({ id: `t${index}`, x: x + 12, y: y + 18, w: BOX_W - 24, text: stage.built, size: 14 });

  // Production swap, directly beneath.
  box({ id: `pb${index}`, x, y: y + BOX_H + 46, w: BOX_W, h: 74, kind: "swap" });
  label({
    id: `pt${index}`, x: x + 12, y: y + BOX_H + 62, w: BOX_W - 24,
    text: stage.production, size: 13, color: "#495057",
  });
  arrow({ id: `pa${index}`, x: x + BOX_W / 2, y: y + BOX_H + 8, dx: 0, dy: 30, color: "#adb5bd", dashed: true });

  // Flow arrow to the next stage in the same row.
  if (col < COLS - 1 && index < STAGES.length - 1) {
    arrow({ id: `fa${index}`, x: x + BOX_W + 6, y: y + BOX_H / 2, dx: GAP_X - 12, dy: 0 });
  }
});

// Row 1 ends at stage 6 and continues on row 2. An arrow sweeping back across
// the canvas would cross row 2's labels, so a note reads more clearly.
label({
  id: "continues",
  x: ORIGIN_X + (COLS - 1) * (BOX_W + GAP_X),
  y: ORIGIN_Y + BOX_H + 132,
  w: BOX_W,
  text: "continues below",
  size: 13,
  color: "#868e96",
});

/* ------------------------------------------------- the compliance callout */

const calloutY = ORIGIN_Y + ROW_GAP_Y + BOX_H + 200;

box({ id: "callout", x: ORIGIN_X, y: calloutY, w: 1450, h: 150, kind: "swap" });
label({
  id: "callout-title",
  x: ORIGIN_X + 20, y: calloutY + 16, w: 1400,
  text: "What the system never does",
  size: 18, bold: true, align: "left",
});
label({
  id: "callout-body",
  x: ORIGIN_X + 20, y: calloutY + 50, w: 1400,
  text:
    "It never decides.  The AI reads documents and answers questions; a deterministic engine applies the manager's published criteria; a person makes every rental decision.\n" +
    "It never scores or ranks an applicant, and never infers anything about a protected class.\n" +
    "It never sends a denial.  A file that fails criteria stops and hands to a human - real adverse action is a formal FCRA process, and automating it is how operators end up in class actions.",
  size: 14, align: "left", color: "#343a40",
});

/* --------------------------------------------------------------- write */

const document = {
  type: "excalidraw",
  version: 2,
  source: "leasing-tenant-screening",
  elements,
  appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
  files: {},
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(document, null, 2), "utf8");

console.log(`${path.relative(REPO_ROOT, OUT)} written`);
console.log(`  ${elements.length} elements, ${STAGES.length} pipeline stages`);
console.log("\nOpen at excalidraw.com (File > Open), then export a PNG for the deck.");
