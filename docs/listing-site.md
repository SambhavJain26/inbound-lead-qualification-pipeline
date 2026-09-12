# The Listing Site

The demo's front door. A renter browses it, opens a unit, and submits the contact form — which
creates the lead and hands them to the leasing assistant on Telegram.

## Why it is generated, not hand-written

`scripts/build-listing-site.js` reads the `units` rows out of Postgres and writes static HTML.
That is deliberate: the listing a renter reads and the facts the assistant is allowed to quote
then come from **one record** and cannot drift apart. "Every number on that page and every
number in the reply came out of the same row" is a demo beat, not an implementation detail.

It also means the page is never stale. Change a rent in the database, rebuild, and both the
listing and the assistant's answers move together.

## Running it

```bash
node scripts/build-listing-site.js          # regenerate from Postgres
node scripts/serve-listing-site.js --detach # serve on http://localhost:8080
node scripts/serve-listing-site.js --stop
```

Output goes to `data/listing-site/`, which is gitignored — it is build output. The committed
source is `site-assets/`.

`--from-fixtures` builds without Postgres, which is useful when the containers are down.

**The site does not depend on the tunnel.** The contact form posts to `http://localhost:5678`,
so a new cloudflared hostname does not invalidate it. Rebuild only when unit content changes.

## Why the form is a plain HTML form

The contact form is `<form method="post" action="http://localhost:5678/webhook/listing-inquiry">`
with no JavaScript. That is load-bearing:

- A native form post is a **top-level navigation**, so there is no CORS preflight between
  `:8080` and `:5678`, and the browser **renders the HTML that n8n returns**. That returned
  page is the Telegram handoff, so rendering it is the entire point.
- Converting it to `fetch()` breaks both halves: the request needs `allowedOrigins` configured
  on the webhook, and the HTML response has nothing to render it.

## Photos

Drop real files into `site-assets/` named after the photo keys in `fixtures/demo-data.js`:

```
site-assets/MAPLE-2B-1.jpg   <- the photo on the listings grid, so make it the best one
site-assets/MAPLE-2B-2.jpg
site-assets/MAPLE-2B-3.jpg
site-assets/MAPLE-5A-1.jpg
site-assets/MAPLE-5A-2.jpg
site-assets/MAPLE-5A-3.jpg
```

`.jpg`, `.jpeg`, `.png` and `.webp` all work. Anything missing gets a generated SVG
placeholder, so the site always renders. The build prints how many were supplied and how many
were placeholders — a filename typo is obvious immediately.

Cards and the gallery crop to 3:2, so roughly landscape is right; about 1200×800 is plenty.

Keep them plausible for the units: MAPLE-2B is a second-floor 2 bed / 1 bath with a balcony,
MAPLE-5A a top-floor 3 bed / 2 bath corner unit with in-unit laundry. A photo that contradicts
the facts on the page pulls a viewer straight out of the demo.

## Styling

`site-assets/styles.css` is the source, copied into the build. The n8n rental application form
gets a matching palette from `FORM_CSS` in `scripts/lib/wf-common.js` so the form the renter
taps through to does not look like a different product. **If you change the accent colour in
one, change it in the other** — they are not generated from a shared value.

## Adding a unit

1. Add it to `units` in `fixtures/demo-data.js`, including `title`, `description` and `photos`.
2. **Keep dollar figures out of `description`.** The Tier A guardrail only permits numbers
   present in the unit record, so a marketing sentence carrying a new figure teaches the model
   an ungrounded number and the message gets blocked before it sends.
3. `node scripts/seed-demo.js`
4. `node scripts/build-listing-site.js`

## What production replaces

The listing site is the most easily swapped part of the build. In a real deployment the renter
arrives from Zillow, Apartments.com, or the operator's own website, and the contact form is
whatever that site already uses. Everything downstream is identical — the system also accepts
leads arriving by email, which is how syndication sites actually deliver them.
