# PPP001 protected-card release and old-card cleanup

`scripts/build-ppp001-db-release-sql.mjs` creates reviewable SQL **offline**. It does not connect to Supabase, upload to R2, or publish cards. It refuses any pack with open release gates.

```sh
node scripts/build-ppp001-db-release-sql.mjs \
  --pack /absolute/private/ppp001-approved-pack.json \
  --out-dir /absolute/private/ppp001-sql
```

The command uses `docs/releases/ppp001-old-ids.json` and selects its **`oldProtectedCardIds`** for database changes. The separate `oldCardIds` array describes public catalog aliases, including English Readable aliases such as `A1-001`; those aliases are not protected database IDs. Both lists have 67 entries. The 30 SR001 experiment rows are outside this release.

The input pack must include the 64-card checksum-bound Codex AI editorial sign-off and the exact-source Readable human-review waiver explicitly given by the user on 2026-11-15. This is **not** a claim of human listening, native review, or human editorial review. Each of the 14 Readable rows carries the waiver file hash and its own source/translation hashes. The output contains 14 `stage-<language>-<level>.sql` files, `activate-ppp001.sql`, and `rollback-ppp001.sql`. Review and apply each stage batch only after the corresponding private R2 media has been uploaded and checksum-verified. Stage rows are `published=true, catalog_visible=false` so entitled users can test their protected direct links without showing them in the catalog. Each stage transaction refuses preexisting new IDs and a changed old inventory. The activation transaction verifies all new card, content, and media rows, then hides exactly 67 old protected IDs and shows the new IDs. The old rows remain protected and directly playable during the live verification period. The rollback SQL restores the old catalog visibility while those rows still exist.

After publication, verify every new 001 area and level in both languages, audio and image rendering, member entitlements, progress/resume, mobile/desktop layout, and the unchanged SR001 experiment. **Then** perform the separate old-card cleanup requested by the user. Apply and verify `supabase/migrations/202611150001_ppp001_retired_learning_metadata.sql` before cleanup. It keeps only former card ID, language, area, level, title, and retirement time for administrator history; scripts and media are not retained. The administrator dashboard includes these former cards in historical completion counts and labels recent former cards unavailable. Check before/after counts. The cleanup must never delete or rewrite `learning_progress`, `member_learning_state`, or `member_learning_history` merely to remove old content.

The optional cleanup generator requires a dated, private audit record:

```sh
node scripts/build-ppp001-db-release-sql.mjs \
  --pack /absolute/private/ppp001-approved-pack.json \
  --out-dir /absolute/private/ppp001-sql \
  --post-live-audit /absolute/private/ppp001-post-live-audit.json
```

That record must contain `schemaVersion:1`, `release:"PPP001-20261114"`, `verifiedAt`, `liveVerified:true`, `memberLearningRetentionVerified:true`, `dashboardTombstoneMigrationVerified:true`, `r2ReferenceAuditPassed:true`, SHA-256 of newline-joined `oldProtectedCardIds` and new card IDs, the complete `oldR2Keys` inventory, and the reviewed `unsharedOldR2Keys` subset. The generator checks the old/new ID hashes and excludes any key used by new PPP001 media. It then writes `delete-old-001-after-live-verification.sql` and `unshared-old-r2-delete-candidates.json`. The SQL inserts 67 metadata-only history tombstones and deletes exactly those 67 old protected card rows in one transaction (old child content/media rows cascade); R2 candidates require a separate object-store deletion after checking the full application, catalog, and any other references. The old Korean `bootcamp-scenes/ko/class-*.jpg` and `glr-scenes/native-001-*.webp` files have known 002/Japanese 001 references and must be retained. Shared R2 objects remain. The pre-cleanup rollback is no longer available after old rows are deleted; use the database recovery plan if needed.

Record old-ID counts in `learning_progress`, `member_learning_state`, and `member_learning_history` before cleanup. After cleanup, confirm the same member-owned row counts, exactly 67 metadata tombstones, zero old protected `talktag_cards` rows, and matching administrator historical counts. Confirm an old direct link fails to load audio. The generated SQL compares the live old media key inventory with the audit record before deleting; the separate R2 deletion still needs its cross-catalog sharing check.

No cleanup SQL or R2 candidate list is produced from a pre-release pack alone. Generated SQL is never executed by this builder.
