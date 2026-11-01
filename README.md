# Josh Pila's website

The Orrery is the front page at https://www.joshpila.com. Cooking & Cocktails opens the illustrated cabinet and Advent archive. The existing D&D and Games pages remain in `dnd/` and `games/`.

## Editing and publishing

- Orrery, cabinet, and cocktail front end: [`website/`](website/).
- Cabinet artwork: `website/public/cabinet-r3/`.
- Archived cocktail photographs: `website/public/cocktails/photos/<year>/`.
- New photographs and recipe days: use the owner controls inside the live cocktail archive. These persist in Supabase and do not require a GitHub commit.
- D&D and Games: edit the existing root folders as before.

The GitHub Actions workflow builds and publishes changes to `main`. The root `index.html` is retained only as a legacy rollback source; the deployed front page is generated from `website/app/page.tsx`.

See [deployment and recovery notes](website/DEPLOYMENT.md) for local checks, backend configuration, and owner sign-in.
