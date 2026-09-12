/**
 * Screening logic: income comparison and the deterministic criteria engine.
 *
 * Inlined into n8n Code nodes, so it stays dependency-free and avoids backticks
 * and template literals - those are consumed before the code reaches the node.
 *
 * NOTHING HERE CALLS A MODEL. The criteria engine reads manager-configured
 * thresholds and applies them identically to every applicant, which is what
 * HUD's May 2024 guidance describes when it says a screening tool should
 * "implement, rather than set" the housing provider's policies.
 *
 * It emits a classification and an evidence trail. It never emits a decision,
 * a score, a rank, or a recommendation - a human does that.
 */

/* --------------------------------------------------------------------- PII */

/**
 * An application form collects an SSN because a real one does. We keep the last
 * four and discard the rest on arrival; the raw value is never stored.
 */
function maskSsn(raw) {
  var digits = String(raw || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

/* ------------------------------------------------------- Plaid normalisation */

var PERIODS_PER_YEAR = {
  WEEKLY: 52,
  BIWEEKLY: 26,
  SEMI_MONTHLY: 24,
  SEMIMONTHLY: 24,
  MONTHLY: 12,
  ANNUALLY: 1,
  ANNUAL: 1,
};

function monthlyFromPeriod(amount, frequency) {
  var perYear = PERIODS_PER_YEAR[String(frequency || "").toUpperCase()];
  if (!perYear || !amount) return null;
  return Math.round((amount * perYear) / 12 * 100) / 100;
}

/**
 * Pulls verified monthly income out of a /credit/payroll_income/get response.
 *
 * Uses the most recent pay stub and its stated frequency rather than summing
 * year-to-date, because YTD in Sandbox is not a full year and would understate
 * the figure.
 */
function parsePlaidPayrollIncome(response) {
  var result = {
    verified_monthly_income: null,
    employer_name: null,
    pay_frequency: null,
    gross_per_period: null,
    pay_period_end: null,
    employee_name: null,
    source: "plaid_sandbox",
    warnings: [],
  };

  var items = (response && response.items) || [];
  var stub = null;
  var source = null;

  for (var i = 0; i < items.length && !stub; i++) {
    var sources = items[i].payroll_income || [];
    for (var j = 0; j < sources.length && !stub; j++) {
      var stubs = sources[j].pay_stubs || [];
      if (stubs.length) {
        source = sources[j];
        // Most recent period first.
        stub = stubs.slice().sort(function (a, b) {
          var ea = (a.pay_period_details || {}).end_date || "";
          var eb = (b.pay_period_details || {}).end_date || "";
          return eb.localeCompare(ea);
        })[0];
      }
    }
  }

  if (!stub) {
    result.warnings.push("no pay stubs in the Plaid response");
    return result;
  }

  var details = stub.pay_period_details || {};
  result.employer_name = (source && source.employer && source.employer.name) || null;
  result.employee_name = (stub.employee && stub.employee.name) || null;
  result.pay_frequency = details.pay_frequency || null;
  result.gross_per_period = details.gross_earnings === undefined ? null : details.gross_earnings;
  result.pay_period_end = details.end_date || null;

  result.verified_monthly_income = monthlyFromPeriod(result.gross_per_period, result.pay_frequency);
  if (result.verified_monthly_income === null) {
    result.warnings.push("could not derive a monthly figure from gross " +
      result.gross_per_period + " at frequency " + result.pay_frequency);
  }

  return result;
}

/* ------------------------------------------------------- income comparison */

/**
 * The three numbers the demo puts side by side.
 *
 *   claimed   - what the applicant typed on the form
 *   extracted - what the model read off the uploaded pay stub
 *   verified  - what the bank actually shows
 *
 * A pay stub can be edited in a photo editor. A deposit history cannot. When
 * these disagree beyond tolerance the file is flagged for a human.
 */
function computeIncomeComparison(input) {
  var claimed = input.claimed === null || input.claimed === undefined ? null : Number(input.claimed);
  var extracted = input.extracted === null || input.extracted === undefined ? null : Number(input.extracted);
  var verified = input.verified === null || input.verified === undefined ? null : Number(input.verified);
  var tolerance = Number(input.tolerancePct === undefined ? 10 : input.tolerancePct);

  function variance(value) {
    if (value === null || verified === null || verified === 0) return null;
    return Math.round(Math.abs(value - verified) / verified * 1000) / 10;
  }

  var documentVariance = variance(extracted);
  var claimedVariance = variance(claimed);

  return {
    claimed_monthly: claimed,
    extracted_monthly: extracted,
    verified_monthly: verified,
    tolerance_pct: tolerance,
    document_variance_pct: documentVariance,
    claimed_variance_pct: claimedVariance,
    document_matches: documentVariance === null ? null : documentVariance <= tolerance,
    claimed_matches: claimedVariance === null ? null : claimedVariance <= tolerance,
    // The single fact the manager needs at a glance.
    mismatch_flagged:
      (documentVariance !== null && documentVariance > tolerance) ||
      (claimedVariance !== null && claimedVariance > tolerance),
  };
}

/* ---------------------------------------------------------- criteria engine */

function evidence(criterion, met, detail, source) {
  return { criterion: criterion, met: met, detail: detail, source: source || null };
}

/**
 * Applies the manager's published criteria.
 *
 * @returns {{result: string, evidence: Array, tenant_responsible_rent: number}}
 *   result is one of meets_criteria | conditional | does_not_meet.
 */
function runCriteriaEngine(input) {
  var app = input.application || {};
  var unit = input.unit || {};
  var config = input.config || {};
  var comparison = input.comparison || {};

  var incomeMultiple = Number(config.income_multiple || 3);
  var minCredit = Number(config.min_credit_score || 650);
  var conditionalCredit = Number(config.conditional_credit_min || 600);
  var maxEvictions = Number(config.max_eviction_filings || 0);

  var rent = Number(unit.rent_amount || 0);
  var assistance = Number(app.rental_assistance_amount || 0);

  // The income multiple applies to the tenant's share of rent, not gross rent.
  // Requiring a voucher holder to earn 3x the FULL rent is treated as
  // source-of-income discrimination in the jurisdictions that protect it.
  var tenantRent = Math.max(rent - assistance, 0);

  var trail = [];
  var verified = comparison.verified_monthly === undefined ? null : comparison.verified_monthly;

  /* income multiple, against verified income only */
  if (verified === null || !tenantRent) {
    trail.push(evidence("income_multiple", null,
      "cannot evaluate: verified income or rent is missing", null));
  } else {
    var ratio = Math.round(verified / tenantRent * 100) / 100;
    var detail = "$" + verified + "/mo verified against $" + tenantRent +
      " tenant-responsible rent = " + ratio.toFixed(2) + "x, threshold " +
      incomeMultiple.toFixed(2) + "x";
    if (assistance > 0) {
      detail += " (rent $" + rent + " less $" + assistance + " rental assistance)";
    }
    trail.push(evidence("income_multiple", ratio >= incomeMultiple, detail, {
      document: "plaid_payroll_income",
      field: "verified_monthly_income",
      value: verified,
    }));
  }

  /* documented income vs verified income */
  if (comparison.document_matches === null || comparison.document_matches === undefined) {
    trail.push(evidence("income_document_match", null,
      "cannot evaluate: no extracted document income", null));
  } else {
    trail.push(evidence("income_document_match", comparison.document_matches,
      "pay stub implies $" + comparison.extracted_monthly + "/mo against $" +
        comparison.verified_monthly + "/mo verified, variance " +
        comparison.document_variance_pct + "% (tolerance " + comparison.tolerance_pct + "%)",
      { document: "uploaded_paystub", field: "gross_this_period", value: comparison.extracted_monthly }));
  }

  /* credit - mocked data, real threshold */
  var credit = app.credit_score === null || app.credit_score === undefined ? null : Number(app.credit_score);
  if (credit === null) {
    trail.push(evidence("credit_score", null, "cannot evaluate: no credit score", null));
  } else {
    trail.push(evidence("credit_score", credit >= minCredit,
      credit + " against a " + minCredit + " threshold" +
        (credit < minCredit && credit >= conditionalCredit
          ? ", within the " + conditionalCredit + "-" + (minCredit - 1) + " conditional band"
          : ""),
      { document: "screening_bureau_mock", field: "credit_score", value: credit }));
  }

  /* eviction filings - mocked data, real threshold */
  var evictions = app.eviction_filings === null || app.eviction_filings === undefined
    ? null : Number(app.eviction_filings);
  if (evictions === null) {
    trail.push(evidence("eviction_history", null, "cannot evaluate: no eviction data", null));
  } else {
    trail.push(evidence("eviction_history", evictions <= maxEvictions,
      evictions + " filing(s) in the last " + (config.eviction_lookback_years || 5) +
        " years, maximum " + maxEvictions,
      { document: "screening_bureau_mock", field: "eviction_filings", value: evictions }));
  }

  /* identity - mocked */
  if (app.identity_match === null || app.identity_match === undefined) {
    trail.push(evidence("identity_check", null, "cannot evaluate: no identity result", null));
  } else {
    trail.push(evidence("identity_check", Boolean(app.identity_match),
      app.identity_match ? "document and applicant details matched" : "identity did not match",
      { document: "identity_check_mock", field: "match", value: app.identity_match }));
  }

  /* ------------------------------------------------------------ outcome */

  var failed = trail.filter(function (e) { return e.met === false; });
  var unknown = trail.filter(function (e) { return e.met === null; });

  var result;
  if (failed.length === 0 && unknown.length === 0) {
    result = "meets_criteria";
  } else if (failed.length === 0) {
    // Nothing failed, but something could not be evaluated. That is a human's
    // call, not a pass.
    result = "conditional";
  } else {
    var onlyCreditInBand =
      failed.length === 1 &&
      failed[0].criterion === "credit_score" &&
      credit !== null &&
      credit >= conditionalCredit;
    result = onlyCreditInBand ? "conditional" : "does_not_meet";
  }

  return {
    result: result,
    evidence: trail,
    tenant_responsible_rent: tenantRent,
    failed_criteria: failed.map(function (e) { return e.criterion; }),
    unevaluated_criteria: unknown.map(function (e) { return e.criterion; }),
    evaluated_at: new Date().toISOString(),
  };
}

/**
 * What a real FCRA adverse-action process would require. Shown to the manager
 * on the stop path so the demo makes the point explicitly.
 *
 * This build never generates any of these documents.
 */
function adverseActionRequirements() {
  return [
    "Pre-adverse-action notice, including a copy of the consumer report",
    "A copy of the FCRA Summary of Rights",
    "A waiting period for the applicant to dispute (commonly five business days)",
    "A final adverse-action notice naming the bureau that supplied the report",
  ];
}

if (typeof module !== "undefined") {
  module.exports = {
    maskSsn,
    monthlyFromPeriod,
    parsePlaidPayrollIncome,
    computeIncomeComparison,
    runCriteriaEngine,
    adverseActionRequirements,
  };
}
