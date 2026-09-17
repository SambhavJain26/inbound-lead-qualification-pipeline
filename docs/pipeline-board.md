# Pipeline board

Postgres is the truth; Airtable is a display-only mirror. Never edit Airtable to
approve an applicant or change workflow state. Manager actions stay in Telegram.

One row represents one lead. Application Reference identifies its latest
application; an unlinked application has its own row. Rebuilds and live writes
share `scripts/lib/pipeline-mirror.js`, so multiple applications do not duplicate
the lead. Lease Sent means an envelope was sent, not that a lease was signed.

New fields: Application Reference, Next Action, Lease Status, Last Synced At,
and Demo Data. Updated is the source record's update time; Last Synced At is
the mirror write time. Every row is synthetic demo data.

## Optional views — intentionally skipped

Operator chose to skip these views on 2026-09-14. The existing Grid view is
sufficient for rehearsal and recording; no sign-in or view setup is pending.
The settings below are retained only as optional future reference.

- Pipeline: Kanban, stacked by Status. Show Prospect, Unit, Application Reference
  and Next Action on each card.
- Needs Attention: grid, filter Status is Applied OR Decided OR Stopped For Review.
  Show reference, prospect, unit, status, application reference and next action.
- Leased: grid, filter Status is Leased. Show lease status and last sync.

These are presentation views, not extra state tables. Keep Grid view available
for troubleshooting. Do not expose detailed extraction evidence on the board;
the manager's Telegram card already contains that evidence.

## Recovery and rehearsal

Run `node scripts/sync-airtable.js` to rebuild from Postgres without reading
workflow state from Airtable. Upserts merge on Ref Token, in batches of ten.
Run `node scripts/preserve-demo-evidence.js` before clearing a verified journey.
Then `node scripts/reset-demo.js --with-airtable` and
`node scripts/build-listing-site.js` create the clean rehearsal state.

Reset removes this project's synthetic Postgres rows and Airtable mirror rows.
It does not delete mail, Telegram history, Cal.com bookings or DocuSign envelopes.
