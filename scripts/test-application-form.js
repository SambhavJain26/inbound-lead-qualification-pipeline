const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { fields, buildFields } = require('./lib/application-form');
const workflow = JSON.parse(fs.readFileSync('n8n-workflows/wf2-application-and-verify.json', 'utf8'));
const code = workflow.nodes.find(n => n.name === 'Normalise And Mask Application').parameters.jsCode;
const form = Object.fromEntries(fields.map(([key, label]) => [label, key === 'fcra_consent' ? 'I authorize the synthetic demo checks' : '']));
Object.assign(form, { ref_token: 'R-6343', 'Full name': 'Maya Restrepo', 'Email address': 'maya.restrepo.demo@example.com', 'Home you are applying for': 'MAPLE-2B', 'Gross monthly income ($)': '5,000', 'Demo identity code (last four digits only)': '1234' });
function normalize(json) {
  return vm.runInNewContext('(function(){' + code + '})()', { $input: { all: () => [{ json, binary: { 'field-26': { mimeType: 'application/pdf' } } }] } });
}
assert.equal(buildFields().filter(f => f.fieldType === 'html').length, 7);
const result = normalize(form)[0];
assert.equal(result.json.lead_ref_token, 'R-6343');
assert.equal(result.json.full_name, 'Maya Restrepo');
assert.equal(result.json.claimed_monthly_income, 5000);
assert.equal(result.json.ssn_last4, '1234');
assert.ok(result.binary.paystub);
assert.throws(() => normalize({ ...form, 'Demo verification authorization': '' }), /authorization is required/);
assert.equal(normalize({ ...form, ref_token: '[R-6343]' })[0].json.lead_ref_token, 'R-6343');
console.log('8 application form checks passed.');
