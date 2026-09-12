# site-assets

Source assets for the demo listing site. Committed; `data/listing-site/` is the
generated output and is gitignored.

## Dropping in real photos

`scripts/build-listing-site.js` looks here for a file named after each photo key
in `fixtures/demo-data.js`, and falls back to a generated SVG placeholder when
there isn't one.

Save your photos with these exact names (any of `.jpg`, `.jpeg`, `.png`,
`.webp`):

```
site-assets/MAPLE-2B-1.jpg     <- the main photo on the listing card
site-assets/MAPLE-2B-2.jpg
site-assets/MAPLE-2B-3.jpg
site-assets/MAPLE-5A-1.jpg
site-assets/MAPLE-5A-2.jpg
site-assets/MAPLE-5A-3.jpg
```

Then rebuild:

```bash
node scripts/build-listing-site.js
```

The build prints how many photos were supplied and how many were still
placeholders, so you can tell at a glance whether a filename didn't match.

**Sizing:** the cards and the gallery crop to 3:2, so anything roughly landscape
works. Around 1200×800 is plenty — larger files only slow the page down.

`-1` is the photo that appears on the listings grid, so make that the best one.

**Keep them plausible for the units.** MAPLE-2B is a 2 bed / 1 bath second-floor
flat with a balcony; MAPLE-5A is a 3 bed / 2 bath top-floor corner unit with two
balconies and in-unit laundry. A photo that obviously contradicts the facts on
the page is the kind of detail that pulls a viewer out of the demo.

## styles.css

The listing site's stylesheet. The build copies it into `data/listing-site/`,
and the n8n rental application form gets a matching palette from `FORM_CSS` in
`scripts/lib/wf-common.js` — if you change the accent colour here, change it
there too, or the form the prospect taps through to will not match.
