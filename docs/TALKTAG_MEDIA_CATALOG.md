# TalkTag production media catalog

The deployed HTML and JavaScript catalog is the authority for which R2 audio is live. Production media URLs use `https://audio.talktag.co.kr/<object-key>`. Keep current release MP3s in R2, their source/QC material in the local authoring folders, and unfinished drafts out of the public catalog. Do not treat an R2 folder name or an old local backup as evidence of publication.

## Cleanup baseline — 2026-10-22

The full `talktag-audio` bucket was listed through a temporary bucket-scoped credential. The deployed catalog files were checked against the production Git revision before deletion. The reviewed cleanup removed 1,190 unreferenced MP3 objects (1,892,990,222 bytes) from 21 superseded release namespaces. A fresh listing contained 1,984 objects / 2,776,391,730 bytes: 1,948 referenced MP3s and 36 zero-byte folder markers. No MP3 remained outside the production catalog. The legacy Vocal Camp pilot had 122 references to files already missing before the cleanup; the obsolete pilot and stage pages now redirect to the current Vocal Camp catalog.

Local generated MiniSkit WAVs/unsplit previews, superseded Korean GLR PCM files, exact duplicate backups, and Vocal Camp 004–005 QC1 takes were removed after their replacements were verified. Keep the `audio/` release and source folders, `_local-audio/` unpublished drafts, and the source/QC assets needed for future editing. Do not bulk-delete either tree.

## Repeatable inventory procedure

1. Update from the deployed Git revision and check the public site is serving that revision. Run `scripts/update-home-news.mjs` during every publication; the pre-commit hook also does this.
2. Export a *complete* R2 `ListObjectsV2` listing to a local, ignored inventory JSON. Each object needs `key`, `bytes`, `etag`, and `modified`; record the bucket, retrieval time, count, and total bytes. Never commit credentials or raw inventories.
3. Run `node scripts/reconcile-r2-audio.mjs --inventory <local-inventory.json> --output <local-plan.json> --revision origin/main`. The script reads the deployed catalog, resolves the JLPT dynamic URL group, and writes a plan only. It fails closed on missing published audio or an unrecognized unreferenced prefix.
4. Review every proposed key and verify a new inventory still has the same key, size, ETag, and modification time. Only then perform a separately authorized deletion. R2 deletion is permanent; the reconciliation script intentionally cannot delete objects.
5. List R2 again and require zero deletion candidates. Check representative public URLs and media length/size, then test the affected pages on phone-width and desktop views. Preserve local drafts and authoring sources even when they are not referenced by the public catalog.

The current exact post-cleanup inventory is local-only at `_local-audio/r2-after-2026-10-22.json`. It is an audit snapshot, not a production dependency.
