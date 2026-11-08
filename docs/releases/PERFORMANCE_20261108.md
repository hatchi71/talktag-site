# Lighter TalkTag release · 2026-11-08

User requested image optimization, landing-image removal, and consolidated background account checks. Removed the main hero illustrations from English, Korean, and Japanese landings, retaining text, category links and Picture Talk placement. Japanese image-based heading is now semantic Korean text with the same wording.

185 PNG/JPEG assets reduced from 151,802,010 bytes (approximately 151.8 MB) to approximately 32.8 MB. Detailed actual before/after sizes are recorded in image-optimization-20261108.json. Existing URLs and alpha support retained; logo capped at 192 px, Picture Talk 001–010 at 768 px, other artwork at 1100 px. Smaller originals not enlarged or needlessly recompressed. Picture Talk 001–010 reduced from approximately 26 MB to 2.1 MB. Logo is approximately 3.9 KB.

Background checks: share in-flight device authorization calls, use one watcher per shared client with independent removal callbacks, and coalesce simultaneous full access refreshes instead of appending an unbounded promise queue. Membership/role/completion queries run concurrently after the mandatory active-device check. Account header reuses the page's Supabase client. No positive authorization TTL/cache introduced; every later request checks again. Private media/content server rules unchanged. Sign-out still immediately locks the UI.

Validation: 74 tests, including simultaneous request sharing, fresh recheck after previous approval, rejection retry, and existing device replacement checks. All nine built browser bundles verified against source. Live hero removal and mobile overflow checked for all three landings. New Picture Talk 011–100 is a separate local review batch, not part of this deployment.

Authentication changes explicitly invalidate in-flight work. Late responses from an earlier sign-in cannot repaint the access UI; completion hydration also verifies the current account before applying records.
