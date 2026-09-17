/**
 * Builds n8n-workflows/wf2-application-and-verify.json.
 *
 * WF2 is the screening engine: an application arrives, its documents are read,
 * income is verified against a real open-banking API, the manager's published
 * criteria are applied deterministically, and the complete file goes to a human.
 *
 * The system classifies. It never decides.
 *
 * Run: node scripts/build-wf2-application-verify.js
 */

const path = require("path");
const wf = require("./lib/wf-common");
const applicationForm = require("./lib/application-form");
const { REPO_ROOT } = require("./lib/env");

const SCREENING_LIB = wf.inlineLib("screening-lib.js");
const LEASING_LIB = wf.inlineLib("leasing-lib.js");
const OUT = path.join(REPO_ROOT, "n8n-workflows", "wf2-application-and-verify.json");

/* --------------------------------------------------------------- schema */

const PAYSTUB_SCHEMA = {
  type: "object",
  properties: {
    employer_name: { type: ["string", "null"], description: "Employer as printed on the stub." },
    employee_name: { type: ["string", "null"], description: "Employee as printed on the stub." },
    gross_this_period: { type: ["number", "null"], description: "Gross pay for this period only, not year to date." },
    pay_frequency: {
      type: ["string", "null"],
      description: "One of WEEKLY, BIWEEKLY, SEMI_MONTHLY, MONTHLY, or null if not stated.",
    },
    pay_period_end: { type: ["string", "null"], description: "ISO date of the period end." },
    net_pay: { type: ["number", "null"], description: "Net pay for this period." },
    source_quotes: {
      type: "array",
      items: { type: "string" },
      description: "Verbatim lines from the document that each figure was read from.",
    },
  },
  additionalProperties: false,
  required: [
    "employer_name", "employee_name", "gross_this_period",
    "pay_frequency", "pay_period_end", "net_pay", "source_quotes",
  ],
};

const PAYSTUB_INSTRUCTIONS = [
  "Extract figures from a pay stub. Report only what is printed on the document.",
  "",
  "Never estimate, never infer, never annualise, and never fill in a plausible value.",
  "If a field is not printed on the document, return null for it.",
  "",
  "gross_this_period is the gross for THIS pay period only. Do not return the year-to-date",
  "column. If both appear, take the 'this period' one.",
  "",
  "For every figure you report, add the verbatim line you read it from to source_quotes, so a",
  "human can check the value against the document.",
  "",
  "Do not record anything about the person beyond their name as printed. Do not output any",
  "judgement, assessment, score, or recommendation about the applicant.",
].join("\n");

/* ------------------------------------------------------------- code bodies */

const normaliseCode = [
  SCREENING_LIB,
  "",
  LEASING_LIB,
  "",
  "// Normalises the submitted form and discards the raw SSN immediately.",
  "const out = [];",
  "for (const item of $input.all()) {",
  "  const form = Object.assign({}, item.json);",
  "  const displayFields = " + JSON.stringify(applicationForm.fields.map(([key, label]) => [key, label])) + ";",
  "  for (const pair of displayFields) { if (form[pair[0]] === undefined) form[pair[0]] = form[pair[1]]; }",
  "  const consent = form.fcra_consent;",
  "  if (consent !== 'I authorize the synthetic demo checks' && consent !== 'I authorise these checks') throw new Error('Explicit demo verification authorization is required');",
  "",
  "  // Form Trigger field keys can arrive generically, so read defensively.",
  "  function field(names, fallback) {",
  "    for (const name of names) {",
  "      if (form[name] !== undefined && form[name] !== '') return form[name];",
  "    }",
  "    return fallback === undefined ? null : fallback;",
  "  }",
  "",
  "  function toNumber(value) {",
  "    if (value === null || value === undefined || value === '') return null;",
  "    const n = Number(String(value).replace(/[^0-9.\\-]/g, ''));",
  "    return Number.isFinite(n) ? n : null;",
  "  }",
  "",
  "  // The raw SSN is reduced to its last four digits here and never stored.",
  "  const ssnLast4 = maskSsn(field(['ssn', 'SSN', 'Social Security Number']));",
  "",
  "  const reference = String(field(['ref_token', 'Reference Code'], '')).trim();",
  "  const refToken = /^R-\\d{4}$/.test(reference) ? reference : extractRefToken(reference);",
  "",
  "  out.push({",
  "    json: {",
  "      lead_ref_token: refToken,",
  "      application_ref_token: makeRefToken('A'),",
  "      full_name: field(['full_name', 'Full Name']),",
  "      email: field(['email', 'Email']),",
  "      phone: field(['phone', 'Phone']),",
  "      ssn_last4: ssnLast4,",
  "      current_address: field(['current_address', 'Current Address']),",
  "      prior_address: field(['prior_address', 'Prior Address']),",
  "      desired_move_in: field(['desired_move_in', 'Desired Move-In Date']),",
  "      employer_name: field(['employer_name', 'Employer']),",
  "      job_title: field(['job_title', 'Job Title']),",
  "      claimed_monthly_income: toNumber(field(['claimed_monthly_income', 'Gross Monthly Income'])),",
  "      rental_assistance_amount: toNumber(field(['rental_assistance_amount', 'Monthly Rental Assistance'])) || 0,",
  "      occupants: toNumber(field(['occupants', 'Adults Living There'])),",
  "      pets: field(['pets', 'Pets'], 'none'),",
  "      vehicles: field(['vehicles', 'Vehicles'], 'none'),",
  "      disclosures: {",
  "        prior_eviction_filing: String(field(['prior_eviction', 'Prior Eviction Filing'], 'No')) === 'Yes',",
  "        broken_lease: String(field(['broken_lease', 'Broken Lease'], 'No')) === 'Yes',",
  "        bankruptcy_7_years: String(field(['bankruptcy', 'Bankruptcy In Last 7 Years'], 'No')) === 'Yes',",
  "      },",
  "      fcra_consent: true,",
  "      unit_code: field(['unit_code', 'Unit'], 'MAPLE-2B'),",
  "    },",
  "    // Re-key the upload to a stable name. The Form Trigger names the binary",
  "    // after the submitted field (field-N), not the field label, so the",
  "    // downstream Extract node cannot rely on a fixed key otherwise.",
  "    binary: (function () {",
  "      const incoming = item.binary || {};",
  "      const keys = Object.keys(incoming);",
  "      if (!keys.length) return {};",
  "      const pdfKey = keys.find(function (k) {",
  "        const mime = (incoming[k] || {}).mimeType || '';",
  "        return mime.indexOf('pdf') !== -1;",
  "      }) || keys[0];",
  "      return { paystub: incoming[pdfKey] };",
  "    })(),",
  "  });",
  "}",
  "return out;",
].join("\n");

const verificationCode = [
  SCREENING_LIB,
  "",
  LEASING_LIB,
  "",
  "// Brings the three income figures together: what the applicant claimed, what",
  "// their document says, and what their payroll deposits actually show.",
  "const application = $('Create Application Record').first().json;",
  "const criteria = $('Load Screening Criteria').first().json;",
  "",
  "// Extracted document figures",
  "const extractionRaw = $('Extract Paystub Fields').first().json;",
  "// Uses the shared unwrapper rather than a local copy. The Responses payload",
  "// nests as output[0].content[0].text, and a trimmed copy that forgets one of",
  "// those hops fails with a payload that is actually correct.",
  "const extraction = unwrapAiPayload(extractionRaw, 'gross_this_period') || {};",
  "",
  "if (!extraction || typeof extraction !== 'object' || !('gross_this_period' in extraction)) {",
  "  throw new Error('Paystub extraction returned an unexpected shape: ' +",
  "    JSON.stringify(extractionRaw).slice(0, 300));",
  "}",
  "",
  "const documentMonthly = monthlyFromPeriod(extraction.gross_this_period, extraction.pay_frequency);",
  "",
  "// Verified figures from the real Plaid Sandbox call",
  "const plaidRaw = $('Plaid: Get Payroll Income').first().json;",
  "const plaid = parsePlaidPayrollIncome(plaidRaw);",
  "",
  "if (plaid.verified_monthly_income === null) {",
  "  throw new Error('Plaid returned no usable income: ' + plaid.warnings.join('; '));",
  "}",
  "",
  "const comparison = computeIncomeComparison({",
  "  claimed: application.claimed_monthly_income,",
  "  extracted: documentMonthly,",
  "  verified: plaid.verified_monthly_income,",
  "  tolerancePct: criteria.income_mismatch_tolerance_pct,",
  "});",
  "",
  "return [{ json: {",
  "  ref_token: application.ref_token,",
  "  application_id: application.id,",
  "  extraction: extraction,",
  "  extracted_monthly_income: documentMonthly,",
  "  plaid: plaid,",
  "  plaid_raw: plaidRaw,",
  "  verified_monthly_income: plaid.verified_monthly_income,",
  "  comparison: comparison,",
  "} }];",
].join("\n");

const mockChecksCode = [
  "// Screening Bureau (MOCK) and Identity Check (MOCK).",
  "//",
  "// Real credit, eviction and criminal data requires FCRA permissible-purpose",
  "// credentialing - a bureau contract, a registered business, and usually a site",
  "// inspection. There is no developer sandbox at TransUnion or Experian, so this",
  "// is a licensing gate rather than a pricing one.",
  "//",
  "// The response is shaped like the public TransUnion ShareAble v3 payload so",
  "// swapping in the live endpoint is a one-node change. Every record it produces",
  "// is stamped source: 'mock'.",
  "const application = $('Create Application Record').first().json;",
  "",
  "// Deterministic per applicant so a demo replay gives the same result.",
  "// Keyed on name rather than email: the demo routes every applicant's mail to",
  "// one real mailbox, so the address is not a stable identifier here.",
  "const profiles = {",
  "  'maya restrepo': { credit: 712, evictions: 0, identity: 0.97 },",
  "  'devon clarke': { credit: 688, evictions: 0, identity: 0.94 },",
  "};",
  "const fallback = { credit: 705, evictions: 0, identity: 0.95 };",
  "const profile = profiles[String(application.full_name || '').trim().toLowerCase()] || fallback;",
  "",
  "return [{ json: {",
  "  ref_token: application.ref_token,",
  "  bureau_source: 'mock',",
  "  credit_score: profile.credit,",
  "  eviction_filings: profile.evictions,",
  "  bureau_raw: {",
  "    source: 'mock',",
  "    schema: 'transunion_shareable_v3_shape',",
  "    generated_at: new Date().toISOString(),",
  "    report: {",
  "      creditScore: { score: profile.credit, model: 'VantageScore 3.0 (MOCK)' },",
  "      evictionRecords: { recordCount: profile.evictions, records: [] },",
  "      criminalRecords: { recordCount: 0, records: [] },",
  "    },",
  "  },",
  "  identity_source: 'mock',",
  "  identity_match: true,",
  "  identity_confidence: profile.identity,",
  "} }];",
].join("\n");

const criteriaCode = [
  SCREENING_LIB,
  "",
  "// The deterministic criteria engine. Reads the manager's published thresholds",
  "// and applies them identically to every applicant. It never calls a model and",
  "// it never produces a decision - only a classification and an evidence trail.",
  "const application = $('Create Application Record').first().json;",
  "const unit = $('Load Unit For Application').first().json;",
  "const config = $('Load Screening Criteria').first().json;",
  "const verification = $('Compare Income Sources').first().json;",
  "const checks = $('Screening Bureau + Identity (MOCK)').first().json;",
  "",
  "const outcome = runCriteriaEngine({",
  "  application: {",
  "    credit_score: checks.credit_score,",
  "    eviction_filings: checks.eviction_filings,",
  "    identity_match: checks.identity_match,",
  "    rental_assistance_amount: application.rental_assistance_amount,",
  "  },",
  "  unit: unit,",
  "  config: config,",
  "  comparison: verification.comparison,",
  "});",
  "",
  "const c = verification.comparison;",
  "function money(value) {",
  "  return value === null || value === undefined ? 'n/a' : '$' + Number(value).toLocaleString('en-US');",
  "}",
  "",
  "// The three numbers, side by side. This is the moment the demo exists for.",
  "const incomeBlock = [",
  "  'Claimed on form:   ' + money(c.claimed_monthly) + '/mo',",
  "  'Pay stub says:     ' + money(c.extracted_monthly) + '/mo',",
  "  'Bank verified:     ' + money(c.verified_monthly) + '/mo  (Plaid)',",
  "].join('\\n');",
  "",
  "const evidenceBlock = outcome.evidence.map(function (e) {",
  "  const mark = e.met === true ? 'PASS' : e.met === false ? 'FAIL' : 'N/A ';",
  "  return mark + '  ' + e.criterion + '\\n      ' + e.detail;",
  "}).join('\\n');",
  "",
  "const header = c.mismatch_flagged",
  "  ? 'INCOME MISMATCH - ' + c.document_variance_pct + '% above verified'",
  "  : 'Income verified, documents agree';",
  "",
  "const summary = [",
  "  'Application ' + application.ref_token + ' - ' + application.full_name,",
  "  unit.unit_code + ' at ' + money(unit.rent_amount) + '/mo',",
  "  '',",
  "  header,",
  "  '',",
  "  incomeBlock,",
  "  '',",
  "  'Criteria (' + config.name + ')',",
  "  evidenceBlock,",
  "  '',",
  "  'Engine result: ' + outcome.result.replace(/_/g, ' '),",
  "].join('\\n');",
  "",
  "return [{ json: {",
  "  ref_token: application.ref_token,",
  "  application_id: application.id,",
  "  criteria_result: outcome.result,",
  "  criteria_evidence: outcome.evidence,",
  "  tenant_responsible_rent: outcome.tenant_responsible_rent,",
  "  failed_criteria: outcome.failed_criteria,",
  "  mismatch_flagged: c.mismatch_flagged,",
  "  meets_or_conditional: outcome.result !== 'does_not_meet',",
  "  summary: summary,",
  "  adverse_action_requirements: adverseActionRequirements(),",
  "} }];",
].join("\n");

/* ------------------------------------------------------------------ nodes */

const nodes = [
  wf.formTriggerNode("Rental Application Form", {
    formPath: "rental-application",
    version: 2.4,
    title: "Rental Application",
    description:
      "Maple Grove Residential | 412 Maple Street, Springfield. Complete one application per household. " +
      "Required fields are marked with an asterisk. This is a demonstration: use synthetic details and documents only. " +
      "Submitting an application is not a lease or an approval. A person reviews every rental decision.",
    // Matches the listing site the prospect just tapped through from.
    customCss: wf.FORM_CSS + '\n' + [
      '.card { max-width: 720px; padding: 32px; }',
      'h2 { font-size: 20px; color: var(--color-header-text); margin: 32px 0 8px; padding-top: 24px; border-top: 1px solid var(--color-card-border); }',
      'p { line-height: 1.6; }',
      'label { color: var(--color-header-text); font-weight: 600; }',
      'input, select, textarea { min-height: 44px; font-size: 16px; }',
      'input:focus-visible, select:focus-visible, button:focus-visible { outline: 2px solid var(--color-focus-border); outline-offset: 2px; }',
      '@media (max-width: 600px) { .card { padding: 20px; } }',
    ].join('\n'),
    buttonLabel: "Submit application",
    fields: applicationForm.buildFields(),
  }, [-720, 0]),

  wf.codeNode("Normalise And Mask Application", normaliseCode, [-500, 0]),

  wf.postgresNode(
    "Load Unit For Application",
    "SELECT * FROM units WHERE unit_code = $1 LIMIT 1;",
    [-280, 0],
    { queryOptions: { queryReplacement: "={{ [$('Normalise And Mask Application').first().json.unit_code] }}" } }
  ),

  wf.postgresNode(
    "Load Screening Criteria",
    "SELECT * FROM criteria_config WHERE is_active ORDER BY id DESC LIMIT 1;",
    [-60, 0]
  ),

  wf.postgresNode(
    "Create Application Record",
    "INSERT INTO applications\n" +
      "  (ref_token, lead_id, unit_id, full_name, email, phone, ssn_last4,\n" +
      "   current_address, prior_address, desired_move_in, employer_name, job_title,\n" +
      "   claimed_monthly_income, rental_assistance_amount, occupants, pets, vehicles,\n" +
      "   disclosures, fcra_consent_at, status)\n" +
      "VALUES\n" +
      "  ($1, (SELECT id FROM leads WHERE ref_token = NULLIF($2::text,'')),\n" +
      "   $3::int,\n" +
      "   $4, $5, NULLIF($6::text,''), NULLIF($7::text,''),\n" +
      "   NULLIF($8::text,''), NULLIF($9::text,''), NULLIF($10::text,'')::date,\n" +
      "   NULLIF($11::text,''), NULLIF($12::text,''),\n" +
      "   NULLIF($13::text,'')::numeric, NULLIF($14::text,'')::numeric,\n" +
      "   jsonb_build_array(jsonb_build_object('count', NULLIF($15::text,'')::int)),\n" +
      "   jsonb_build_array(jsonb_build_object('description', $16)),\n" +
      "   jsonb_build_array(jsonb_build_object('description', $17)),\n" +
      "   $18::jsonb, now(), 'verifying')\n" +
      "RETURNING *;",
    [160, 0],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$('Normalise And Mask Application').first().json.application_ref_token," +
          "($('Normalise And Mask Application').first().json.lead_ref_token ?? '')," +
          // Taken from the row already loaded, rather than re-looked-up in a
          // subselect: a missing unit then fails loudly instead of writing a
          // null foreign key.
          "$('Load Unit For Application').first().json.id," +
          "$('Normalise And Mask Application').first().json.full_name," +
          "$('Normalise And Mask Application').first().json.email," +
          "($('Normalise And Mask Application').first().json.phone ?? '')," +
          "($('Normalise And Mask Application').first().json.ssn_last4 ?? '')," +
          "($('Normalise And Mask Application').first().json.current_address ?? '')," +
          "($('Normalise And Mask Application').first().json.prior_address ?? '')," +
          "($('Normalise And Mask Application').first().json.desired_move_in ?? '')," +
          "($('Normalise And Mask Application').first().json.employer_name ?? '')," +
          "($('Normalise And Mask Application').first().json.job_title ?? '')," +
          "($('Normalise And Mask Application').first().json.claimed_monthly_income ?? '')," +
          "($('Normalise And Mask Application').first().json.rental_assistance_amount ?? 0)," +
          "($('Normalise And Mask Application').first().json.occupants ?? '')," +
          "($('Normalise And Mask Application').first().json.pets ?? 'none')," +
          "($('Normalise And Mask Application').first().json.vehicles ?? 'none')," +
          "JSON.stringify($('Normalise And Mask Application').first().json.disclosures)" +
          "] }}",
      },
    }
  ),

  /* ---- document extraction --------------------------------------------- */
  {
    ...wf.codeNode("Extract Paystub Text", "return $input.all();", [380, -160]),
    type: "n8n-nodes-base.extractFromFile",
    typeVersion: 1,
    parameters: {
      operation: "pdf",
      binaryPropertyName: "paystub",
      options: {},
    },
  },

  wf.openAiNode(
    "Extract Paystub Fields",
    {
      instructions: PAYSTUB_INSTRUCTIONS,
      schemaName: "paystub_fields",
      schema: PAYSTUB_SCHEMA,
      maxTokens: 700,
      content: "=Pay stub text:\n\n{{ $json.text }}",
    },
    [600, -160]
  ),

  /* ---- income verification, real API ----------------------------------- */
  wf.plaidNode(
    "Plaid: Create User",
    "/user/create",
    "={{ JSON.stringify({ client_user_id: 'leasing-' + $('Create Application Record').first().json.ref_token + '-' + Date.now() }) }}",
    [380, 160]
  ),

  wf.plaidNode(
    "Plaid: Init Sandbox Item",
    "/sandbox/public_token/create",
    "={{ JSON.stringify({ institution_id: 'ins_135842', initial_products: ['income_verification'], user_id: $json.user_id }) }}",
    [600, 160]
  ),

  wf.plaidNode(
    "Plaid: Get Payroll Income",
    "/credit/payroll_income/get",
    "={{ JSON.stringify({ user_id: $('Plaid: Create User').first().json.user_id }) }}",
    [820, 160]
  ),

  wf.codeNode("Compare Income Sources", verificationCode, [1040, 0]),

  wf.codeNode("Screening Bureau + Identity (MOCK)", mockChecksCode, [1260, 0]),

  wf.codeNode("Run Criteria Engine", criteriaCode, [1480, 0]),

  wf.postgresNode(
    "Save Verification Results",
    "UPDATE applications SET\n" +
      "  extracted_monthly_income = NULLIF($2::text,'')::numeric,\n" +
      "  extraction_evidence = $3::jsonb,\n" +
      "  verified_monthly_income = NULLIF($4::text,'')::numeric,\n" +
      "  plaid_raw = $5::jsonb,\n" +
      "  plaid_verified_at = now(),\n" +
      "  income_comparison = $6::jsonb,\n" +
      "  bureau_source = 'mock',\n" +
      "  credit_score = NULLIF($7::text,'')::int,\n" +
      "  eviction_filings = NULLIF($8::text,'')::int,\n" +
      "  bureau_raw = $9::jsonb,\n" +
      "  identity_source = 'mock',\n" +
      "  identity_match = TRUE,\n" +
      "  identity_confidence = NULLIF($10::text,'')::numeric,\n" +
      "  criteria_result = $11,\n" +
      "  criteria_evidence = $12::jsonb,\n" +
      "  criteria_evaluated_at = now(),\n" +
      "  status = 'awaiting_decision'\n" +
      "WHERE ref_token = $1 RETURNING *;",
    [1700, 0],
    {
      queryOptions: {
        queryReplacement:
          "={{ [" +
          "$json.ref_token," +
          "($('Compare Income Sources').first().json.extracted_monthly_income ?? '')," +
          "JSON.stringify($('Compare Income Sources').first().json.extraction)," +
          "($('Compare Income Sources').first().json.verified_monthly_income ?? '')," +
          "JSON.stringify($('Compare Income Sources').first().json.plaid_raw)," +
          "JSON.stringify($('Compare Income Sources').first().json.comparison)," +
          "($('Screening Bureau + Identity (MOCK)').first().json.credit_score ?? '')," +
          "($('Screening Bureau + Identity (MOCK)').first().json.eviction_filings ?? '')," +
          "JSON.stringify($('Screening Bureau + Identity (MOCK)').first().json.bureau_raw)," +
          "($('Screening Bureau + Identity (MOCK)').first().json.identity_confidence ?? '')," +
          "$json.criteria_result," +
          "JSON.stringify($json.criteria_evidence)" +
          "] }}",
      },
    }
  ),

  wf.ifNode(
    "Meets Criteria Or Conditional?",
    [wf.booleanCondition("={{ $('Run Criteria Engine').first().json.meets_or_conditional }}", true)],
    [1920, 0]
  ),

  /* ---- human decision --------------------------------------------------- */
  wf.telegramCardNode(
    "Send Decision Card",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "={{ $('Run Criteria Engine').first().json.summary }}\n\n" +
        "Nothing has been sent to the applicant. Your call.",
      buttonRows: [
        [
          { text: "Approve", callbackData: "=apr:{{ $('Run Criteria Engine').first().json.ref_token }}" },
          { text: "Conditional", callbackData: "=con:{{ $('Run Criteria Engine').first().json.ref_token }}" },
        ],
        [{ text: "Send to review", callbackData: "=rev:{{ $('Run Criteria Engine').first().json.ref_token }}" }],
      ],
    },
    [2140, -120]
  ),

  // does_not_meet stops here. No adverse-action notice is generated or sent -
  // that is a formal FCRA process, and automating it is how operators end up in
  // class actions. The stop is the feature.
  wf.telegramNode(
    "Stop For Human Review",
    {
      chatId: "=__TELEGRAM_CHAT_ID__",
      text:
        "={{ $('Run Criteria Engine').first().json.summary }}\n\n" +
        "STOPPED. This file does not meet the published criteria, so the system has taken " +
        "no further action and sent the applicant nothing.\n\n" +
        "Declining on the basis of a consumer report is a formal FCRA process and must be " +
        "done by a person:\n" +
        "{{ $('Run Criteria Engine').first().json.adverse_action_requirements.map(r => '  - ' + r).join('\\n') }}",
    },
    [2140, 120]
  ),

  wf.postgresNode(
    "Mark Stopped For Human",
    "UPDATE applications SET status = 'stopped_for_human' WHERE ref_token = $1;",
    [2360, 120],
    { queryOptions: { queryReplacement: "={{ [$('Run Criteria Engine').first().json.ref_token] }}" } }
  ),
];

/* ------------------------------------------------------------ connections */

const connections = wf.connect({
  // Deliberately one sequential chain rather than parallel branches.
  //
  // A Postgres node outputs query rows and drops binary data, so the uploaded
  // pay stub has to reach Extract Paystub Text before any database node runs.
  // Sequential also removes any ambiguity about whether the application row
  // exists by the time Compare Income Sources reads it.
  "Rental Application Form": [["Normalise And Mask Application"]],
  "Normalise And Mask Application": [["Extract Paystub Text"]],
  "Extract Paystub Text": [["Extract Paystub Fields"]],
  "Extract Paystub Fields": [["Load Unit For Application"]],
  "Load Unit For Application": [["Load Screening Criteria"]],
  "Load Screening Criteria": [["Create Application Record"]],
  "Create Application Record": [["Plaid: Create User"]],

  "Plaid: Create User": [["Plaid: Init Sandbox Item"]],
  "Plaid: Init Sandbox Item": [["Plaid: Get Payroll Income"]],
  "Plaid: Get Payroll Income": [["Compare Income Sources"]],

  "Compare Income Sources": [["Screening Bureau + Identity (MOCK)"]],
  "Screening Bureau + Identity (MOCK)": [["Run Criteria Engine"]],
  "Run Criteria Engine": [["Save Verification Results"]],
  "Save Verification Results": [["Meets Criteria Or Conditional?"]],
  "Meets Criteria Or Conditional?": [["Send Decision Card"], ["Stop For Human Review"]],
  "Stop For Human Review": [["Mark Stopped For Human"]],
});

const mirror = require('./lib/pipeline-mirror');
mirror.attach(wf,nodes,connections,'Save Verification Results','$json.ref_token','Application');
mirror.attach(wf,nodes,connections,'Mark Stopped For Human','$json.ref_token','Review Stop');
const workflow = wf.buildWorkflow({
  id: "wf2-application-and-verify",
  name: "WF2 Application And Verify",
  nodes,
  connections,
  active: true,
});

const count = wf.writeWorkflow(workflow, OUT);
console.log(`wf2-application-and-verify.json written, ${count} nodes`);
