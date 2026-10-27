# Navdila & AXAIUS prototypes

Responsive, interactive prototypes for the Navdila connected healthcare ecosystem and AXAIUS brand system.

## Public pages

The repository is public so GitHub Pages can deploy the pages without Cloudflare. Anyone can view both pages and update shared AXAIUS checklist progress. Do not store sensitive information in the checklist.

The pages deploy automatically when changes are pushed to `main`:

- Navdila: https://vatrixapp-web.github.io/navdila-prototype/
- AXAIUS: https://vatrixapp-web.github.io/navdila-prototype/axaius/

The workflow publishes only the two HTML pages and the AXAIUS public Supabase client configuration.

## Supabase checklist access

Run [`axaius/supabase.sql`](./axaius/supabase.sql) in the Supabase SQL Editor to allow public checklist reads and edits. The publishable key in [`axaius/config.js`](./axaius/config.js) is intended for browser use; access is controlled by the table's row-level security policies.

## Later: private Cloudflare deployment

The Worker in [`worker.js`](./worker.js) can require Supabase sign-in. When ready to make the pages private, make the repository private, run [`axaius/supabase-private.sql`](./axaius/supabase-private.sql) to remove anonymous checklist access, change `REQUIRE_AUTH` to `"true"` in [`wrangler.jsonc`](./wrangler.jsonc), and deploy the Worker through Cloudflare. A Cloudflare API token and account ID will be required; configure a custom domain on the Worker when the domain is purchased.

## Local preview

Open `index.html` or `axaius/index.html` directly for a visual preview.
