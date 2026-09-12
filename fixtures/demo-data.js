/**
 * Demo fixtures. Everything here is fabricated: names, employers, addresses,
 * amounts. No real person, property, SSN, or account number appears anywhere.
 *
 * The numbers are pinned to what Plaid Sandbox actually returns, captured in
 * fixtures/plaid-payroll-income.json:
 *
 *   gross per pay period : $2,306
 *   frequency            : BIWEEKLY
 *   verified monthly     : 2306 * 26 / 12 = $4,996.33
 *
 * Sandbox returns that same figure for every applicant, so the two demo paths
 * are separated by RENT rather than by income:
 *
 *   Maya  -> $1,650 unit -> 4996 / 1650 = 3.03x  -> meets criteria
 *   Devon -> $1,950 unit -> 4996 / 1950 = 2.56x  -> below the 3x threshold,
 *                                                   AND his paystub claims
 *                                                   $7,800/mo, a 56% overstatement
 *
 * Devon is the point of the demo: on his paperwork he clears 4.0x and would
 * have been approved. Verified against his actual payroll deposits he does not
 * clear at all.
 */

const PLAID_BIWEEKLY_GROSS = 2306;
const VERIFIED_MONTHLY = Math.round((PLAID_BIWEEKLY_GROSS * 26) / 12 * 100) / 100; // 4996.33

const criteriaConfig = {
  name: "Default screening criteria",
  income_multiple: 3.0,
  min_credit_score: 650,
  conditional_credit_min: 600,
  max_eviction_filings: 0,
  eviction_lookback_years: 5,
  income_mismatch_tolerance_pct: 10.0,
};

const units = [
  {
    unit_code: "MAPLE-2B",
    address: "412 Maple Street, Apt 2B, Springfield",
    beds: 2,
    baths: 1.0,
    sqft: 880,
    rent_amount: 1650.0,
    deposit_amount: 1650.0,
    available_from: "2026-10-01",
    pet_policy: "Cats and dogs under 50 lbs welcome. Two pets maximum. Breed restrictions apply.",
    pet_fee_monthly: 35.0,
    parking: "One assigned surface space included. Second space $50/month if available.",
    utilities_included: "Water, sewer, and trash included. Resident pays electric and gas.",
    laundry: "Shared laundry room on the ground floor, card operated.",
    lease_term_months: 12,
    faq_facts: {
      air_conditioning: "Central air.",
      heating: "Forced-air gas heat.",
      appliances: "Refrigerator, gas range, dishwasher, and microwave.",
      flooring: "Luxury vinyl plank throughout, tile in the bathroom.",
      storage: "One assigned basement storage locker.",
      smoking: "Non-smoking building, including balconies.",
      application_fee: "$45 per adult applicant, non-refundable.",
      tour_options: "Self-guided tours available daily 9am-6pm with a one-time door code.",
      floor: "Second floor, no elevator in the building.",
      balcony: "Private balcony off the living room.",
    },
  },
  {
    unit_code: "MAPLE-5A",
    address: "412 Maple Street, Apt 5A, Springfield",
    beds: 3,
    baths: 2.0,
    sqft: 1240,
    rent_amount: 1950.0,
    deposit_amount: 1950.0,
    available_from: "2026-10-15",
    pet_policy: "Cats and dogs under 50 lbs welcome. Two pets maximum. Breed restrictions apply.",
    pet_fee_monthly: 35.0,
    parking: "Two assigned surface spaces included.",
    utilities_included: "Water, sewer, and trash included. Resident pays electric and gas.",
    laundry: "In-unit washer and dryer.",
    lease_term_months: 12,
    faq_facts: {
      air_conditioning: "Central air.",
      heating: "Forced-air gas heat.",
      appliances: "Refrigerator, gas range, dishwasher, microwave, washer and dryer.",
      flooring: "Luxury vinyl plank throughout, tile in both bathrooms.",
      storage: "One assigned basement storage locker.",
      smoking: "Non-smoking building, including balconies.",
      application_fee: "$45 per adult applicant, non-refundable.",
      tour_options: "Self-guided tours available daily 9am-6pm with a one-time door code.",
      floor: "Top floor corner unit, no elevator in the building.",
      balcony: "Two balconies, living room and primary bedroom.",
    },
  },
];

/**
 * The inbound lead email, in the shape Zillow actually sends: an anonymised
 * relay reply-to address and no phone number.
 */
const leadEmail = {
  from_name: "Zillow Rental Manager",
  from_addr: "no-reply@mail.zillow.com",
  reply_to: "maya.restrepo.demo@convo.zillow.com",
  subject: "New rental inquiry: 412 Maple Street, Apt 2B",
  prospect_name: "Maya Restrepo",
  unit_code: "MAPLE-2B",
  body: [
    "You have a new rental inquiry.",
    "",
    "Property: 412 Maple Street, Apt 2B, Springfield",
    "Renter: Maya Restrepo",
    "",
    'Message: "Hi! I saw the 2 bedroom on Maple Street and I am really interested.',
    "Is parking included, and do you allow a small dog? I am hoping to move in",
    'early October. Thanks!"',
    "",
    "Reply to this email to respond to Maya. Your personal email address stays private.",
  ].join("\n"),
};

/**
 * The two applicants. `paystub` is what the uploaded document claims; the
 * criteria engine compares it against what Plaid actually reports.
 */
const applicants = [
  {
    key: "maya",
    label: "clean approval path",
    ref_token: "A-4417",
    unit_code: "MAPLE-2B",
    full_name: "Maya Restrepo",
    email: "maya.restrepo.demo@example.com",
    phone: "555-0142",
    ssn_last4: "1234",
    current_address: "88 Cedar Lane, Apt 4, Springfield",
    prior_address: "17 Birch Court, Springfield",
    desired_move_in: "2026-10-01",
    employer_name: "Northgate Dental Group",
    job_title: "Dental Hygienist",
    employment_start_date: "2023-04-17",
    claimed_monthly_income: 5000.0,
    occupants: [{ name: "Maya Restrepo", adult: true }],
    pets: [{ type: "dog", weight_lbs: 18, name: "Pepper" }],
    vehicles: [{ make: "Honda", model: "Civic", color: "blue", plate: "DEMO-101" }],
    disclosures: {
      prior_eviction_filing: false,
      broken_lease: false,
      bankruptcy_7_years: false,
      smoker: false,
    },
    rental_assistance_amount: 0,
    paystub: {
      // Agrees with Plaid: 2306 biweekly.
      employer: "Northgate Dental Group",
      employee: "Maya Restrepo",
      pay_period_start: "2026-08-28",
      pay_period_end: "2026-09-11",
      pay_frequency: "BIWEEKLY",
      gross_this_period: 2306.0,
      implied_monthly: VERIFIED_MONTHLY,
    },
    // Mock bureau result for this applicant
    bureau: { credit_score: 712, eviction_filings: 0 },
    identity: { match: true, confidence: 0.97 },
    expected: {
      criteria_result: "meets_criteria",
      income_matches: true,
      note: "3.03x on a $1,650 unit, credit above 650, no evictions, documents agree",
    },
  },
  {
    key: "devon",
    label: "fraud flag path",
    ref_token: "A-4418",
    unit_code: "MAPLE-5A",
    full_name: "Devon Clarke",
    email: "devon.clarke.demo@example.com",
    phone: "555-0198",
    ssn_last4: "5678",
    current_address: "230 Walnut Avenue, Apt 12, Springfield",
    prior_address: "9 Sycamore Road, Springfield",
    desired_move_in: "2026-10-15",
    employer_name: "Halcyon Logistics LLC",
    job_title: "Operations Supervisor",
    employment_start_date: "2024-11-04",
    claimed_monthly_income: 7800.0,
    occupants: [
      { name: "Devon Clarke", adult: true },
      { name: "Second occupant", adult: true },
    ],
    pets: [],
    vehicles: [{ make: "Toyota", model: "Tacoma", color: "grey", plate: "DEMO-202" }],
    disclosures: {
      prior_eviction_filing: false,
      broken_lease: false,
      bankruptcy_7_years: false,
      smoker: false,
    },
    rental_assistance_amount: 0,
    paystub: {
      // Does NOT agree with Plaid. 3600 biweekly = $7,800/mo claimed,
      // against $4,996/mo actually deposited. A 56% overstatement.
      employer: "Halcyon Logistics LLC",
      employee: "Devon Clarke",
      pay_period_start: "2026-08-28",
      pay_period_end: "2026-09-11",
      pay_frequency: "BIWEEKLY",
      gross_this_period: 3600.0,
      implied_monthly: 7800.0,
    },
    bureau: { credit_score: 688, eviction_filings: 0 },
    identity: { match: true, confidence: 0.94 },
    expected: {
      criteria_result: "does_not_meet",
      income_matches: false,
      note:
        "Paystub implies $7,800/mo (4.0x). Plaid reports $4,996/mo (2.56x on a $1,950 unit). " +
        "Fails the income multiple and trips the document mismatch flag. Stops for a human.",
    },
  },
];

module.exports = {
  PLAID_BIWEEKLY_GROSS,
  VERIFIED_MONTHLY,
  criteriaConfig,
  units,
  leadEmail,
  applicants,
};
