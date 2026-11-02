# Section icons

These SVGs are the source artwork for browser icons. PNG copies at 32, 48, and 180 pixels support browser fallbacks and home-screen bookmarks. Home and About use Josh’s existing JP monogram. Other designs use each section’s accent color.

Next page metadata is assigned by `app/section-metadata.ts`. Static astronomy, cocktail, D&D, and games pages declare their icons in HTML. SkyWatcher receives its telescope icon during Pages assembly, preserving its upstream source. Existing individual game icons and custom D&D tool icons are retained.

After building and assembling Pages, run `node website/scripts/check-section-icons.mjs` from the repository root. CI runs this check before publishing.

SkyWatcher also requires a 64px PNG icon: its startup code reads that specific link to initialize the header logo. The icon check executes the actual initializer against the assembled links and validates the image.
