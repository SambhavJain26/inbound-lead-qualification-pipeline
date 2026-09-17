/* Manager bot: ordinary text and buttons, authenticated and replay guarded. */
const path = require('path');
const wf = require('./lib/wf-common');
const { REPO_ROOT } = require('./lib/env');
const LIB = wf.inlineLib('leasing-lib.js') + '\n' + wf.inlineLib('manager-lib.js');
const parse = LIB + "\nconst a=parseManagerUpdate($input.first().json,'__TELEGRAM_CHAT_ID__'); return a?[{json:a}]:[];";
const resolve = LIB + `
const a=$('Parse Manager Action').first().json;
const data=$input.first().json;
const leads=(data.leads||[]).filter(l=>l.is_active_demo_recipient!==false), apps=data.applications||[];
const help='You can type normally; Reply is not needed.\\n\\nApprove tour\\nNot that time\\nApprove change\\nKeep original\\nTour completed for Sambhav Jain\\nApprove application A-1234\\nSend to review A-1234\\nSend welcome\\nSend message R-1234: your public-safe reply\\nStatus\\n\\nWith one pending item, Approve also works. With several, include its reference. Private disclosures and automated adverse-action notices are never allowed.';
if(a.action==='help'||a.action==='status') {
 const pipeline=leads.filter(l=>l.status!=='closed').map(l=>'Lead: '+l.ref_token+' · '+l.prospect_name+' · '+l.status);
 const bookingFollowup=leads.filter(l=>l.tour_approval_state==='approved'&&!l.calcom_booking_uid).map(l=>'Calendar follow-up; do not blindly retry: '+l.ref_token);
 const pending=leads.filter(l=>l.tour_approval_state==='pending').map(l=>'Tour approval: '+l.ref_token+' · '+l.prospect_name);
 const changes=leads.filter(l=>['pending','processing','failed_or_uncertain'].includes(l.conversation_state?.reschedule_state)).map(l=>'Tour change: '+l.ref_token+' · '+l.conversation_state.reschedule_state+' · completion blocked until resolved');
 const booked=leads.filter(l=>l.status==='tour_booked'&&!['pending','processing','failed_or_uncertain'].includes(l.conversation_state?.reschedule_state)).map(l=>'Awaiting tour completion: '+l.ref_token+' · '+l.prospect_name);
 const reviews=leads.filter(l=>l.conversation_state?.manager_review_pending).map(l=>'Information review: '+l.ref_token+' · '+l.prospect_name);
 const decisions=apps.filter(x=>!x.decision&&x.status==='awaiting_decision').map(x=>'Application review: '+x.ref_token+' · '+x.full_name);
 const welcome=apps.filter(x=>x.lease_status==='signed').map(x=>(x.welcome_claimed?'Welcome already claimed; check delivery record: ':'Welcome approval: ')+x.ref_token+' · '+x.full_name);
 return [{json:{...a,ok:false,manager_text:escapeTelegramHtml(a.action==='status'?pipeline.concat(pending,changes,bookingFollowup,booked,reviews,decisions,welcome).join('\\n')||'No pending demo work.':help)}}];
}
const target=resolveManagerTarget(a,leads,apps);
if(!target.ok)return [{json:{...a,ok:false,manager_text:escapeTelegramHtml(target.text)}}];
const row=target.row;
const result={...a,ok:true,kind:target.kind,ref_token:row.ref_token,prospect_name:row.prospect_name||row.full_name,row:row,
 request_id:a.request_id||(target.kind==='reschedule'?row.conversation_state?.reschedule_request_id:row.conversation_state?.pending_tour_action_id)||null,
 tour_approved:!['tour_decline','reschedule_decline'].includes(a.action),
 decision:a.action==='application_conditional'?'conditional':a.action==='application_review'?'sent_to_review':'approved',
 triggers_lease:a.action!=='application_review'};
if(result.kind==='message') {
 const v=managerMessageCheck(a.reply_text,buildConversationKnowledge(row,row),guardrailCheck);
 if(!v.passed)return [{json:{...a,ok:false,manager_text:'The reply failed the send-time safety check. Private facts, legal/outcome wording and unsupported figures cannot be released. Nothing was sent.'}}];
 result.reply_html=escapeTelegramHtml(a.reply_text); result.guardrail_result=v;
}
return [{json:result}];`;
const nodes = [
  {...wf.telegramTriggerNode('Manager Actions (Telegram)',[-800,0],{bot:'manager',updates:['callback_query','message'],webhookId:'leasing-telegram-router'}),id:'telegram-trigger'},
  wf.codeNode('Parse Manager Action',parse,[-580,0]),
  wf.postgresNode('Claim Manager Update',
    "INSERT INTO message_log(direction,channel,from_addr,to_addr,body,message_id) VALUES('inbound','telegram',$1,'manager-bot',$2,$3) ON CONFLICT(message_id) DO NOTHING RETURNING id;",
    [-360,0],{queryOptions:{queryReplacement:"={{ [$json.actor,$json.raw_text,$json.dedupe_key] }}"}}),
  wf.ifNode('Is Button Tap?',[wf.booleanCondition("={{ Boolean($('Parse Manager Action').first().json.callback_query_id) }}",true)],[-140,0]),
  wf.internalActionNode('Acknowledge Tap','https://api.telegram.org/bot__TELEGRAM_BOT_TOKEN__/answerCallbackQuery',
    "={{ JSON.stringify({callback_query_id:$('Parse Manager Action').first().json.callback_query_id}) }}",[80,-180],{authenticate:false,continueOnFail:true}),
  wf.postgresNode('Load Manager Context',
    "SELECT COALESCE((SELECT jsonb_agg(x) FROM (SELECT l.*,lower(l.prospect_email)=lower('__PROSPECT_EMAIL__') AS is_active_demo_recipient,u.unit_code,u.address,u.beds,u.baths,u.sqft,u.rent_amount,u.deposit_amount,u.available_from,u.lease_term_months,u.pet_policy,u.pet_fee_monthly,u.parking,u.utilities_included,u.laundry,u.faq_facts FROM leads l JOIN units u ON u.id=l.unit_id ORDER BY l.id DESC LIMIT 100) x),'[]'::jsonb) AS leads, COALESCE((SELECT jsonb_agg(x) FROM (SELECT a.*,EXISTS(SELECT 1 FROM message_log m WHERE m.message_id='mail-welcome-'||a.ref_token) AS welcome_claimed FROM applications a ORDER BY id DESC LIMIT 100) x),'[]'::jsonb) AS applications;",
    [300,0]),
  wf.codeNode('Resolve Manager Target',resolve,[520,0]),
  wf.ifNode('Action Target Clear?',[wf.booleanCondition('={{ $json.ok }}',true)],[740,0]),
  wf.telegramNode('Manager Help Or Clarification',{chatId:'=__TELEGRAM_CHAT_ID__',text:'={{ $json.manager_text }}',failOnError:true},[960,320]),
  wf.ifNode('Is Tour Decision?',[wf.booleanCondition("={{ $json.kind === 'tour' }}",true)],[960,0]),
  wf.ifNode('Is Reschedule Decision?',[wf.booleanCondition("={{ $json.kind === 'reschedule' }}",true)],[960,-360]),
  wf.internalActionNode('Send Reschedule Decision To WF5','=http://n8n:5678/webhook/tour-reschedule-decision',
    "={{ JSON.stringify({ref_token:$('Resolve Manager Target').first().json.ref_token,approved:$('Resolve Manager Target').first().json.tour_approved,actor:$('Resolve Manager Target').first().json.actor,request_id:$('Resolve Manager Target').first().json.request_id,action_id:$('Resolve Manager Target').first().json.dedupe_key}) }}",[1180,-360]),
  wf.internalActionNode('Send Tour Decision To WF5','=http://n8n:5678/webhook/tour-decision',
    "={{ JSON.stringify({ref_token:$('Resolve Manager Target').first().json.ref_token,approved:$('Resolve Manager Target').first().json.tour_approved,actor:$('Resolve Manager Target').first().json.actor,request_id:$('Resolve Manager Target').first().json.request_id,action_id:$('Resolve Manager Target').first().json.dedupe_key}) }}",[1180,-200]),
  wf.ifNode('Is Tour Completion?',[wf.booleanCondition("={{ $json.kind === 'completion' }}",true)],[1180,40]),
  wf.internalActionNode('Confirm Tour Completion In WF1','=http://n8n:5678/webhook/tour-completed',
    "={{ JSON.stringify({ref_token:$('Resolve Manager Target').first().json.ref_token,actor:$('Resolve Manager Target').first().json.actor,action_id:$('Resolve Manager Target').first().json.dedupe_key}) }}",[1400,-120]),
  wf.ifNode('Is Human Reply?',[wf.booleanCondition("={{ $json.kind === 'message' }}",true)],[1400,160]),
  wf.ifNode('Is Welcome Approval?',[wf.booleanCondition("={{ $json.kind === 'welcome' }}",true)],[1500,400]),
  wf.internalActionNode('Send Welcome Approval To WF4','=http://n8n:5678/webhook/welcome-send',
    "={{ JSON.stringify({ref_token:$('Resolve Manager Target').first().json.ref_token,actor:$('Resolve Manager Target').first().json.actor,action_id:$('Resolve Manager Target').first().json.dedupe_key}) }}",[1720,500]),
  wf.postgresNode('Record Approved Human Reply',
    "INSERT INTO message_log(ref_token,direction,channel,tier,from_addr,to_addr,body,message_id,guardrail_passed,guardrail_result,approved_by,approved_at) SELECT $1,'outbound','telegram','B','manager',$2::text,$3,$4,true,$5::jsonb,$6,now() WHERE EXISTS(SELECT 1 FROM leads WHERE ref_token=$1 AND telegram_chat_id=$2::text::bigint) ON CONFLICT(message_id) DO NOTHING RETURNING *;",
    [1620,80],{queryOptions:{queryReplacement:"={{ [$('Resolve Manager Target').first().json.ref_token,String($('Resolve Manager Target').first().json.row.telegram_chat_id),$('Resolve Manager Target').first().json.reply_text,'mgr-send-'+$('Resolve Manager Target').first().json.dedupe_key,JSON.stringify({...$('Resolve Manager Target').first().json.guardrail_result,delivery:'pending'}),$('Resolve Manager Target').first().json.actor] }}"}}),
  wf.telegramNode('Send Human Approved Reply',{bot:'prospect',chatId:'={{ $json.to_addr }}',text:"={{ $('Resolve Manager Target').first().json.reply_html }}",failOnError:true},[1840,80]),
  wf.postgresNode('Mark Human Reply Delivered',
    "WITH cleared AS (UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('manager_review_pending',false) WHERE ref_token=$1 RETURNING id) UPDATE message_log SET guardrail_result=guardrail_result||jsonb_build_object('delivery','sent') WHERE message_id=$2 RETURNING ref_token;",
    [2060,80],{queryOptions:{queryReplacement:"={{ [$('Resolve Manager Target').first().json.ref_token,'mgr-send-'+$('Resolve Manager Target').first().json.dedupe_key] }}"}}),
  wf.telegramNode('Confirm Human Reply Sent',{chatId:'=__TELEGRAM_CHAT_ID__',text:"=Your approved reply was delivered for {{ $('Resolve Manager Target').first().json.ref_token }}.",failOnError:true},[2280,80]),
  wf.postgresNode('Record Decision',
    "UPDATE applications SET decision=$2,decided_by=$3,decided_at=now(),status='decided' WHERE ref_token=$1 AND decision IS NULL AND status='awaiting_decision' AND criteria_result IN ('meets_criteria','conditional') RETURNING *;",
    [1620,300],{queryOptions:{queryReplacement:"={{ [$('Resolve Manager Target').first().json.ref_token,$('Resolve Manager Target').first().json.decision,$('Resolve Manager Target').first().json.actor] }}"}}),
  wf.ifNode('Send Lease Now?',[wf.booleanCondition("={{ $('Resolve Manager Target').first().json.triggers_lease }}",true)],[1840,300]),
  wf.internalActionNode('Start Lease Workflow','=http://n8n:5678/webhook/lease-create',
    "={{ JSON.stringify({ref_token:$('Resolve Manager Target').first().json.ref_token}) }}",[2060,240]),
  wf.telegramNode('Confirm Decision Recorded',{chatId:'=__TELEGRAM_CHAT_ID__',text:"={{ 'Decision '+$('Resolve Manager Target').first().json.decision+' recorded for '+$('Resolve Manager Target').first().json.ref_token+' by '+$('Resolve Manager Target').first().json.actor+'. '+($('Resolve Manager Target').first().json.triggers_lease?'Preparing the sandbox lease.':'No lease prepared; nothing sent to the applicant.') }}",failOnError:true},[2280,300]),
  wf.telegramNode('Confirm Completion Requested',{chatId:'=__TELEGRAM_CHAT_ID__',text:"=Tour completion submitted for {{ $('Resolve Manager Target').first().json.ref_token }} by {{ $('Resolve Manager Target').first().json.actor }}. The approved application follow-up is processing. This is synthetic demo attendance.",failOnError:true},[1620,-120]),
];
const connections=wf.connect({
 'Manager Actions (Telegram)':[['Parse Manager Action']], 'Parse Manager Action':[['Claim Manager Update']],
 'Claim Manager Update':[['Is Button Tap?']], 'Is Button Tap?':[['Acknowledge Tap'],['Load Manager Context']],
 'Acknowledge Tap':[['Load Manager Context']], 'Load Manager Context':[['Resolve Manager Target']],
 'Resolve Manager Target':[['Action Target Clear?']], 'Action Target Clear?':[['Is Reschedule Decision?'],['Manager Help Or Clarification']],
 'Is Reschedule Decision?':[['Send Reschedule Decision To WF5'],['Is Tour Decision?']],
 'Is Tour Decision?':[['Send Tour Decision To WF5'],['Is Tour Completion?']],
 'Is Tour Completion?':[['Confirm Tour Completion In WF1'],['Is Human Reply?']],
 'Confirm Tour Completion In WF1':[['Confirm Completion Requested']],
 'Is Human Reply?':[['Record Approved Human Reply'],['Is Welcome Approval?']],
 'Is Welcome Approval?':[['Send Welcome Approval To WF4'],['Record Decision']],
 'Record Approved Human Reply':[['Send Human Approved Reply']], 'Send Human Approved Reply':[['Mark Human Reply Delivered']],
 'Mark Human Reply Delivered':[['Confirm Human Reply Sent']], 'Record Decision':[['Send Lease Now?']],
 'Send Lease Now?':[['Start Lease Workflow'],['Confirm Decision Recorded']], 'Start Lease Workflow':[['Confirm Decision Recorded']],
});
require('./lib/pipeline-mirror').attach(wf,nodes,connections,'Record Decision','$json.ref_token','Decision');
nodes.find(n=>n.name==='Send Human Approved Reply').onError='continueErrorOutput';
nodes.push(
 wf.postgresNode('Mark Human Reply Failed',"UPDATE message_log SET guardrail_result=guardrail_result||jsonb_build_object('delivery','failed_or_uncertain') WHERE message_id=$1 RETURNING ref_token;",[2060,-20],{queryOptions:{queryReplacement:"={{ ['mgr-send-'+$('Resolve Manager Target').first().json.dedupe_key] }}"}}),
 wf.telegramNode('Notify Manager: Human Reply Failed',{chatId:'=__TELEGRAM_CHAT_ID__',text:'=Your reply could not be confirmed delivered for {{ $json.ref_token }}. The information-review task remains open. Check the send execution before trying again.',failOnError:true},[2280,-20]),
);
connections['Send Human Approved Reply'].main[1]=[{node:'Mark Human Reply Failed',type:'main',index:0}];
connections['Mark Human Reply Failed']=wf.connect({x:[['Notify Manager: Human Reply Failed']]}).x;
const workflow=wf.buildWorkflow({id:'wf3-telegram-router',name:'WF3 Telegram Router',nodes,connections,active:true});
console.log('wf3-telegram-router.json written, '+wf.writeWorkflow(workflow,path.join(REPO_ROOT,'n8n-workflows','wf3-telegram-router.json'))+' nodes');
