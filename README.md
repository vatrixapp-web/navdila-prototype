# Navdila & AXAIUS private prototypes

Responsive, interactive prototypes for the Navdila connected healthcare ecosystem and AXAIUS brand system.

## Protected deployment

Both pages are served by the Cloudflare Worker defined in [`worker.js`](./worker.js). The Worker checks a Supabase Auth session before serving either page or allowing checklist API access. Unauthenticated visitors are redirected to the sign-in page.

The Worker uses the existing Supabase project for sign-in and shared checklist data. It accepts email/password accounts only; there is no public sign-up form. In Supabase Authentication settings, turn off **Allow new users to sign up**, then invite the intended users.

Configure these GitHub repository settings before deploying:

1. Add the Cloudflare account ID as the `CLOUDFLARE_ACCOUNT_ID` Actions variable.
2. Add a Cloudflare API token with permission to deploy Workers as the `CLOUDFLARE_API_TOKEN` Actions secret.
3. Run [`axaius/supabase.sql`](./axaius/supabase.sql) in the Supabase SQL Editor to remove anonymous checklist access and grant it to signed-in users only.
4. Run the **Deploy private site to Cloudflare Workers** workflow from the GitHub Actions tab.

The GitHub repository is private and its old public Pages site has been disabled. After deployment, the Worker URL shown in the workflow output is the protected base link. Share that base URL for Navdila and append `/axaius/` for the AXAIUS checklist. Both pages require a Supabase account.

## AXAIUS standalone page

The AXAIUS brand engine and interactive checklist remains separate from the Navdila prototype in `axaius/index.html`.

## Local preview

Open `index.html` or `axaius/index.html` directly for a visual preview. Authenticated checklist syncing is available only through the protected Worker deployment.
