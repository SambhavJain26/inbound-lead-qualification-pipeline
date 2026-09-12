/**
 * Submits a fixture rental application to the WF2 Form Trigger.
 *
 * Form Trigger submissions must be multipart/form-data - a JSON body is
 * accepted but the fields arrive empty.
 *
 * Usage:
 *   node scripts/submit-application.js maya
 *   node scripts/submit-application.js devon
 *   node scripts/submit-application.js devon --voucher 1350
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT, loadEnv } = require("./lib/env");
const { applicants } = require("../fixtures/demo-data");

const env = loadEnv(["TUNNEL_URL"]);
const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("-")) || "maya";

const voucherIndex = args.indexOf("--voucher");
const voucher = voucherIndex === -1 ? 0 : Number(args[voucherIndex + 1] || 0);

const applicant = applicants.find((a) => a.key === key);
if (!applicant) {
  console.error(`Unknown applicant "${key}". Available: ${applicants.map((a) => a.key).join(", ")}`);
  process.exit(1);
}

async function main() {
  const pdfPath = path.join(REPO_ROOT, "fixtures", `paystub-${applicant.key}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`missing ${path.relative(REPO_ROOT, pdfPath)} - run scripts/generate-paystubs.js`);
  }

  // n8n's own form UI submits fields as field-0, field-1, ... in declaration
  // order and maps them back to labels on the way in. Posting the labels
  // themselves is accepted but every value arrives null.
  //
  // The order is read from the built workflow rather than hardcoded, so adding
  // or reordering a form field cannot silently break this script.
  const workflow = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "n8n-workflows", "wf2-application-and-verify.json"), "utf8")
  );
  const trigger = workflow.nodes.find((n) => n.type === "n8n-nodes-base.formTrigger");
  if (!trigger) throw new Error("no form trigger in wf2 - run the build script first");

  const indexByLabel = new Map(
    trigger.parameters.formFields.values.map((field, index) => [field.fieldLabel, index])
  );

  const form = new FormData();
  const set = (label, value) => {
    const index = indexByLabel.get(label);
    if (index === undefined) throw new Error(`form has no field "${label}"`);
    form.set(`field-${index}`, value === null || value === undefined ? "" : String(value));
  };

  // A ref token links the application back to its lead. Left blank here unless
  // one is passed, so the form also works standalone.
  const refIndex = args.indexOf("--ref");
  set("ref_token", refIndex === -1 ? "" : args[refIndex + 1]);

  set("full_name", applicant.full_name);
  set("email", applicant.email);
  set("phone", applicant.phone);
  // Fabricated. A real form would collect a real SSN; this one masks it to
  // last-4 on arrival and never stores the rest.
  set("ssn", `000-00-${applicant.ssn_last4}`);
  set("current_address", applicant.current_address);
  set("prior_address", applicant.prior_address);
  set("desired_move_in", applicant.desired_move_in);
  set("employer_name", applicant.employer_name);
  set("job_title", applicant.job_title);
  set("claimed_monthly_income", applicant.claimed_monthly_income);
  set("rental_assistance_amount", voucher || applicant.rental_assistance_amount);
  set("occupants", applicant.occupants.length);
  set("pets", applicant.pets.length ? applicant.pets.map((p) => `${p.type} ${p.weight_lbs}lbs`).join(", ") : "none");
  set("vehicles", applicant.vehicles.map((v) => `${v.color} ${v.make} ${v.model}`).join(", ") || "none");
  set("prior_eviction", applicant.disclosures.prior_eviction_filing ? "Yes" : "No");
  set("broken_lease", applicant.disclosures.broken_lease ? "Yes" : "No");
  set("bankruptcy", applicant.disclosures.bankruptcy_7_years ? "Yes" : "No");
  set("unit_code", applicant.unit_code);
  set("fcra_consent", "I authorise these checks");

  form.set(
    `field-${indexByLabel.get("paystub")}`,
    new Blob([fs.readFileSync(pdfPath)], { type: "application/pdf" }),
    `paystub-${applicant.key}.pdf`
  );

  const url = new URL("/form/rental-application", env.TUNNEL_URL).href;
  console.log(`Submitting ${applicant.full_name} (${applicant.label})`);
  console.log(`  unit ${applicant.unit_code}, claims $${applicant.claimed_monthly_income}/mo`);
  console.log(`  pay stub implies $${applicant.paystub.implied_monthly}/mo`);
  if (voucher) console.log(`  with $${voucher}/mo rental assistance`);
  console.log(`  -> ${url}`);

  const response = await fetch(url, { method: "POST", body: form });
  const text = await response.text();

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  console.log(`\nSubmitted. Expected outcome: ${applicant.expected.criteria_result}`);
  console.log(`  ${applicant.expected.note}`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
