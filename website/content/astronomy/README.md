# Astronomy gallery

The 88-photo catalog is `catalog.json`. Its browser copy, `public/astronomy/catalog-data.js`, assigns the same JSON to `window.JP_ASTRONOMY`. Keep both copies synchronized; `pnpm run check:astronomy` verifies this and the linked image files.

There are 87 dated photographs across 42 observing nights. Dates were checked against the original filenames, camera metadata, and dated observing folders. Each record preserves its date provenance. The planet-size montage is a composite with no single observing date; do not assign it one.

The display and thumbnail WebP copies are versioned under `public/astronomy/`. They preserve orientation, scale 16-bit lunar images to 8-bit for the web, and omit embedded EXIF, GPS, and XMP. Original photos are not changed. Source hashes provide stable image IDs.

The solar-system panel uses approximate JPL planetary elements and a lunar model adapted from the pinned SkyWatcher source. It shows a camera capture time when available; otherwise it explicitly uses 9 pm Pacific as a reference. Pacific daylight-saving offsets are calculated for the observing date. No positions or lunar phase are assigned to the composite. The outer seasonal index is separate from planetary coordinates.

The gallery is a self-contained static page at `/astronomy/`. Next's static export copies it into the Pages artifact, and the previous `/artifact/sky/photos/` route redirects there. A `?photo=astro-…` query links to an individual photograph.
