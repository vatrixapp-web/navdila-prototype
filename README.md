# Navdila & AXAIUS prototypes

Responsive, interactive prototypes for the Navdila connected healthcare ecosystem and AXAIUS brand system.

## Public pages for now

The repository stays private. GitHub Pages cannot publish this private repository on its current plan, so the public pages use a Cloudflare Worker with no visitor sign-in. Anyone with the links can view the pages and update shared AXAIUS checklist progress. Do not store sensitive information in the checklist.

Configure these GitHub Actions values before deploying:

1. Add your Cloudflare account ID as the `CLOUDFLARE_ACCOUNT_ID` Actions variable.
2. Add a Cloudflare API token with the **Edit Cloudflare Workers** permission as the `CLOUDFLARE_API_TOKEN` Actions secret.
3. Run the **Deploy public prototypes to Cloudflare Workers** workflow from the GitHub Actions tab.

The workflow output provides the temporary `workers.dev` base link. Share that base URL for Navdila and append `/axaius/` for the AXAIUS checklist. Both pages are public without sign-in.

## Supabase checklist access

Run [`axaius/supabase.sql`](./axaius/supabase.sql) in the Supabase SQL Editor to allow public checklist reads and edits. The publishable key in [`axaius/config.js`](./axaius/config.js) is intended for browser use; access is controlled by the table's row-level security policies.

## Later: private Cloudflare deployment

The Worker in [`worker.js`](./worker.js) can require Supabase sign-in. When ready to make the pages private, run [`axaius/supabase-private.sql`](./axaius/supabase-private.sql) first to remove anonymous checklist access, change `REQUIRE_AUTH` to `"true"` in [`wrangler.jsonc`](./wrangler.jsonc), and run the Cloudflare deployment workflow. Configure a custom domain on the Worker when the domain is purchased.

## Local preview

Open `index.html` or `axaius/index.html` directly for a visual preview.
