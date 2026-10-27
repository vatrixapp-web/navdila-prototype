# Navdila prototype

A responsive, interactive static prototype for the Navdila connected healthcare ecosystem. It includes overview, platform, pricing, growth, and a live revenue simulator. It runs without a build step or third-party dependencies.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Publish with GitHub Pages

The included GitHub Actions workflow publishes the site from the repository root:

1. Push the project to GitHub.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. The workflow deploys on pushes to `main`. Share the Pages URL shown in the repository's Pages settings.

The Share button uses the device's native share sheet where available, otherwise it copies the current URL. The URL becomes shareable once the site is published.

## AXAIUS standalone page

The AXAIUS brand engine and interactive checklist is kept separate from the Navdila prototype in `axaius/index.html`. After the next deployment to GitHub Pages, share it directly at:

https://vatrixapp-web.github.io/navdila-prototype/axaius/

### Enable shared checklist progress

The AXAIUS checklist uses Supabase so changes sync between visitors. Before enabling it:

1. Create a Supabase project and run [`axaius/supabase.sql`](./axaius/supabase.sql) in its SQL Editor.
2. Copy the project URL and its **publishable** (or legacy `anon`) key into `AXAIUS_SUPABASE_URL` and `AXAIUS_SUPABASE_ANON_KEY` in [`axaius/config.js`](./axaius/config.js).
3. Commit and push the changes to `main`; GitHub Pages will deploy the shared checklist.

The configured page allows anyone with the link to view and edit checklist progress. Only use the publishable/anon key in `config.js`—never put a Supabase `service_role` or secret key in this public site. Until configured, checklist editing remains disabled so ticks cannot appear to save without syncing.
