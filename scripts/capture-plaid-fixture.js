/**
 * Runs the Plaid Sandbox payroll-income flow and saves the real response to
 * fixtures/plaid-payroll-income.json.
 *
 * Done in Stage 2 rather than Stage 4 because the demo fixtures depend on it:
 * Sandbox returns a fixed income for `user_good`, so the paystub fixtures have
 * to be built around whatever number Plaid actually reports. Maya's paystub
 * must agree with it; Devon's must not.
 *
 * Flow (no Link required):
 *   /user/create -> /sandbox/public_token/create (ins_135842) -> /credit/payroll_income/get
 *
 * Usage:
 *   node scripts/capture-plaid-fixture.js
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT, loadEnv } = require("./lib/env");

const env = loadEnv(["PLAID_CLIENT_ID", "PLAID_SANDBOX_SECRET"]);
const BASE = "https://sandbox.plaid.com";
const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures");

async function plaid(endpoint, body = {}) {
  const response = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SANDBOX_SECRET,
      ...body,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${endpoint} -> ${response.status} ${payload.error_code || ""}: ${
        payload.error_message || JSON.stringify(payload).slice(0, 200)
      }`
    );
  }
  return payload;
}

async function main() {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  console.log("1. /user/create");
  const user = await plaid("/user/create", {
    client_user_id: `leasing-demo-${Date.now()}`,
  });
  console.log(`   keys returned: ${Object.keys(user).join(", ")}`);

  console.log("2. /sandbox/public_token/create (ins_135842)");
  await plaid("/sandbox/public_token/create", {
    institution_id: "ins_135842",
    initial_products: ["income_verification"],
    user_id: user.user_id,
  });
  console.log("   user initialised for payroll income");

  console.log("3. /credit/payroll_income/get");
  // Newer integrations pass user_id; user_token is legacy.
  const payroll = await plaid("/credit/payroll_income/get", {
    user_id: user.user_id,
  });

  const outPath = path.join(FIXTURE_DIR, "plaid-payroll-income.json");
  fs.writeFileSync(outPath, JSON.stringify(payroll, null, 2), "utf8");
  console.log(`   saved -> ${path.relative(REPO_ROOT, outPath)}`);

  // Summarise what the demo actually needs out of this payload.
  console.log("\n--- what the demo will read ---");
  const items = payroll.items || [];
  for (const item of items) {
    for (const source of item.payroll_income || []) {
      const acct = source.account_id ? ` account ${source.account_id}` : "";
      console.log(`employer: ${source.employer?.name || "(none)"}${acct}`);

      for (const stub of source.pay_stubs || []) {
        const d = stub.pay_period_details || {};
        console.log(
          `  pay period ${d.start_date || "?"} -> ${d.end_date || "?"}  ` +
            `gross ${d.gross_earnings ?? "?"}  net ${d.net_earnings_this_period ?? d.net_earnings ?? "?"}  ` +
            `freq ${d.pay_frequency || "?"}`
        );
        if (stub.earnings?.total) {
          console.log(`    earnings.total: ${JSON.stringify(stub.earnings.total)}`);
        }
        if (stub.employee?.name) console.log(`    employee: ${stub.employee.name}`);
      }
    }
  }

  if (!items.length) {
    console.log("(no items returned - inspect the saved fixture directly)");
  }
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
