// Display labels and machine keys share one definition. Form Trigger 2.4 uses
// fieldName; normalization also accepts labels from older form submissions.
const fields = [
  ['ref_token', 'ref_token', 'hiddenField', false],
  ['unit_code', 'Home you are applying for', 'dropdown', true],
  ['full_name', 'Full name', 'text', true, 'First and last name'],
  ['email', 'Email address', 'email', true, 'Where we can contact you'],
  ['phone', 'Phone number', 'text', false],
  ['ssn', 'Demo identity code (last four digits only)', 'text', true, 'Use 1234. Do not enter a real SSN.'],
  ['current_address', 'Current address', 'text', true, 'Street, apartment, city, state and ZIP'],
  ['prior_address', 'Previous address', 'text', false, 'If you moved within the past two years'],
  ['desired_move_in', 'Requested move-in date', 'date', true],
  ['employer_name', 'Employer or income provider', 'text', true],
  ['job_title', 'Job title (if applicable)', 'text', false],
  ['claimed_monthly_income', 'Gross monthly income ($)', 'number', true, 'Before taxes and deductions'],
  ['rental_assistance_amount', 'Monthly rental assistance amount ($)', 'number', false, 'Enter 0 if not applicable'],
  ['occupants', 'Total number of occupants', 'number', true, 'Count everyone who would live in the home'],
  ['pets', 'Pets', 'text', false, 'Type, number and weight; or none'],
  ['vehicles', 'Vehicles needing parking', 'text', false, 'Number, make and model; or none'],
  ['prior_eviction', 'Have you had an eviction filing?', 'dropdown', true],
  ['broken_lease', 'Have you broken a rental lease?', 'dropdown', true],
  ['bankruptcy', 'Have you filed bankruptcy in the past seven years?', 'dropdown', true],
  ['paystub', 'Upload your most recent pay stub (PDF)', 'file', true],
  ['fcra_consent', 'Demo verification authorization', 'dropdown', true],
];
const sections = {
  ref_token: ['The home', 'Select the home you toured. Your application reference is carried over from your message.'],
  full_name: ['Your contact details', 'Synthetic applicant details only. Never enter real identity or bank information.'],
  current_address: ['Residential history', 'Include your apartment number and complete address.'],
  desired_move_in: ['Move-in and income', 'Report gross monthly income before taxes. These details support verification, not an automatic rental decision.'],
  occupants: ['Occupants, pets and parking', 'Provide counts and property-related details only. Do not include ages or relationships.'],
  prior_eviction: ['Rental disclosures', 'These self-reported answers do not produce an automatic decision.'],
  paystub: ['Supporting document and authorization', 'Upload a synthetic PDF pay stub. Income verification uses Plaid Sandbox; identity, credit and eviction checks are MOCK. No real consumer report is requested.'],
};
function buildFields() {
  return fields.flatMap(([key, label, type, required, placeholder]) => {
    const result = [];
    if (sections[key]) {
      const [title, text] = sections[key];
      result.push({ fieldType: 'html', html: '<h2>' + title + '</h2><p>' + text + '</p>' });
    }
    const field = { fieldName: key, fieldLabel: label, fieldType: type, requiredField: required };
    if (placeholder) field.placeholder = placeholder;
    if (type === 'dropdown') {
      const options = key === 'unit_code' ? ['MAPLE-2B', 'MAPLE-5A'] :
        key === 'fcra_consent' ? ['I authorize the synthetic demo checks'] : ['No', 'Yes'];
      field.fieldOptions = { values: options.map(option => ({ option })) };
    }
    if (type === 'file') Object.assign(field, { acceptFileTypes: '.pdf', multipleFiles: false });
    result.push(field);
    return result;
  });
}
module.exports = { fields, buildFields };
