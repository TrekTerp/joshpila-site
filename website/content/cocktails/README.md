# Updating the cocktail archive

## Owner workflow on the hosted Site

Sign in as Josh, then open an Advent calendar in the Cabinet.

- Existing day or finder recipe: open its card and choose **Add a photo** inside the empty photograph placeholder. Select a picture, review the preview, optionally add a caption, then **Save photo**. Everything stays in the card; the year, day, and displayed recipe variant are supplied automatically. Use the sibling recipe links before choosing a photo if you made another variant. A substitution with no recorded recipe gets a day-level photo. JPEG, PNG, and WebP are supported. The browser prepares a publication copy up to 2400 pixels, removing embedded metadata. Keep original camera files separately.
- New day: **Add a day**, paste its source link, then **Read recipe**. Direct fetching supports Reddit r/cocktails posts; when unavailable or for another source, paste the post text. Review the date, drink name, each variant, measurements, method, and search ingredients, then check the review box and save.
- Add photos after making the drink. The saved day has a stable calendar URL and appears in the finder. A newly used year appears on the glass shelf automatically.
- **Export records** downloads the merged JSON archive and original imported text. It includes photo URLs and metadata, not the photo binaries; it is not a complete offline photo backup.

The parser is conservative and may require corrections for unusual formatting or prose. No scheduled fetching or automatic publication is enabled. Existing days cannot be overwritten by importing another link. Original imported source text is stored privately and available only through owner-authorized import review and records export. The visitor archive response excludes it. Method drafts accept likely preparation lines instead of arbitrary trailing prose; unusual formatting and any copied narrative still need owner review.

D1 holds new recipes, source text, and photo metadata; R2 holds photo bytes. These are server-side records that survive browser closure, devices, and redeployments to this same Site. Baseline assets remain in Git. A hosting move must migrate D1 and R2 as well as the repository; a static-only copy will not include new records. Do not delete/recreate the Site or its storage to deploy updates.

For an existing picture, choose the smaller **Replace this photo** control below it, select a new image, then **Save replacement**. The old image stays visible until saving succeeds. Replacement affects only the displayed recipe variant (or the day when no recipe is recorded); sibling variants retain their image. Previous files and records are kept, though an undo/history interface is not yet provided. A duplicate image already assigned elsewhere returns an explicit conflict; reassignment is a separate capability. Replacement metadata uses the additive `0001_mature_hulk.sql` migration.

Write endpoints require the platform-provided owner identity and a matching Origin. The current owner email is explicitly configured server-side in `lib/cocktails/server.ts`; account changes require a reviewed code update. Private audience remains unchanged.

## Baseline maintenance by a developer

`archive.json` is the canonical imported baseline. Hosted additions live in D1 and R2. Do not edit the generated `public/cocktails/data/data.js`
or `app/cocktail-years.generated.json` directly.

1. Add a recipe with a unique stable slug, year, day/date, source URL, and separate specs.
   Use an existing record as a shape reference; keep each variant's ingredients separate.
2. Add a daySlot for that year/day (1–24), with the official recipe slug. Record an actual
   recipe/variant only when known. A named substitution with no recorded spec remains explicit.
3. Copy publication-size JPEGs into `public/cocktails/photos/YYYY/`. Add photo records and
   daySlot photo IDs. Preserve confidence and provenance fields; do not invent associations.
4. Optional: add `{ "year": 2027, "status": "upcoming" }` to `years` to show an empty future
   glass before content exists. Years with content appear automatically. `backfill` preserves
   the special 2020/2021 status; other years become Archive as day slots are added.
5. Run `npm run sync:cocktails`, `npm run check:cocktails`, and `npm run lint`. Review the year,
   a day, a variant, and photos in the browser. Build and publish through the existing Sites
   workflow. The build also runs sync automatically.

The year shelf, calendar tabs, backstory counts, and upcoming/partial states update from data.
No calendar rollover, external scraping, or automatic publishing occurs. A partial December
shows only the recorded days. Do not copy placeholder data to fill missing dates.

Direct paths use `/cocktails/index.html?view=calendar&year=2026`, optionally `&day=1`.
Finder detail uses `?view=finder&recipe=SLUG--v1`. The Cabinet return restores the selected year. Cabinet shelf clicks use the in-scene panel,
with `panel=backstory`, `panel=advent`, or `panel=recipes` on `/study/cabinet`.
The shared archive supports `embed=cabinet`; it hides its standalone header and sends validated
same-origin year/close messages to the owning panel. Keep the tool logic shared between both views.

The archive presents recipe specifications, Josh’s photographs and notes, creator credits, and source links. C-062 supersedes the earlier blanket private-reference publication hold. Historical framework documentation remains in `docs/COCKTAILS_IMPORTED_FRAMEWORK.md`. New imports require owner review to exclude copied stories or article text. The current Site remains owner-private; changing audience and moving to joshpila.com are separate tasks.
