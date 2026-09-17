/* Calendar changes are state-gated; AI extracts a preference, never authority. */
function classifyRescheduleTurn(lead, payload, context, reviewChecker) {
  var check = reviewChecker || (typeof requiresManagerReview === 'function' ? requiresManagerReview : null);
  if (!check) throw new Error('A privacy-review checker is required.');
  var state = lead.conversation_state || {};
  var text = String(context.current_message || '');
  var explicitHuman = /\b(?:human|person|agent|manager|colleague)\b/i.test(text);
  var changing = /\b(?:change|reschedule|move)\b.*\b(?:booking|tour|time|appointment)\b|\breschedul/i.test(text);
  var preference = Boolean(payload.tour_preference);
  var requested = lead.status === 'tour_booked' && Boolean(lead.calcom_booking_uid) &&
    (changing || state.awaiting_reschedule_time || (preference && payload.intent === 'book_tour'));
  var blocked = ['pending', 'processing', 'failed_or_uncertain'].indexOf(state.reschedule_state) !== -1;
  var safe = requested && !explicitHuman && !context.force_handoff && !check(text);
  return { requested: safe, needs_time: safe && !preference && !blocked,
    submit: safe && preference && !blocked, blocked: safe && blocked };
}

function validateRescheduledBooking(response, oldUid, wantedStart) {
  var booking = response && response.data;
  if (!booking || !booking.uid || booking.uid === oldUid || booking.status !== 'accepted' ||
      !Number.isFinite(Date.parse(booking.start)) || Date.parse(booking.start) !== Date.parse(wantedStart) ||
      booking.rescheduledFromUid !== oldUid) {
    throw new Error('Replacement booking was not confirmed with the expected time and original UID; reconcile the calendar.');
  }
  return booking;
}

function validateOriginalCancellation(response, oldUid, newUid) {
  var booking = response && response.data;
  if (!booking || booking.uid !== oldUid || booking.status !== 'cancelled' ||
      (booking.rescheduledToUid && booking.rescheduledToUid !== newUid)) {
    throw new Error('Original booking cancellation could not be verified; reconcile the calendar.');
  }
  return true;
}

if (typeof module !== "undefined") {
  module.exports = { classifyRescheduleTurn, validateRescheduledBooking, validateOriginalCancellation };
}
