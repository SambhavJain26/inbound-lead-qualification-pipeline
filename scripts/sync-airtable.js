/** Rebuild the display-only board from Postgres using deterministic upserts. */
const { execFileSync } = require('child_process');
const { REPO_ROOT, loadEnv } = require('./lib/env');
const { SQL, toFields } = require('./lib/pipeline-mirror');
const env = loadEnv(['AIRTABLE_PAT', 'AIRTABLE_BASE_ID']);

async function main() {
  const raw = execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql',
    '-U', env.POSTGRES_USER || 'leasing', '-d', env.POSTGRES_DB || 'leasing',
    '-tA', '-v', 'ON_ERROR_STOP=1'], {
    cwd: REPO_ROOT,
    input: "SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) FROM (" + SQL + ') p;',
    encoding: 'utf8',
  });
  const rows = JSON.parse(raw);
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(rows.map(toFields), null, 2));
    return;
  }
  for (let i = 0; i < rows.length; i += 10) {
    const response = await fetch('https://api.airtable.com/v0/' + env.AIRTABLE_BASE_ID + '/Leads', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + env.AIRTABLE_PAT, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ['Ref Token'] }, typecast: true,
        records: rows.slice(i, i + 10).map(row => ({ fields: toFields(row) })),
      }),
    });
    if (!response.ok) throw new Error('Airtable HTTP ' + response.status + ': ' + (await response.text()).slice(0, 250));
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  console.log('Board synced from Postgres: ' + rows.length + ' row(s).');
  if (!rows.length) console.log('Existing mirror rows are not deleted. Use reset-demo.js --with-airtable for a clean rehearsal.');
}
main().catch(error => { console.error('FAILED: ' + error.message); process.exitCode = 1; });
