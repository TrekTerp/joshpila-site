# Astronomy gallery

The 90-image catalog is `catalog.json`. Its browser copy, `public/astronomy/catalog-data.js`, assigns the same JSON to `window.JP_ASTRONOMY`. Keep both copies synchronized; `pnpm run check:astronomy` verifies this and the linked image files.

There are 87 dated photographs across 42 observing nights. Dates were checked against the original filenames, camera metadata, and dated observing folders. Each record preserves its date provenance. The planet-size montage and two Moon GIFs are composites with no single observing date; do not assign them one. The animations use static WebP poster thumbnails and retain their original GIF files for the main and enlarged viewers. Their records include source photo IDs and frame counts.

The display and thumbnail WebP copies are versioned under `public/astronomy/`. They preserve orientation, scale 16-bit lunar images to 8-bit for the web, and omit embedded EXIF, GPS, and XMP. Original photos are not changed. Source hashes provide stable image IDs.

The solar-system panel uses approximate JPL planetary elements and a lunar model adapted from the pinned SkyWatcher source. It shows a camera capture time when available; otherwise it explicitly uses 9 pm Pacific as a reference. Pacific daylight-saving offsets are calculated for the observing date. No positions or lunar phase are assigned to composites. The outer seasonal index is separate from planetary coordinates.

The landing page is `/astronomy/`; the self-contained static gallery is `/astronomy/gallery/`. Image and script assets remain under `/astronomy/` so existing asset links and caches stay valid. `/artifact/sky/` redirects to the landing page, and `/artifact/sky/photos/` redirects to the gallery. Legacy `/astronomy/?photo=…`, `?view=…`, and gallery-fragment links redirect to the gallery while retaining the full query and fragment. Redirects use client-side replacement because hosting is a static Pages export. A bare old `/astronomy/` bookmark now opens the landing page with its gallery link.

The ordered `highlights` list contains ten curated original photo IDs; their `featured` flags must agree. The gallery opens on this selection unless a direct link selects another photo or `view=all` is specified. Play highlights opens the enlarged viewer and advances every five seconds, looping through this list. Playback pauses on manual photo navigation, filter changes, closing the viewer, an image error, or leaving the tab. There is no autoplay or additional GIF.
