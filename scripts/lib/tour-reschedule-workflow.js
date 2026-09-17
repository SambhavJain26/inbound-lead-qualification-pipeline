/* Builder extension: native calendar changes, independent from new-tour approval. */
module.exports = function attachRescheduling(wf, nodes, connections) {
  const LIB = wf.inlineLib('leasing-lib.js') + '\n' + wf.inlineLib('manager-lib.js') + '\n' + wf.inlineLib('tour-reschedule-lib.js');
  const pretty = "const pretty=s=>new Intl.DateTimeFormat('en-US',{timeZone:'__TOUR_TIMEZONE__',weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(s));\n";
  const ref = "$('Read Reschedule Decision').first().json";
  function pg(name, sql, params, y, always) {
    return wf.postgresNode(name, sql, [1000,y], {queryOptions:{queryReplacement:'={{ '+params+' }}'},alwaysOutputData:Boolean(always)});
  }
  function slots(name, y) {
    return { ...wf.internalActionNode(name,'https://api.cal.com/v2/slots','={{ "{}" }}',[500,y],{authenticate:false}),
      parameters:{method:'GET',url:"=https://api.cal.com/v2/slots?eventTypeId=__CALCOM_EVENT_TYPE_ID__&start={{ $now.format('yyyy-MM-dd') }}&end={{ $now.plus(14,'days').format('yyyy-MM-dd') }}&timeZone=__TOUR_TIMEZONE__",
        sendHeaders:true,headerParameters:{parameters:[{name:'Authorization',value:'Bearer __CALCOM_API_KEY__'},{name:'cal-api-version',value:'2024-09-04'}]},options:{timeout:20000}},onError:'continueErrorOutput'};
  }
  function telegram(name, text, y, prospect) {
    return wf.telegramNode(name,{bot:prospect?'prospect':'manager',chatId:prospect?'=__DEMO_PROSPECT_CHAT_ID__':'=__TELEGRAM_CHAT_ID__',text,failOnError:true},[1800,y]);
  }
  const lookup = LIB + pretty + `
const l=$('Load Current Tour For Change').first().json;
const body=$('Reschedule Requested (Internal)').first().json.body;
const wanted=naiveLocalToUtcIso(body.preferred_iso,'__TOUR_TIMEZONE__');
if(!wanted || !Number.isFinite(Date.parse(wanted)))throw new Error('A precise new date and time is required.');
const available=Object.values($input.first().json.data||{}).flat().map(s=>typeof s==='string'?s:s.start).filter(Boolean);
const choice=matchTourSlot(wanted,available,0.01);
const same=Date.parse(wanted)===Date.parse(l.tour_starts_at);
const id='rs-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const unavailable=same?'That is already your confirmed tour time. No change was made.':choice.alternatives.length?'That exact new time is unavailable. Your original tour remains booked. Real alternatives:\\n'+choice.alternatives.map(s=>'- '+pretty(s)).join('\\n')+'\\nSend the time you prefer; it will need manager approval.':'That exact new time is unavailable. Your original tour remains booked. Please send another preferred date and time.';
return [{json:{...l,slot_iso:wanted,request_id:id,has_slot:!!choice.matched&&!same,
 prospect_text:escapeTelegramHtml('Your requested change to '+pretty(wanted)+' is waiting for manager approval. Your original tour at '+pretty(l.tour_starts_at)+' remains booked. We will confirm if the change succeeds.'),
 unavailable_text:escapeTelegramHtml(unavailable),
 manager_text:escapeTelegramHtml('Tour change approval needed\\n'+l.prospect_name+' · '+l.ref_token+' · '+l.unit_code+'\\nCurrent: '+pretty(l.tour_starts_at)+'\\nRequested: '+pretty(wanted)+'\\nTimezone: __TOUR_TIMEZONE__\\nThe original stays booked until the change succeeds. Approval rechecks availability, replaces the booking, and verifies cancellation of the old slot.\\nType Approve change or Keep original; Reply is not needed.') }}];`;
  const readDecision = LIB + pretty + `
const l=$input.first().json;
const b=$('Reschedule Decision (Internal)').first().json.body;
if(!l.ref_token)return [{json:{valid:false}}];
return [{json:{...l,valid:true,approved:b.approved===true,actor:b.actor,request_id:b.request_id,
 old_uid:l.conversation_state.reschedule_old_uid,slot_iso:l.conversation_state.reschedule_requested_start,
 slot_pretty:pretty(l.conversation_state.reschedule_requested_start),old_pretty:pretty(l.tour_starts_at)}}];`;
  const uncertainSql = "UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_state','failed_or_uncertain','reschedule_failed_at',now()) WHERE ref_token=$1 AND conversation_state->>'reschedule_request_id'=$2 AND conversation_state->>'reschedule_state'='processing' RETURNING ref_token;";
  const additions = [
    wf.webhookNode('Reschedule Requested (Internal)','tour-reschedule-request',[-800,1400]),
    wf.codeNode('Authenticate Reschedule Request',wf.internalGuardCode(),[-600,1400]),
    pg('Load Current Tour For Change',"SELECT l.*,u.unit_code,u.address FROM leads l JOIN units u ON u.id=l.unit_id WHERE l.ref_token=$1 AND l.status='tour_booked' AND l.calcom_booking_uid IS NOT NULL AND lower(l.prospect_email)=lower('__PROSPECT_EMAIL__') AND l.telegram_chat_id=$2::text::bigint AND COALESCE(l.conversation_state->>'reschedule_state','') NOT IN ('pending','processing','failed_or_uncertain') LIMIT 1;","[$json.body.ref_token,String('__DEMO_PROSPECT_CHAT_ID__')]",1400,true),
    wf.ifNode('Current Tour Can Change?',[wf.booleanCondition('={{ Boolean($json.ref_token) }}',true)],[300,1400]),
    slots('Cal.com: Read Change Availability',1400),
    wf.codeNode('Match Exact Reschedule Time',lookup,[700,1400],{errorOutput:true}),
    wf.ifNode('Exact New Time Exists?',[wf.booleanCondition('={{ $json.has_slot }}',true)],[900,1400]),
    pg('Save Pending Reschedule',"UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_state','pending','reschedule_request_id',$3::text,'reschedule_old_uid',calcom_booking_uid,'reschedule_old_starts_at',tour_starts_at,'reschedule_requested_start',$2::text,'reschedule_requested_at',now(),'reschedule_requested_by','prospect','awaiting_reschedule_time',false) WHERE ref_token=$1 AND status='tour_booked' AND calcom_booking_uid=$4 AND COALESCE(conversation_state->>'reschedule_state','') NOT IN ('pending','processing','failed_or_uncertain') RETURNING *;","[$json.ref_token,$json.slot_iso,$json.request_id,$json.calcom_booking_uid]",1300,true),
    wf.ifNode('Change Request Saved?',[wf.booleanCondition('={{ Boolean($json.ref_token) }}',true)],[1200,1300]),
    wf.telegramCardNode('Ask Manager: Approve Tour Change',{chatId:'=__TELEGRAM_CHAT_ID__',text:"={{ $('Match Exact Reschedule Time').first().json.manager_text }}",failOnError:true,
      buttonRows:[[{text:'Approve change',callbackData:"=rsa:{{ $('Match Exact Reschedule Time').first().json.ref_token }}:{{ $('Match Exact Reschedule Time').first().json.request_id }}"},{text:'Keep original',callbackData:"=rsd:{{ $('Match Exact Reschedule Time').first().json.ref_token }}:{{ $('Match Exact Reschedule Time').first().json.request_id }}"}]]},[1400,1300]),
    telegram('Tell Resident: Change Pending',"={{ $('Match Exact Reschedule Time').first().json.prospect_text }}",1300,true),
    telegram('Offer Exact Change Alternatives','={{ $json.unavailable_text }}',1600,true),
    telegram('Alert Manager: Change Lookup Failed',"=Tour change could not be queued for {{ $('Reschedule Requested (Internal)').first().json.body.ref_token }}. No calendar change was attempted. Check availability or resolve the existing change before retrying.",1800,false),
    telegram('Tell Resident: Change Lookup Needs Followup','The team needs to check your requested change. No calendar change was attempted; please wait for a colleague to follow up.',1800,true),
    wf.webhookNode('Reschedule Decision (Internal)','tour-reschedule-decision',[-800,2200]),
    wf.codeNode('Authenticate Reschedule Decision',wf.internalGuardCode(),[-600,2200]),
    pg('Claim Pending Reschedule',"UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_state',CASE WHEN $2::boolean THEN 'processing' ELSE 'declined' END,'reschedule_decided_by',$3::text,'reschedule_decided_at',now(),'reschedule_action_id',$4::text) WHERE ref_token=$1 AND status='tour_booked' AND conversation_state->>'reschedule_state'='pending' AND conversation_state->>'reschedule_request_id'=$5 AND calcom_booking_uid=conversation_state->>'reschedule_old_uid' RETURNING *,(SELECT address FROM units WHERE id=leads.unit_id) AS address;","[$json.body.ref_token,$json.body.approved,$json.body.actor,$json.body.action_id,$json.body.request_id ?? '']",2200,true),
    wf.codeNode('Read Reschedule Decision',readDecision,[300,2200]),
    wf.ifNode('Reschedule Decision Claimed?',[wf.booleanCondition('={{ $json.valid }}',true)],[500,2200]),
    telegram('Notify Manager: Stale Change Action','This change request is stale or already actioned. No second calendar change was attempted.',2400,false),
    wf.ifNode('Change Approved?',[wf.booleanCondition('={{ $json.approved }}',true)],[700,2200]),
    telegram('Tell Resident: Original Tour Kept',"={{ 'The manager kept your original tour at '+"+ref+".old_pretty+'. No calendar change was made.' }}",2600,true),
    telegram('Confirm Original Kept To Manager',"=Original booking kept for {{ "+ref+".ref_token }}. No reschedule or cancellation was attempted.",2600,false),
    slots('Cal.com: Recheck Approved Change',2200),
    wf.codeNode('Check Approved Time Still Open',LIB+"\nconst l="+ref+";const slots=Object.values($input.first().json.data||{}).flat().map(s=>typeof s==='string'?s:s.start).filter(Boolean);return [{json:{...l,still_open:!!matchTourSlot(l.slot_iso,slots,0.01).matched}}];",[900,2200],{errorOutput:true}),
    wf.ifNode('Approved Change Still Available?',[wf.booleanCondition('={{ $json.still_open }}',true)],[1100,2200]),
    pg('Mark Change Time Unavailable',"UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_state','unavailable','reschedule_closed_at',now()) WHERE ref_token=$1 AND conversation_state->>'reschedule_request_id'=$2 AND conversation_state->>'reschedule_state'='processing' RETURNING ref_token;","["+ref+".ref_token,"+ref+".request_id]",2800),
    telegram('Tell Resident: Change Time Taken','That new time is no longer available. Your original tour remains booked. Please send another preferred date and time.',2800,true),
    telegram('Notify Manager: Change Time Taken',"=The approved replacement time for {{ "+ref+".ref_token }} is no longer available. No reschedule was attempted; the original booking remains active.",2800,false),
    { ...wf.internalActionNode('Cal.com: Reschedule Approved Tour','https://api.cal.com/v2/bookings','={{ "{}" }}',[1300,2200],{authenticate:false}),parameters:{method:'POST',
      url:"=https://api.cal.com/v2/bookings/{{ "+ref+".old_uid }}/reschedule",sendHeaders:true,
      headerParameters:{parameters:[{name:'Authorization',value:'Bearer __CALCOM_API_KEY__'},{name:'cal-api-version',value:'2026-02-25'}]},
      sendBody:true,contentType:'json',specifyBody:'json',jsonBody:"={{ JSON.stringify({start:"+ref+".slot_iso,reschedulingReason:'Resident requested a tour time change; leasing manager approved.'}) }}",options:{timeout:20000}},onError:'continueErrorOutput'},
    wf.codeNode('Validate Calendar Replacement',LIB+"\nconst l="+ref+";const b=validateRescheduledBooking($input.first().json,l.old_uid,l.slot_iso);return [{json:{...l,new_uid:b.uid,provider_start:b.start}}];",[1500,2200],{errorOutput:true}),
    pg('Store Calendar Change Receipt',"UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_provider_uid',$3::text,'reschedule_provider_start',$4::text,'reschedule_provider_received_at',now()) WHERE ref_token=$1 AND conversation_state->>'reschedule_request_id'=$2 AND conversation_state->>'reschedule_state'='processing' RETURNING ref_token;","[$json.ref_token,$json.request_id,$json.new_uid,$json.provider_start]",2200),
    { ...wf.internalActionNode('Cal.com: Verify Old Slot Cancelled','https://api.cal.com/v2/bookings','={{ "{}" }}',[1700,2200],{authenticate:false}),parameters:{method:'GET',
      url:"=https://api.cal.com/v2/bookings/{{ "+ref+".old_uid }}",sendHeaders:true,headerParameters:{parameters:[{name:'Authorization',value:'Bearer __CALCOM_API_KEY__'},{name:'cal-api-version',value:'2026-02-25'}]},options:{timeout:20000}},onError:'continueErrorOutput'},
    wf.codeNode('Validate Old Booking Cancellation',LIB+"\nconst l=$('Validate Calendar Replacement').first().json;validateOriginalCancellation($input.first().json,l.old_uid,l.new_uid);return [{json:{...l,lock_code:generateLockCode().code}}];",[1900,2200],{errorOutput:true}),
    pg('Record Confirmed Tour Change',"UPDATE leads SET calcom_booking_uid=$3,tour_starts_at=$4::timestamptz,lock_code=$5,lock_code_source='mock',conversation_state=conversation_state||jsonb_build_object('reschedule_state','completed','reschedule_resident_delivery','pending','reschedule_completed_at',now(),'awaiting_reschedule_time',false,'tour_history',COALESCE(conversation_state->'tour_history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('old_uid',calcom_booking_uid,'old_start',tour_starts_at,'new_uid',$3::text,'new_start',$4::text,'old_cancelled_verified',true,'actor',conversation_state->>'reschedule_decided_by','changed_at',now(),'request_id',$2::text))) WHERE ref_token=$1 AND status='tour_booked' AND conversation_state->>'reschedule_request_id'=$2 AND conversation_state->>'reschedule_state'='processing' AND calcom_booking_uid=conversation_state->>'reschedule_old_uid' RETURNING *;","[$json.ref_token,$json.request_id,$json.new_uid,$json.provider_start,$json.lock_code]",2200,true),
    wf.codeNode('Compose Verified Tour Change',LIB+"\nconst stored=$input.first().json; if(!stored.ref_token)throw new Error('Calendar changed but local record could not be finalized.');const l="+ref+";return [{json:{prospect_text:escapeTelegramHtml('Your tour has changed to '+l.slot_pretty+'. Your previous booking at '+l.old_pretty+' has been cancelled.\\n\\nDemo entry code (MOCK): '+stored.lock_code+'\\nThis synthetic code does not operate a real lock.'),manager_text:escapeTelegramHtml('Tour change completed for '+l.prospect_name+' · '+l.ref_token+'\\nNew: '+l.slot_pretty+'\\nPrevious: '+l.old_pretty+' · cancellation verified\\nApproved by: '+l.actor+'\\nYou can later type Tour completed for '+l.prospect_name+'.')}}];",[2100,2200],{errorOutput:true}),
    telegram('Confirm Verified Change To Resident','={{ $json.prospect_text }}',2200,true),
    pg('Mark Change Confirmation Delivered',"UPDATE leads SET conversation_state=conversation_state||jsonb_build_object('reschedule_resident_delivery','sent','reschedule_resident_delivered_at',now()) WHERE ref_token=$1 AND conversation_state->>'reschedule_request_id'=$2 AND conversation_state->>'reschedule_state'='completed' RETURNING ref_token;","["+ref+".ref_token,"+ref+".request_id]",2300),
    telegram('Alert Manager: Change Confirmation Failed',"=The calendar change for {{ "+ref+".ref_token }} completed and the old slot was verified cancelled, but resident confirmation could not be confirmed delivered. Follow up with the resident; do not reschedule again.",2300,false),
    telegram('Confirm Verified Change To Manager',"={{ $('Compose Verified Tour Change').first().json.manager_text }}",2200,false),
    pg('Mark Calendar Change Uncertain',uncertainSql,"["+ref+".ref_token,"+ref+".request_id]",3000,true),
    telegram('Alert Manager: Reconcile Tour Change',"=Calendar change for {{ "+ref+".ref_token }} could not be fully verified. Check the original and replacement booking before taking any further action. Do not approve or retry automatically; tour completion is blocked while this remains unresolved.",3000,false),
    telegram('Tell Resident: Calendar Change Needs Review','The team is checking the calendar change. We cannot confirm the new time yet. Please wait for a colleague to confirm which booking is active.',3000,true),
  ];
  nodes.push(...additions);
  Object.assign(connections,wf.connect({
    'Reschedule Requested (Internal)':[['Authenticate Reschedule Request']], 'Authenticate Reschedule Request':[['Load Current Tour For Change']],
    'Load Current Tour For Change':[['Current Tour Can Change?']], 'Current Tour Can Change?':[['Cal.com: Read Change Availability'],['Alert Manager: Change Lookup Failed']],
    'Cal.com: Read Change Availability':[['Match Exact Reschedule Time'],['Alert Manager: Change Lookup Failed']],
    'Match Exact Reschedule Time':[['Exact New Time Exists?'],['Alert Manager: Change Lookup Failed']],
    'Exact New Time Exists?':[['Save Pending Reschedule'],['Offer Exact Change Alternatives']],
    'Save Pending Reschedule':[['Change Request Saved?']], 'Change Request Saved?':[['Ask Manager: Approve Tour Change'],['Alert Manager: Change Lookup Failed']],
    'Ask Manager: Approve Tour Change':[['Tell Resident: Change Pending']],
    'Alert Manager: Change Lookup Failed':[['Tell Resident: Change Lookup Needs Followup']],
    'Reschedule Decision (Internal)':[['Authenticate Reschedule Decision']], 'Authenticate Reschedule Decision':[['Claim Pending Reschedule']],
    'Claim Pending Reschedule':[['Read Reschedule Decision']], 'Read Reschedule Decision':[['Reschedule Decision Claimed?']],
    'Reschedule Decision Claimed?':[['Change Approved?'],['Notify Manager: Stale Change Action']],
    'Change Approved?':[['Cal.com: Recheck Approved Change'],['Tell Resident: Original Tour Kept']],
    'Tell Resident: Original Tour Kept':[['Confirm Original Kept To Manager','Log Prospect Telegram Message']],
    'Cal.com: Recheck Approved Change':[['Check Approved Time Still Open'],['Mark Calendar Change Uncertain']],
    'Check Approved Time Still Open':[['Approved Change Still Available?'],['Mark Calendar Change Uncertain']],
    'Approved Change Still Available?':[['Cal.com: Reschedule Approved Tour'],['Mark Change Time Unavailable']],
    'Mark Change Time Unavailable':[['Tell Resident: Change Time Taken']], 'Tell Resident: Change Time Taken':[['Notify Manager: Change Time Taken','Log Prospect Telegram Message']],
    'Cal.com: Reschedule Approved Tour':[['Validate Calendar Replacement'],['Mark Calendar Change Uncertain']],
    'Validate Calendar Replacement':[['Store Calendar Change Receipt'],['Mark Calendar Change Uncertain']],
    'Store Calendar Change Receipt':[['Cal.com: Verify Old Slot Cancelled'],['Mark Calendar Change Uncertain']],
    'Cal.com: Verify Old Slot Cancelled':[['Validate Old Booking Cancellation'],['Mark Calendar Change Uncertain']],
    'Validate Old Booking Cancellation':[['Record Confirmed Tour Change'],['Mark Calendar Change Uncertain']],
    'Record Confirmed Tour Change':[['Compose Verified Tour Change'],['Mark Calendar Change Uncertain']],
    'Compose Verified Tour Change':[['Confirm Verified Change To Resident'],['Mark Calendar Change Uncertain']],
    'Confirm Verified Change To Resident':[['Mark Change Confirmation Delivered','Log Prospect Telegram Message'],['Alert Manager: Change Confirmation Failed']],
    'Mark Change Confirmation Delivered':[['Confirm Verified Change To Manager']],
    'Mark Calendar Change Uncertain':[['Alert Manager: Reconcile Tour Change']], 'Alert Manager: Reconcile Tour Change':[['Tell Resident: Calendar Change Needs Review']],
  }));
  for (const name of ['Tell Resident: Change Pending','Offer Exact Change Alternatives','Tell Resident: Change Lookup Needs Followup','Tell Resident: Calendar Change Needs Review']) {
    connections[name]=wf.connect({x:[['Log Prospect Telegram Message']]}).x;
  }
  for (const name of ['Store Calendar Change Receipt','Record Confirmed Tour Change','Confirm Verified Change To Resident']) nodes.find(n=>n.name===name).onError='continueErrorOutput';
  nodes.find(n=>n.name==='Mark Calendar Change Uncertain').onError='continueRegularOutput';
  require('./pipeline-mirror').attach(wf,nodes,connections,'Save Pending Reschedule','$json.ref_token','Pending Change');
  require('./pipeline-mirror').attach(wf,nodes,connections,'Record Confirmed Tour Change','$json.ref_token','Confirmed Change');
  require('./pipeline-mirror').attach(wf,nodes,connections,'Tell Resident: Original Tour Kept',ref+'.ref_token','Declined Change');
  require('./pipeline-mirror').attach(wf,nodes,connections,'Mark Change Time Unavailable','$json.ref_token','Unavailable Change');
};
