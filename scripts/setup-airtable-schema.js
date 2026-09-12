/**
 * Creates the Airtable table the demo board mirrors into.
 *
 * Airtable is a DISPLAY MIRROR, never the system of record. This table exists so
 * the pipeline is visible on camera; Postgres holds the truth and the workflows
 * never read anything back from here.
 *
 * Safe to re-run: an existing table is left alone and only missing fields are
 * added.
 *
 * Note: the Meta API cannot create formula, rollup, lookup, or count fields, so
 * every derived value here is a plain field written by the sync script.
 *
 * Usage:
 *   node scripts/setup-airtable-schema.js
 */

const { loadEnv } = require("./lib/env");

const env = loadEnv(["AIRTABLE_PAT", "AIRTABLE_BASE_ID"]);
const META = `https://api.airtable.com/v0/meta/bases/${env.AIRTABLE_BASE_ID}`;

const TABLE_NAME = "Leads";

// The first field is Airtable's primary field and cannot be a select type.
const FIELDS = [
  { name: "Ref Token", type: "singleLineText" },
  { name: "Prospect", type: "singleLineText" },
  { name: "Email", type: "email" },
  { name: "Unit", type: "singleLineText" },
  {
    name: "Status",
    type: "singleSelect",
    options: {
      choices: [
        { name: "New", color: "grayLight2" },
        { name: "Engaged", color: "blueLight2" },
        { name: "Prequalified", color: "cyanLight2" },
        { name: "Tour Booked", color: "purpleLight2" },
        { name: "Toured", color: "yellowLight2" },
        { name: "Applied", color: "orangeLight2" },
        { name: "Decided", color: "greenLight2" },
        { name: "Leased", color: "greenBright" },
        { name: "Stopped For Review", color: "redLight2" },
      ],
    },
  },
  { name: "Move In", type: "date", options: { dateFormat: { name: "iso" } } },
  { name: "Stated Income", type: "number", options: { precision: 0 } },
  { name: "Verified Income", type: "number", options: { precision: 0 } },
  { name: "Income Flag", type: "singleLineText" },
  { name: "Tour", type: "singleLineText" },
  { name: "Updated", type: "singleLineText" },
];

async function airtable(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PAT}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = body?.error?.message || body?.error?.type || String(text).slice(0, 200);
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }
  return body;
}

async function main() {
  const { tables } = await airtable(`${META}/tables`);
  const existing = tables.find((t) => t.name === TABLE_NAME);

  if (!existing) {
    // The primary field must be part of the create call.
    await airtable(`${META}/tables`, {
      method: "POST",
      body: JSON.stringify({
        name: TABLE_NAME,
        description: "Display mirror of the leasing pipeline. Postgres is the system of record.",
        fields: FIELDS,
      }),
    });
    console.log(`Created table "${TABLE_NAME}" with ${FIELDS.length} fields.`);
  } else {
    const present = new Set(existing.fields.map((f) => f.name));
    const missing = FIELDS.filter((f) => !present.has(f.name));

    if (!missing.length) {
      console.log(`Table "${TABLE_NAME}" already has all ${FIELDS.length} fields.`);
    } else {
      for (const field of missing) {
        await airtable(`${META}/tables/${existing.id}/fields`, {
          method: "POST",
          body: JSON.stringify(field),
        });
        console.log(`  added field: ${field.name}`);
      }
      console.log(`Table "${TABLE_NAME}" updated, ${missing.length} field(s) added.`);
    }
  }

  const leftovers = tables.filter((t) => /^Table \d+$/.test(t.name));
  if (leftovers.length) {
    console.log(
      `\nAirtable's default ${leftovers.map((t) => `"${t.name}"`).join(", ")} is still in the base.\n` +
        "Delete it by hand for a tidy board on camera - the API cannot delete tables."
    );
  }

  console.log("\nNext: node scripts/sync-airtable.js");
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
