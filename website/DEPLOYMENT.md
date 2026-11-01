# GitHub Pages + Supabase

The repository root's existing D&D and Games files remain authoritative. `website/` contains the Orrery and cabinet source. The Pages workflow builds `website/out`, then adds the existing `dnd/`, `games/`, domain and icons to the deployment artifact.

## Backend

Project: `orrery-cabinet` (`skcjspvcinvknkqvgnfk`).

- `supabase/schema.sql` records the applied schema. Do not re-run it on the populated database.
- `supabase/functions/cocktails/` is the deployed API source, including the baseline archive.
- New recipes and photograph records persist in Postgres. New photographs persist in the `cocktail-photos` bucket. Original art and 130 archived photos live in versioned website assets.
- Only a confirmed Supabase user with email `joshpila@gmail.com` may edit. The function checks the token using `auth.getUser` before writes or private exports. Anonymous and authenticated roles have no direct table-write permission.
- Recipe source text is private; public archive responses contain the reviewed recipes only.
- Replacement uses a new object and retains the prior photo. Replacements are scoped to the selected day/variant.
- No secret key belongs in this repository. The publishable browser key is intentionally public. The server uses Supabase's built-in service-role environment variable.
- The Edge Function has gateway JWT verification disabled because the archive is public and editing authentication is performed inside the function.

## Remaining account setup

1. Repository Settings → Pages → Source: GitHub Actions. Keep custom domain `www.joshpila.com` and enforce HTTPS.
2. Supabase Authentication URL configuration is saved: Site URL `https://www.joshpila.com`; allowed redirect URL `https://www.joshpila.com/cocktails/**`.
3. Use Owner sign-in → Email me a sign-in link, then follow the email. The Supabase account login is separate from this website's Auth user. If the default Supabase mail service does not permit the owner's address, configure SMTP or an appropriate supported Auth provider.
4. From the deployed card, upload and replace a test photo, refresh, then verify in a separate signed-out browser. Complete this real-account test before considering owner access verified.

## Local checks

Node 22.13+; pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm run check:backend`, `pnpm run build`, `pnpm run check:cocktails`, `pnpm run check:cocktail-import`, and `pnpm run check:orrery` from `website/`.

The shared parser conservatively creates a draft from supported Reddit links or pasted post text. Owner review is required before saving; it does not automatically publish future days.

## Recovery

The original GitHub root index remains in Git history. Switch Pages back to its former branch source to roll back the frontend. Supabase changes are additive and no changes are made to other Supabase projects. Preserve database backups and the photo bucket separately from Git.

## Validation on 2026-11-01

- Production static export and TypeScript pass.
- Archive validation: 144 days, 381 variants, 130 photos; future-year coverage passes.
- Supabase-backed handler tests pass with a deterministic storage/database double, including unverified/nonowner denial, source privacy, parsing/review, upload, duplicate handling, replacements, stale-card rejection and sibling isolation.
- Live API returns the expected archive and rejects unauthenticated mutations/exports. Supabase security advisor returns no findings.
- All 65 original D&D/Games files match the assembled deployment byte-for-byte.
- Browser: cabinet opens/closes, year links open the embedded calendar, the recovered Daiquiri photo loads at 1844px wide with the correct variant, Return to Orrery navigates correctly.
- Browser QA used bundled data because the internal preview origin is intentionally outside the production API CORS allowlist. The browser lacks WebGL, so Orrery animation could not be visually verified.
- Real owner sign-in and authenticated live upload remain unverified pending Auth URL configuration and owner login. No test accounts or test images were added to production.
- GitHub connection is verified. Publication is in progress through its repository tools.
