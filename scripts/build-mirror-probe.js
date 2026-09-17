/** Local verification only: same live mirror nodes, no decision or signing side effects. */
const fs=require('node:fs');
const path=require('node:path');
const wf=require('./lib/wf-common');
const {REPO_ROOT}=require('./lib/env');
const nodes=[wf.webhookNode('Mirror Probe Input','pipeline-mirror-probe',[0,0]),wf.codeNode('Read Probe Reference','return [{json:{ref_token:$json.body.ref_token}}];',[220,0])];
const connections=wf.connect({'Mirror Probe Input':[['Read Probe Reference']]});
require('./lib/pipeline-mirror').attach(wf,nodes,connections,'Read Probe Reference','$json.ref_token','Verification Only');
const resolved=JSON.parse(fs.readFileSync(path.join(REPO_ROOT,'tmp','wf4-lease-and-signature.resolved.json'),'utf8'));
const reference=resolved.nodes.find(n=>n.name==='Mirror: Read Pipeline Lease Sent');
const mirror=resolved.nodes.find(n=>n.name==='Mirror: Upsert Airtable Lease Sent');
for(const node of nodes) {
  if(node.type==='n8n-nodes-base.postgres') node.credentials=reference.credentials;
  if(node.type==='n8n-nodes-base.httpRequest') {node.credentials=mirror.credentials;node.parameters.url=mirror.parameters.url;}
}
const out=path.join(REPO_ROOT,'tmp','pipeline-mirror-probe.json');
wf.writeWorkflow(wf.buildWorkflow({id:'pipeline-mirror-probe',name:'Verification Only — Pipeline Mirror Probe',nodes,connections,active:true}),out);
console.log(out);
