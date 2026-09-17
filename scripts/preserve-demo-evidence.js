/** Generated local evidence before reset; never commit the resulting snapshot. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {REPO_ROOT,loadEnv}=require('./lib/env');
const env=loadEnv();
const directory=path.join(REPO_ROOT,'tmp','evidence-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(directory,{recursive:true});
const dump=execFileSync('docker',['compose','exec','-T','postgres','pg_dump','-U',env.POSTGRES_USER||'leasing','-d',env.POSTGRES_DB||'leasing','--no-owner','--no-privileges'],{cwd:REPO_ROOT,encoding:'utf8'});
fs.writeFileSync(path.join(directory,'postgres-before-reset.sql'),dump);
console.log('Recoverable Postgres snapshot: '+directory);
