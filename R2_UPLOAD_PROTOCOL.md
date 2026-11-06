# TalkTag R2 publication protocol

Use this for finished audio releases when Cloudflare's browser upload fails or when publishing many objects. The 2026-10-24 Korean GLR A1 004–010 release succeeded through R2's S3-compatible API after the browser uploader repeatedly rejected MP3 files.

1. Confirm the exact release inventory from local QC: source file, R2 object key, public URL, byte count and SHA-256 for each file. Do not upload drafts or unrelated backups. Validate dings, timing, cue alignment and actual decoded duration before upload.
2. With the user's authorization, create a short-lived **User API token** limited to `Object Read & Write` on the `talktag-audio` bucket only. Use the account's R2 S3 endpoint. Never put token values in source files, shell history, commits, tool output or the final report. Avoid account-wide tokens.
3. Use an S3-compatible client (AWS SDK for JavaScript v3 works) with that endpoint and `region: auto`. Upload only the inventory keys, with `Content-Type: audio/mpeg`. Compare each local SHA-256 to the inventory before upload. Read each object back from R2 and verify its SHA-256. Then fetch each public audio URL and verify the same SHA-256. A successful `PutObject` alone is not publication proof.
4. Add only verified media URLs to the learner catalog; run the relevant audio, navigation, scene-art, mobile and repository checks. Generate `home-news-feed.json` using `scripts/update-home-news.mjs`; do not hand-edit its latest cards. Publish the exact site changes and verify the live catalog and real audio playback.
5. Revoke the temporary token immediately after live verification, clear temporary credential environment variables and check the token is absent from the R2 token list. Keep no persistent bucket write credential on the Mac.

If the public hash or playback check fails, stop before exposing the card. Do not repeat browser uploads or spend TTS credits to work around an R2 transport failure. Record the precise failed key and stage, then retry only that stage with the same QC-approved file.


## Authorization-resilient production prompt · approved 2026-11-06

Use this prompt for future TalkTag audio releases:

> Follow the exact QC-approved inventory and current publication gate. First inspect whether the existing authorized R2 connection is valid, has the required bucket scope and action, and has sufficient remaining lifetime. Reuse it only within that authorization. Prefer the S3-compatible API for bulk objects; use an already-open, signed-in dashboard when appropriate. If the uploader fails once, diagnose the transport error and use the authorized API path rather than repeating the browser picker. On 401/403 or expired credentials, stop writes and refresh the same authorized connection, or obtain a short-lived credential restricted to the exact destination bucket when required. Never bypass authentication, consent, scope, expiry, or product approval requirements; never use browser cookies as API credentials or a global key as a shortcut. Do not print secrets or commit them. Current protected lesson audio belongs in `talktag-private-audio-preview`; use `talktag-audio` only when the release explicitly still targets legacy public media. Never make a private bucket public merely to simplify upload. Upload immutable revision keys, compare local and read-back SHA-256, verify protected playback with an authorized account, update only verified records, and check an unauthorized account is still blocked. Retry only the failed stage; do not regenerate approved speech for a transport problem. Revoke task-specific temporary credentials after release verification and remove temporary secret material. Report exact blocked steps honestly.

**Human-review hold:** When EJ asks for human audio review, finish local drafts and technical QC first, present the local review page, and stop. Do not upload audio, activate catalog/registry entries, publish a content notice, or expose draft media until the specific batch is approved. R2 credentials are not needed for local audio production or human review.

For private media, the public hash check in steps 3–4 means the authorized protected-delivery response, not an unauthenticated public object URL. Preserve authorization; never expose private audio for checksum convenience.
