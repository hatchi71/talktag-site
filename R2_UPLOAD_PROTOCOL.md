# TalkTag R2 publication protocol

Use this for finished audio releases when Cloudflare's browser upload fails or when publishing many objects. The 2026-10-24 Korean GLR A1 004–010 release succeeded through R2's S3-compatible API after the browser uploader repeatedly rejected MP3 files.

1. Confirm the exact release inventory from local QC: source file, R2 object key, public URL, byte count and SHA-256 for each file. Do not upload drafts or unrelated backups. Validate dings, timing, cue alignment and actual decoded duration before upload.
2. With the user's authorization, create a short-lived **User API token** limited to `Object Read & Write` on the `talktag-audio` bucket only. Use the account's R2 S3 endpoint. Never put token values in source files, shell history, commits, tool output or the final report. Avoid account-wide tokens.
3. Use an S3-compatible client (AWS SDK for JavaScript v3 works) with that endpoint and `region: auto`. Upload only the inventory keys, with `Content-Type: audio/mpeg`. Compare each local SHA-256 to the inventory before upload. Read each object back from R2 and verify its SHA-256. Then fetch each public audio URL and verify the same SHA-256. A successful `PutObject` alone is not publication proof.
4. Add only verified media URLs to the learner catalog; run the relevant audio, navigation, scene-art, mobile and repository checks. Generate `home-news-feed.json` using `scripts/update-home-news.mjs`; do not hand-edit its latest cards. Publish the exact site changes and verify the live catalog and real audio playback.
5. Revoke the temporary token immediately after live verification, clear temporary credential environment variables and check the token is absent from the R2 token list. Keep no persistent bucket write credential on the Mac.

If the public hash or playback check fails, stop before exposing the card. Do not repeat browser uploads or spend TTS credits to work around an R2 transport failure. Record the precise failed key and stage, then retry only that stage with the same QC-approved file.
