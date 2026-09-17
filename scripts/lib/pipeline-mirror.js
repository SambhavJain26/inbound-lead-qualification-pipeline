// One deterministic pipeline projection for live mirrors and rebuilds.
const SQL = `SELECT l.ref_token, l.prospect_name, l.prospect_email, u.unit_code,
 l.status AS lead_status, l.move_in_date, l.stated_monthly_income, l.tour_starts_at,
 a.ref_token AS application_ref, a.status AS application_status, a.decision,
 a.lease_status, a.verified_monthly_income,
 a.income_comparison->>'mismatch_flagged' AS mismatch_flagged,
 a.income_comparison->>'document_variance_pct' AS variance_pct,
 GREATEST(l.updated_at,COALESCE(a.updated_at,l.updated_at)) AS updated_at
 FROM leads l JOIN units u ON u.id=l.unit_id
 LEFT JOIN LATERAL (SELECT * FROM applications WHERE lead_id=l.id ORDER BY id DESC LIMIT 1) a ON true
 UNION ALL
 SELECT a.ref_token,a.full_name,a.email,u.unit_code,'applied',a.desired_move_in,
 a.claimed_monthly_income,NULL,a.ref_token,a.status,a.decision,a.lease_status,
 a.verified_monthly_income,a.income_comparison->>'mismatch_flagged',
 a.income_comparison->>'document_variance_pct',a.updated_at
 FROM applications a JOIN units u ON u.id=a.unit_id WHERE a.lead_id IS NULL`;
function toFields(row) {
  const labels = {new:'New',engaged:'Engaged',prequalified:'Prequalified',tour_booked:'Tour Booked',toured:'Toured',applied:'Applied',closed:'Decided'};
  let status = labels[row.lead_status] || 'New';
  if (row.application_status) status='Applied';
  if (row.decision) status='Decided';
  if (row.application_status==='stopped_for_human' || row.decision==='sent_to_review') status='Stopped For Review';
  if (row.lease_status==='sent') status='Lease Sent';
  if (row.lease_status==='signed') status='Leased';
  const actions = {New:'Reply to inquiry',Engaged:'Collect prequalification',Prequalified:'Schedule tour','Tour Booked':'Attend tour',Toured:'Submit application',Applied:'Manager review',Decided:row.decision==='conditional'?'Manager follow-up':'Prepare lease','Stopped For Review':'Human review — no automated outcome message','Lease Sent':'Await signature',Leased:'Complete move-in handoff'};
  const stamp = value => value ? new Date(value).toISOString() : '';
  return {'Ref Token':row.ref_token,Prospect:row.prospect_name||'',Email:row.prospect_email||'',Unit:row.unit_code||'',Status:status,
   'Move In':row.move_in_date||null,'Stated Income':row.stated_monthly_income?Math.round(Number(row.stated_monthly_income)):null,
   'Verified Income':row.verified_monthly_income?Math.round(Number(row.verified_monthly_income)):null,
   'Income Flag':String(row.mismatch_flagged)==='true'?'MISMATCH '+Math.round(Number(row.variance_pct))+'% over verified':row.verified_monthly_income?'Verified, documents agree':'',
   Tour:stamp(row.tour_starts_at),Updated:stamp(row.updated_at),'Application Reference':row.application_ref||'',
   'Next Action':actions[status]||'Human review','Lease Status':row.lease_status||'not_sent','Last Synced At':new Date().toISOString(),'Demo Data':true};
}
function attach(wf,nodes,connections,source,tokenExpression,suffix) {
  const read='Mirror: Read Pipeline '+suffix;
  const map='Mirror: Map Pipeline '+suffix;
  const send='Mirror: Upsert Airtable '+suffix;
  const query=wf.postgresNode(read,'SELECT * FROM ('+SQL+') p WHERE p.ref_token=$1 OR p.application_ref=$1',[4200,0],{queryOptions:{queryReplacement:'={{ ['+tokenExpression+'] }}'}});
  query.onError='continueRegularOutput';
  nodes.push(query,wf.codeNode(map,'const toFields='+toFields.toString()+'; return $input.all().filter(i=>i.json.ref_token && i.json.unit_code && i.json.lead_status).map(i=>({json:{fields:toFields(i.json)}}));',[4420,0]),wf.airtableMirrorNode(send,{tableName:'Leads',upsertOn:'Ref Token',bodyExpression:"={{ JSON.stringify({performUpsert:{fieldsToMergeOn:['Ref Token']},typecast:true,records:[{fields:$json.fields}]}) }}"},[4640,0]));
  connections[source] ||= {main:[[]]};
  connections[source].main[0] ||= [];
  connections[source].main[0].push({node:read,type:'main',index:0});
  connections[read]={main:[[{node:map,type:'main',index:0}]]};
  connections[map]={main:[[{node:send,type:'main',index:0}]]};
}
module.exports={SQL,toFields,attach};
