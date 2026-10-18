# Cloudflare upload sign-in protocol

Wrangler's browser authorization uses a temporary listener at `localhost:8976`. Stock Wrangler 4.92.0 closes it after **120 seconds**. A Cloudflare approval page can still redirect after that point, but the browser will show `ERR_CONNECTION_REFUSED` and Wrangler will not receive the authorization. This is a failed sign-in, not evidence of an uploaded file. The Mac's current local Wrangler installation has a **10-minute** login timeout adjustment for Cloudflare's repeated sign-in challenge; reinstalling or updating Wrangler may remove it, so verify the listener window before use.

For every TalkTag media upload:

1. Finish local production, inventory, audio QC, and dry-run validation **before** starting sign-in. Check whether `wrangler whoami` already has a valid session; if so, do not open a new OAuth tab.
2. If sign-in is necessary, ask the account owner to be ready at the browser. Start a **fresh** `wrangler login` process only then, keep that process running, and confirm port 8976 is listening before presenting its newly generated authorization link. Never reuse a prior OAuth URL or callback tab.
3. Have the account owner approve while the listener is active (two minutes with stock Wrangler 4.92.0; ten minutes with the current local adjustment). If the listener exits or the window expires, discard that authorization link and restart the login process before asking them to approve. Do not ask them to reload the failed callback page.
4. Wait for Wrangler's success result and run `wrangler whoami` again. If either check fails, do not upload or publish. Do not interpret the browser's Cloudflare approval alone as a successful CLI sign-in.
5. Run only the scoped, resumable uploader. Verify each public object's bytes or hash and all expected object counts before updating the site. Run `scripts/update-home-news.mjs`, repository validations, and publish only after media verification. Keep the administrator prototype and unrelated changes out of deployment.

The callback URL contains a one-time authorization code. Do not paste it into chat, logs, or files. Prefer an appropriately scoped, durable Cloudflare credential only if the owner separately chooses to configure one; never create or store one implicitly.
