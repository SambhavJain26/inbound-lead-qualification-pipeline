/* Plan exported Postgres statements without executing business writes or resets. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { REPO_ROOT, loadEnv } = require('./lib/env');
const env = loadEnv();
const statements = [];
const names = [];
for (const file of fs.readdirSync(path.join(REPO_ROOT, 'n8n-workflows')).filter(f => f.endsWith('.json'))) {
  const workflow = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'n8n-workflows', file), 'utf8'));
  for (const node of workflow.nodes.filter(n => n.type === 'n8n-nodes-base.postgres')) {
    const query = node.parameters.query;
    if (!query || query.startsWith('=')) continue;
    const index = statements.length;
    names.push(file + ' / ' + node.name);
    statements.push('PREPARE verify_' + index + ' AS ' + query.replace(/;\s*$/, '') + '; DEALLOCATE verify_' + index + ';');
  }
}
const result = cp.spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql',
  '-U', env.POSTGRES_USER || 'leasing', '-d', env.POSTGRES_DB || 'leasing', '-v', 'ON_ERROR_STOP=1'],
{ cwd: REPO_ROOT, input: statements.join('\n'), encoding: 'utf8' });
if (result.error) throw result.error;
if (result.status) {
  const completed = (result.stdout.match(/^DEALLOCATE$/gm) || []).length;
  console.error('Planning failed:', names[completed]);
  console.error(result.stderr.trim());
  process.exitCode = 1;
} else console.log(statements.length + ' exported SQL statements planned; no business data modified.');
