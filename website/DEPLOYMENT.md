# GitHub Pages + Supabase

The repository root's existing D&D and Games files remain authoritative. `website/` contains the Orrery and cabinet source. The Pages workflow builds `website/out`, then adds the existing `dnd/`, `games/`, domain and icons to the deployment artifact.

## SkyWatcher

Sky links to `/astronomy/`, with the photography gallery at `/astronomy/gallery/` and the planner at `/skywatcher/`. `/artifact/sky/` and `/artifact/sky/photos/` remain as compatibility redirects. Legacy photo/view queries and gallery fragments on `/astronomy/` are forwarded to the gallery with their query and fragment intact.
The Pages workflow checks out `TrekTerp/SkyWatcher` at commit `954ac57ae6911849ccd093b8ffd8a40d7a60ebbb`. Update that pinned ref to publish a newer planner version. Its JavaScript is retained unchanged; assembly adds return links and updates the public URL metadata. For local assembly, run `node website/scripts/assemble-pages.mjs /absolute/path/to/SkyWatcher/index.html` after the frontend build.
Browser preferences are stored per origin: existing settings on `trekterp.github.io` do not transfer automatically to `www.joshpila.com`. The original GitHub Pages app remains available.

## Cocktail backend

Project: `orrery-cabinet` (`skcjspvcinvknkqvgnfk`).

- `supabase/schema.sql` records the applied schema. Do not re-run it on the populated database.
- `supabase/functions/cocktails/` is the deployed API source, including the baseline archive.
- New recipes and photograph records persist in Postgres. New photographs persist in the `cocktail-photos` bucket. Original art and 130 archived photos live in versioned website assets.
- Only a confirmed Supabase user with email `joshpila@gmail.com` may edit. The function checks the token using `auth.getUser` before writes or private exports. Anonymous and authenticated roles have no direct table-write permission.
- Recipe source text is private; public archive responses contain the reviewed recipes only.
- Replacement uses a new object and retains the prior photo. Replacements are scoped to the selected day/variant.
- No secret key belongs in this repository. The publishable browser key is intentionally public. The server uses Supabase's built-in service-role environment variable.
- The Edge Function has gateway JWT verification disabled because the archive is public and editing authentication is performed inside the function.

## Hosting and owner sign-in

1. GitHub Pages is configured to deploy through GitHub Actions, with custom domain `www.joshpila.com` and HTTPS enforced. The first deployment succeeded on 2026-11-01.
2. Supabase Authentication URL configuration is saved: Site URL `https://www.joshpila.com`; allowed redirect URL `https://www.joshpila.com/cocktails/**`.
3. Use Owner sign-in → Email me a sign-in link, then follow the email. The Supabase account login is separate from this website's Auth user. If the default Supabase mail service does not permit the owner's address, configure SMTP or an appropriate supported Auth provider.
4. From the deployed card, upload and replace a test photo, refresh, then verify in a separate signed-out browser. Complete this real-account test before considering owner access verified.

## Local checks

Node 22.13+; pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm run check:astronomy`, `pnpm run check:backend`, `pnpm run build`, `pnpm run check:cocktails`, `pnpm run check:cocktail-import`, and `pnpm run check:orrery` from `website/`.

The shared parser conservatively creates a draft from supported Reddit links or pasted post text. Owner review is required before saving; it does not automatically publish future days.

## Recovery

The original GitHub root index remains in Git history. Switch Pages back to its former branch source to roll back the frontend. Supabase changes are additive and no changes are made to other Supabase projects. Preserve database backups and the photo bucket separately from Git.

## Origin and Patterns, 0.19.0 (2026-11-07)

Origin remains at `/artifact/origin/`. The sun opens it directly. Its approved draft 0.2.1 copy is stored in `app/origin-copy.json`, with a static sun illustration and a 36rem reading column. Contact remains visibly TBD. Games stays in the shared navigation alongside the six worlds named in the handoff.

The Patterns world retains internal ID `patterns` and its original scene configuration. Its public route is `/patterns/`; the previously shipped `/artifact/patterns/` redirects there, preserving query and fragment. No other magic-squares route existed in this repository. The collection lists Magic squares, Conway's Life Lab, and 6174. Life Lab is self-hosted at `/patterns/life/`. Its supplied source is retained byte-for-byte in `vendor/conways-life-lab.html`; assembly adds site navigation in the existing header and Patterns icons without changing the simulation scripts or styles.

Origin's footer maps the supplied placeholder links to existing destinations:

| Supplied link | Published destination |
| --- | --- |
| `/sky/` | `/astronomy/` |
| `/cocktails/` | `/study/cabinet/` |
| `/campaigns/` | `/dnd/` |
| `/patterns/` | `/patterns/` |
| `/workshop/` | `/artifact/workshop/` |
| `/writing/` | `/artifact/writing/` |

Return links include the selected world ID; internal departures also preserve it in browser history. Reduced-motion users skip the return transition. The Origin text was compared against the supplied handoff after rendering. Desktop and 375px layouts, keyboard focus, and return navigation were checked in the browser. This QA browser lacks WebGL; the unchanged Orrery geometry and light behavior pass the existing numeric checks.

## Validation on 2026-11-01

- Production static export and TypeScript pass.
- Archive validation: 144 days, 381 variants, 130 photos; future-year coverage passes.
- Supabase-backed handler tests pass with a deterministic storage/database double, including unverified/nonowner denial, source privacy, parsing/review, upload, duplicate handling, replacements, stale-card rejection and sibling isolation.
- Live API returns the expected archive and rejects unauthenticated mutations/exports. Supabase security advisor returns no findings.
- All 65 original D&D/Games files match the assembled deployment byte-for-byte.
- Browser: cabinet opens/closes, year links open the embedded calendar, the recovered Daiquiri photo loads at 1844px wide with the correct variant, Return to Orrery navigates correctly.
- Browser QA used bundled data because the internal preview origin is intentionally outside the production API CORS allowlist. The browser lacks WebGL, so Orrery animation could not be visually verified.
- Real owner sign-in and authenticated live upload remain unverified pending the owner's first login. Auth URLs are configured. No test accounts or test images were added to production.
- GitHub PR #1 merged; the production build and Pages deployment passed. The live homepage, cabinet, archive, SDK, and recovered Daiquiri photo return HTTP 200. The live D&D and Games index files match the originals byte-for-byte.
- Live browser checks passed for ascending year navigation, embedded 2020 calendar, the 1844px Daiquiri photograph, cabinet close, and Return to Orrery. The QA browser lacks WebGL, so the homepage's fallback navigation was verified instead of the 3D animation.
