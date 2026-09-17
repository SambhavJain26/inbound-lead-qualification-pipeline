/** Requires the temporary mirror probe. Synthetic state tests, not real tour attendance. */
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {REPO_ROOT,loadEnv}=require('./lib/env');
const env=loadEnv();
const psql=sql=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U',env.POSTGRES_USER||'leasing','-d',env.POSTGRES_DB||'leasing','-tA','-v','ON_ERROR_STOP=1'],{cwd:REPO_ROOT,input:sql,encoding:'utf8'});
async function main() {
  psql("INSERT INTO leads(ref_token,unit_id,source,prospect_name,prospect_email,status) SELECT 'R-7990',id,'listing_site','Milestone Tester','milestone.tester.demo@example.com','new' FROM units WHERE unit_code='MAPLE-2B' ON CONFLICT(ref_token) DO NOTHING;");
  for(const [stage,label] of [['prequalified','Prequalified'],['tour_booked','Tour Booked'],['toured','Toured']]) {
    psql("UPDATE leads SET status='"+stage+"' WHERE ref_token='R-7990';");
    const response=await fetch('http://localhost:5678/webhook/pipeline-mirror-probe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref_token:'R-7990'})});
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal((body.records||body[0]?.records)?.[0]?.fields.Status,label);
    console.log('PASS live mirror: '+label);
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
