/* Every tour waits for authenticated manager approval; no public-link bypass. */
const path=require('path');
const wf=require('./lib/wf-common');
const {REPO_ROOT}=require('./lib/env');
const LIB=wf.inlineLib('leasing-lib.js');
const match=LIB+`
const lead=$('Load Lead For Tour').first().json;
const request=$('Tour Requested (Internal)').first().json.body;
const raw=$input.first().json.data||{};
const slots=Object.values(raw).flat().map(s=>typeof s==='string'?s:s.start).filter(Boolean);
const wanted=naiveLocalToUtcIso(request.preferred_iso,'__TOUR_TIMEZONE__');
const selection=matchTourSlot(wanted,slots,0.01);
const pretty=s=>new Intl.DateTimeFormat('en-US',{timeZone:'__TOUR_TIMEZONE__',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(s));
const parts=selection.matched?new Intl.DateTimeFormat('en-US',{timeZone:'__TOUR_TIMEZONE__',hour:'numeric',hour12:false,weekday:'short'}).formatToParts(new Date(selection.matched)):[];
const hour=Number(parts.find(p=>p.type==='hour')?.value)%24;
const day={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[parts.find(p=>p.type==='weekday')?.value];
const policy=selection.matched?classifyTourRequest(selection.matched,$('Load Tour Policy').first().json,new Date().toISOString(),hour,day):{reasons:[]};
const reasons=['Every tour requires manager approval'].concat(policy.reasons);
const text=selection.matched?'Your request for '+pretty(selection.matched)+' has gone to the manager. Nothing is booked and no entry code has been released. We will confirm after approval.':
 selection.alternatives.length?'That exact time is unavailable. These real alternatives are open:\\n'+selection.alternatives.map(s=>'- '+pretty(s)).join('\\n')+'\\nWhich works for you? It will still need manager approval.':'No tour slots are currently open. The team will follow up; no booking was made.';
return [{json:{...lead,slot_iso:selection.matched,slot_pretty:selection.matched?pretty(selection.matched):null,has_slot:Boolean(selection.matched),
 request_id:'tr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),prospect_text:escapeTelegramHtml(text),
 manager_text:escapeTelegramHtml('Tour approval needed\\n'+lead.prospect_name+' · '+lead.ref_token+' · '+lead.unit_code+'\\nRequested: '+(selection.matched?pretty(selection.matched):'No slot')+'\\n'+reasons.join('; ')+'\\nNothing is booked. Approve or choose Not that time. You may type Approve tour without using Reply.')}}];`;
const decision=LIB+`
const lead=$input.first().json;
if(!lead.ref_token)return [{json:{valid:false,manager_text:'This tour request is already actioned, stale or missing. No second booking was made.'}}];
const body=$('Tour Decision (Internal)').first().json.body;
const pretty=s=>new Intl.DateTimeFormat('en-US',{timeZone:'__TOUR_TIMEZONE__',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(s));
const lock=body.approved===true?generateLockCode():{code:null,source:'mock'};
return [{json:{...lead,valid:true,approved:body.approved===true,actor:body.actor,lock_code:lock.code,slot_iso:lead.pending_tour_starts_at,slot_pretty:pretty(lead.pending_tour_starts_at),
 decline_text:'The manager could not confirm that tour time. Please send another preferred date and time; it will also need approval.'}}];`;
function booking() {
 return {...wf.internalActionNode('Cal.com: Create Approved Booking','https://api.cal.com/v2/bookings',
  "={{ JSON.stringify({start:$json.slot_iso,eventTypeId:Number('__CALCOM_EVENT_TYPE_ID__'),attendee:{name:$json.prospect_name,email:$json.prospect_email,timeZone:'__TOUR_TIMEZONE__',language:'en'},metadata:{ref_token:$json.ref_token} }) }}",[800,600],{authenticate:false}),
  parameters:{method:'POST',url:'https://api.cal.com/v2/bookings',sendHeaders:true,headerParameters:{parameters:[
   {name:'Authorization',value:'Bearer __CALCOM_API_KEY__'},{name:'cal-api-version',value:'2024-08-13'}]},
   sendBody:true,contentType:'json',specifyBody:'json',
   jsonBody:"={{ JSON.stringify({start:$json.slot_iso,eventTypeId:Number('__CALCOM_EVENT_TYPE_ID__'),attendee:{name:$json.prospect_name,email:$json.prospect_email,timeZone:'__TOUR_TIMEZONE__',language:'en'},metadata:{ref_token:$json.ref_token} }) }}",
   options:{timeout:20000}},onError:'continueErrorOutput'};
}
const nodes=[
 wf.webhookNode('Tour Requested (Internal)','tour-request',[-800,0]),
 wf.codeNode('Authenticate Tour Request',wf.internalGuardCode(),[-600,0]),
 wf.postgresNode('Load Lead For Tour',"SELECT l.*,u.unit_code,u.address FROM leads l JOIN units u ON u.id=l.unit_id WHERE l.ref_token=$1 AND l.status='prequalified' AND l.prequal_result='clear' AND l.tour_approval_state<>'pending' AND u.status='available' AND lower(l.prospect_email)=lower('__PROSPECT_EMAIL__') LIMIT 1;",[-400,0],{queryOptions:{queryReplacement:'={{ [$json.body.ref_token] }}'}}),
 wf.postgresNode('Load Tour Policy','SELECT * FROM tour_policy WHERE is_active ORDER BY id DESC LIMIT 1;',[-200,0]),
 {...wf.internalActionNode('Cal.com: Get Slots', 'https://api.cal.com/v2/slots','={{ "{}" }}',[0,0],{authenticate:false}),parameters:{
  method:'GET',url:"=https://api.cal.com/v2/slots?eventTypeId=__CALCOM_EVENT_TYPE_ID__&start={{ $now.format('yyyy-MM-dd') }}&end={{ $now.plus(14,'days').format('yyyy-MM-dd') }}&timeZone=__TOUR_TIMEZONE__",
  sendHeaders:true,headerParameters:{parameters:[{name:'Authorization',value:'Bearer __CALCOM_API_KEY__'},{name:'cal-api-version',value:'2024-09-04'}]},options:{timeout:20000}},onError:'continueErrorOutput'},
 wf.codeNode('Match Slot And Check Policy',match,[200,0]),
 wf.ifNode('Exact Requested Slot Exists?',[wf.booleanCondition('={{ $json.has_slot }}',true)],[400,0]),
 wf.postgresNode('Hold Slot For Approval',
  "UPDATE leads SET pending_tour_starts_at=$2::timestamptz,tour_approval_state='pending',conversation_state=conversation_state||jsonb_build_object('pending_tour_action_id',$3::text) WHERE ref_token=$1 AND status='prequalified' AND tour_approval_state<>'pending' RETURNING *;",
  [600,-100],{queryOptions:{queryReplacement:'={{ [$json.ref_token,$json.slot_iso,$json.request_id] }}'}}),
 wf.telegramNode('Tell Prospect: Approval Pending',{bot:'prospect',chatId:"={{ $('Match Slot And Check Policy').first().json.telegram_chat_id }}",text:"={{ $('Match Slot And Check Policy').first().json.prospect_text }}",failOnError:true},[800,-100]),
 wf.telegramCardNode('Ask Manager: Approve This Tour',{chatId:'=__TELEGRAM_CHAT_ID__',text:"={{ $('Match Slot And Check Policy').first().json.manager_text }}",failOnError:true,
  buttonRows:[[{text:'Approve tour',callbackData:"=tba:{{ $('Match Slot And Check Policy').first().json.ref_token }}:{{ $('Match Slot And Check Policy').first().json.request_id }}"},{text:'Not that time',callbackData:"=tbd:{{ $('Match Slot And Check Policy').first().json.ref_token }}:{{ $('Match Slot And Check Policy').first().json.request_id }}"}]]},[1000,-100]),
 wf.telegramNode('Offer Real Alternative Times',{bot:'prospect',chatId:'={{ $json.telegram_chat_id }}',text:'={{ $json.prospect_text }}',failOnError:true},[600,180]),
 wf.webhookNode('Tour Decision (Internal)','tour-decision',[-800,600]),
 wf.codeNode('Authenticate Tour Decision',wf.internalGuardCode(),[-600,600]),
 wf.postgresNode('Claim Pending Tour Decision',
  "UPDATE leads SET tour_approval_state=CASE WHEN $2::boolean THEN 'approved' ELSE 'declined' END,conversation_state=conversation_state||jsonb_build_object('tour_decided_by',$3::text,'tour_decided_at',now(),'tour_decision_action_id',$4::text) WHERE ref_token=$1 AND tour_approval_state='pending' AND conversation_state->>'pending_tour_action_id'=$5 AND status='prequalified' RETURNING *, (SELECT unit_code FROM units WHERE id=leads.unit_id) AS unit_code,(SELECT address FROM units WHERE id=leads.unit_id) AS address;",
  [-400,600],{queryOptions:{queryReplacement:"={{ [$json.body.ref_token,$json.body.approved,$json.body.actor,$json.body.action_id,$json.body.request_id ?? ''] }}"},alwaysOutputData:true}),
 wf.codeNode('Read Tour Decision',decision,[-200,600]),
 wf.ifNode('Tour Decision Claimed?',[wf.booleanCondition('={{ $json.valid }}',true)],[0,600]),
 wf.telegramNode('Notify Manager: Stale Tour Action',{chatId:'=__TELEGRAM_CHAT_ID__',text:'={{ $json.manager_text }}',failOnError:true},[200,850]),
 wf.ifNode('Tour Approved?',[wf.booleanCondition('={{ $json.approved }}',true)],[200,600]),
 booking(),
 wf.postgresNode('Record Approved Booking',"UPDATE leads SET calcom_booking_uid=$2,tour_starts_at=$3::timestamptz,lock_code=$4,lock_code_source='mock',pending_tour_starts_at=NULL,status='tour_booked' WHERE ref_token=$1 AND tour_approval_state='approved' AND calcom_booking_uid IS NULL RETURNING *;",
  [1000,600],{queryOptions:{queryReplacement:"={{ [$('Read Tour Decision').first().json.ref_token,$json.data.uid,$('Read Tour Decision').first().json.slot_iso,$('Read Tour Decision').first().json.lock_code] }}"}}),
 wf.codeNode('Compose Approved Tour Confirmation',LIB+"\nconst l=$('Read Tour Decision').first().json;return [{json:{...l,prospect_text:escapeTelegramHtml('Your tour of '+l.address+' is confirmed for '+l.slot_pretty+'.\\n\\nDemo entry code (MOCK): '+l.lock_code+'\\nThis synthetic code does not operate a real lock.'),manager_text:escapeTelegramHtml('Tour booked after your approval: '+l.prospect_name+' · '+l.ref_token+' · '+l.slot_pretty+'\\nResident confirmation delivered next. You can later type Tour completed for '+l.prospect_name+' or use the completion button.')}}];",[1200,600]),
 wf.telegramNode('Confirm Approved Tour',{bot:'prospect',chatId:'={{ $json.telegram_chat_id }}',text:'={{ $json.prospect_text }}',failOnError:true},[1400,600]),
 wf.telegramCardNode('Notify Manager: Tour Booked',{chatId:'=__TELEGRAM_CHAT_ID__',text:"={{ $('Compose Approved Tour Confirmation').first().json.manager_text }}",failOnError:true,
  buttonRows:[[{text:'Confirm tour completed (demo)',callbackData:"=tcm:{{ $('Read Tour Decision').first().json.ref_token }}"}]]},[1600,600]),
 wf.telegramNode('Tell Prospect: Another Time',{bot:'prospect',chatId:'={{ $json.telegram_chat_id }}',text:'={{ $json.decline_text }}',failOnError:true},[600,780]),
 wf.telegramNode('Confirm Tour Declined To Manager',{chatId:'=__TELEGRAM_CHAT_ID__',text:"=Tour time not confirmed for {{ $('Read Tour Decision').first().json.ref_token }}. No booking or code was issued; the resident was asked for another time.",failOnError:true},[800,780]),
 wf.telegramNode('Alert Manager: Booking Failed',{chatId:'=__TELEGRAM_CHAT_ID__',text:"=Cal.com booking failed or its result is uncertain for {{ $('Read Tour Decision').first().json.ref_token }}. No entry code was sent. Check the calendar before retrying; this request is blocked from automatic retry.",failOnError:true},[1000,1020]),
 wf.telegramNode('Tell Prospect: Booking Needs Followup',{bot:'prospect',chatId:"={{ $('Read Tour Decision').first().json.telegram_chat_id }}",text:'The team approved the request, but the calendar could not confirm it. A colleague will check and follow up. No entry code has been released.',failOnError:true},[1200,1020]),
 wf.telegramNode('Alert Manager: Slot Lookup Failed',{chatId:'=__TELEGRAM_CHAT_ID__',text:"=Calendar availability lookup failed for {{ $('Load Lead For Tour').first().json.ref_token }}. No booking or access code was created. Please follow up.",failOnError:true},[200,300]),
 wf.telegramNode('Tell Prospect: Calendar Needs Followup',{bot:'prospect',chatId:"={{ $('Load Lead For Tour').first().json.telegram_chat_id }}",text:'The calendar is not responding. A colleague will check and follow up; nothing has been booked.',failOnError:true},[400,300]),
 wf.postgresNode('Log Prospect Telegram Message',"INSERT INTO message_log(ref_token,direction,channel,tier,from_addr,to_addr,body,message_id) SELECT ref_token,'outbound','telegram','A','leasing-team',$1::text,$2,$3 FROM leads WHERE telegram_chat_id=$1::text::bigint ORDER BY id DESC LIMIT 1 ON CONFLICT(message_id) DO NOTHING;",
 [2000,0],{queryOptions:{queryReplacement:"={{ [String($json.result.chat.id),$json.result.text,'tg-out-'+$json.result.chat.id+'-'+$json.result.message_id] }}"}}),
];
const connections=wf.connect({
 'Tour Requested (Internal)':[['Authenticate Tour Request']], 'Authenticate Tour Request':[['Load Lead For Tour']],
 'Load Lead For Tour':[['Load Tour Policy']], 'Load Tour Policy':[['Cal.com: Get Slots']], 'Cal.com: Get Slots':[['Match Slot And Check Policy'],['Alert Manager: Slot Lookup Failed']],
 'Alert Manager: Slot Lookup Failed':[['Tell Prospect: Calendar Needs Followup']], 'Tell Prospect: Calendar Needs Followup':[['Log Prospect Telegram Message']],
 'Match Slot And Check Policy':[['Exact Requested Slot Exists?']], 'Exact Requested Slot Exists?':[['Hold Slot For Approval'],['Offer Real Alternative Times']],
 'Hold Slot For Approval':[['Tell Prospect: Approval Pending']], 'Tell Prospect: Approval Pending':[['Log Prospect Telegram Message','Ask Manager: Approve This Tour']],
 'Offer Real Alternative Times':[['Log Prospect Telegram Message']],
 'Tour Decision (Internal)':[['Authenticate Tour Decision']], 'Authenticate Tour Decision':[['Claim Pending Tour Decision']],
 'Claim Pending Tour Decision':[['Read Tour Decision']], 'Read Tour Decision':[['Tour Decision Claimed?']],
 'Tour Decision Claimed?':[['Tour Approved?'],['Notify Manager: Stale Tour Action']],
 'Tour Approved?':[['Cal.com: Create Approved Booking'],['Tell Prospect: Another Time']],
 'Cal.com: Create Approved Booking':[['Record Approved Booking'],['Alert Manager: Booking Failed']],
 'Record Approved Booking':[['Compose Approved Tour Confirmation']], 'Compose Approved Tour Confirmation':[['Confirm Approved Tour']],
 'Confirm Approved Tour':[['Log Prospect Telegram Message','Notify Manager: Tour Booked']],
 'Tell Prospect: Another Time':[['Log Prospect Telegram Message','Confirm Tour Declined To Manager']],
 'Alert Manager: Booking Failed':[['Tell Prospect: Booking Needs Followup']], 'Tell Prospect: Booking Needs Followup':[['Log Prospect Telegram Message']],
});
require('./lib/pipeline-mirror').attach(wf,nodes,connections,'Record Approved Booking','$json.ref_token','Approved Tour');
require('./lib/pipeline-mirror').attach(wf,nodes,connections,'Hold Slot For Approval','$json.ref_token','Pending Tour');
require('./lib/tour-reschedule-workflow')(wf,nodes,connections);
const w=wf.buildWorkflow({id:'wf5-tour-booking',name:'WF5 Tour Booking',nodes,connections,active:true});
console.log('wf5-tour-booking.json written, '+wf.writeWorkflow(w,path.join(REPO_ROOT,'n8n-workflows','wf5-tour-booking.json'))+' nodes');
