/* Deterministic manager chat controls. AI never resolves records or actions. */
function parseManagerUpdate(update, allowedChat) {
  var callback = update.callback_query;
  var message = callback ? callback.message : update.message;
  var from = callback ? callback.from : message && message.from;
  if (!message || !from || String(message.chat.id) !== String(allowedChat) ||
      String(from.id) !== String(allowedChat) || message.chat.type !== 'private') return null;
  var raw = String(callback ? callback.data : message.text || '').trim();
  var actor = from.username ? '@' + from.username :
    [from.first_name, from.last_name].filter(Boolean).join(' ') || String(from.id);
  var result = { actor: actor, chat_id: message.chat.id, callback_query_id: callback && callback.id,
    dedupe_key: callback ? 'mgr-cb-' + callback.id : 'mgr-msg-' + message.chat.id + '-' + message.message_id,
    raw_text: raw, ref_token: null, target_name: null, action: 'help', request_id: null, reply_text: null };
  if (callback) {
    var parts = raw.split(':');
    var actions = { tba: 'tour_approve', tbd: 'tour_decline', tcm: 'tour_complete',
      rsa: 'reschedule_approve', rsd: 'reschedule_decline',
      apr: 'application_approve', con: 'application_conditional', rev: 'application_review', wel: 'send_welcome' };
    result.action = actions[parts[0]] || 'help';
    result.ref_token = parts[1] || null;
    result.request_id = parts[2] || null;
    return result;
  }
  var token = raw.match(/\b([RA]-\d{4})\b/i);
  result.ref_token = token ? token[1].toUpperCase() : null;
  var send = raw.match(/^send\s+(?:message|reply)(?:\s+([RA]-\d{4}))?\s*:\s*([\s\S]+)$/i);
  if (send) {
    result.action = 'send_message'; result.reply_text = send[2].trim(); return result;
  }
  var command = raw.replace(/\b[RA]-\d{4}\b/ig, '').trim().replace(/^\//, '');
  if (/^(?:tour\s+(?:is\s+)?complet(?:e|ed)|complet(?:e|ed)\s+(?:the\s+)?tour)/i.test(command)) {
    result.action = 'tour_complete';
    var name = command.match(/\bfor\s+(.+)$/i); result.target_name = name ? name[1].trim() : null;
  } else if (/^(?:approve|confirm)\s+(?:the\s+)?(?:change|reschedule|rescheduling)$/i.test(command)) {
    result.action = 'reschedule_approve';
  } else if (/^(?:keep\s+(?:the\s+)?original(?:\s+(?:booking|time))?|decline\s+(?:the\s+)?(?:change|reschedule))$/i.test(command)) {
    result.action = 'reschedule_decline';
  } else if (/^(?:approve|confirm)\s+(?:the\s+)?(?:tour|meeting|viewing)(?:\s+time)?$/i.test(command)) {
    result.action = 'tour_approve';
  } else if (/^(?:decline\s+(?:the\s+)?(?:tour|meeting|viewing)|not\s+that\s+time)$/i.test(command)) {
    result.action = 'tour_decline';
  } else if (/^(?:approve|approved|yes)$/i.test(command)) result.action = 'approve';
  else if (/^(?:approve\s+(?:the\s+)?application)$/i.test(command)) result.action = 'application_approve';
  else if (/^(?:send\s+to\s+review|review)$/i.test(command)) result.action = 'application_review';
  else if (/^send\s+(?:the\s+)?welcome(?:\s+(?:email|packet))?$/i.test(command)) result.action = 'send_welcome';
  else if (/^(?:status|updates?|what(?:'s| is)\s+pending)$/i.test(command)) result.action = 'status';
  return result;
}

function resolveManagerTarget(action, leads, applications) {
  var eligibleLeads = (leads || []).filter(function (l) {
    return l.status !== 'closed' && l.is_active_demo_recipient !== false;
  });
  var candidates = [];
  if (action.action === 'tour_approve' || action.action === 'tour_decline' || action.action === 'approve') {
    candidates = eligibleLeads.filter(function (l) { return l.tour_approval_state === 'pending'; })
      .map(function (l) { return { kind: 'tour', row: l }; });
  }
  if (/^application_/.test(action.action) || action.action === 'approve') {
    candidates = candidates.concat((applications || []).filter(function (a) {
      return !a.decision && a.status === 'awaiting_decision' && a.criteria_result !== 'does_not_meet';
    }).map(function (a) { return { kind: 'application', row: a }; }));
  }
  if (/^reschedule_/.test(action.action) || action.action === 'approve' || action.action === 'tour_approve' || action.action === 'tour_decline') {
    candidates = candidates.concat(eligibleLeads.filter(function (l) {
      return l.status === 'tour_booked' && l.calcom_booking_uid && l.conversation_state?.reschedule_state === 'pending';
    }).map(function (l) { return { kind: 'reschedule', row: l }; }));
  }
  if (action.action === 'tour_complete') candidates = eligibleLeads.filter(function (l) {
    return l.status === 'tour_booked' && l.calcom_booking_uid &&
      ['pending','processing','failed_or_uncertain'].indexOf(l.conversation_state?.reschedule_state) === -1;
  }).map(function (l) { return { kind: 'completion', row: l }; });
  if (action.action === 'send_message') candidates = eligibleLeads.filter(function (l) {
    return l.telegram_chat_id;
  }).map(function (l) { return { kind: 'message', row: l }; });
  if (action.action === 'send_welcome') candidates = (applications || []).filter(function (a) {
    return a.lease_status === 'signed' && !a.welcome_claimed;
  }).map(function (a) { return { kind: 'welcome', row: a }; });
  if (action.ref_token) candidates = candidates.filter(function (c) {
    return c.row.ref_token === action.ref_token;
  });
  if (action.target_name) candidates = candidates.filter(function (c) {
    return String(c.row.prospect_name || c.row.full_name).toLowerCase() === action.target_name.toLowerCase();
  });
  if (candidates.length !== 1) return { ok: false, text: candidates.length ?
    'More than one item matches. Include the R-reference or A-reference; no action was taken.' :
    'No matching pending item. It may already be actioned, or the tour has not been booked. No action was taken.' };
  var selected = candidates[0];
  var expectedRequest = selected.kind === 'reschedule' ? selected.row.conversation_state?.reschedule_request_id : selected.row.conversation_state?.pending_tour_action_id;
  if (action.request_id && action.request_id !== expectedRequest) {
    return { ok: false, text: 'This card is stale. Use the latest approval card. No action was taken.' };
  }
  return { ok: true, kind: selected.kind, row: selected.row };
}

function requiresManagerReview(text) {
  return /\b(confidential|private|internal|owner'?s?\s+(?:phone|email|details)|other\s+(?:tenant|resident|applicant)|master\s+(?:key|code)|door\s+code|entry\s+code|bank\s+(?:details|account)|security\s+code|lower\s+(?:the\s+)?rent|discount|negotiate)\b/i.test(String(text || ''));
}

function managerMessageCheck(text, knowledge, guardrail) {
  var verdict = guardrail(text, knowledge);
  if (!String(text || '').trim() || String(text).length > 2500 ||
      /\b(?:SSN|social security|bank account|routing number|passport|master code|door code|entry code|confidential|other tenant|other resident)\b/i.test(text)) {
    verdict.passed = false;
    verdict.findings.push({ category: 'private_or_invalid_message', severity: 'block', detail: 'Private disclosure or invalid message' });
  }
  return verdict;
}

if (typeof module !== "undefined") {
  module.exports = { parseManagerUpdate, resolveManagerTarget, requiresManagerReview, managerMessageCheck };
}
