# PPP 001 replacement: learning-record migration design

Status: release design. Member learning records must survive the replacement; old 001 cards and unshared old media are removed only after the new 001 release is live and verified.

## Verified public baseline

The fetched live `catalog-metadata.js` matched this worktree byte for byte (SHA-256 `3407838f062c4a786468f40f79fd2246a962da4793beebc95f991a77229d9c59`). For English and Korean episode 001 it contains **30 Sound Check selectable entries** (13 English, 17 Korean, including split Guided L&R parts), **13 Readable entries** (6 English, 7 Korean), and **four Boot Camp families** (English/Korean Vocal Camp and Story Camp, each listing A1–C2). These are public catalog counts, not a claim that every corresponding protected database row has been inspected. Japanese 001 content is outside this replacement and must remain unchanged.

## Why an in-place rewrite would corrupt learning records

The current player and catalog use `card_id` as the `learning_progress.lesson_id`. Guided resume and completion state also use keys containing `card_id` in `member_learning_state`. `member_learning_history` stores one title and last-opened timestamp per user and `card_id`, and opening a card overwrites that title. A rewritten PPP 001 under an old ID would therefore appear already completed, could resume in the wrong audio, and could relabel the old history entry with the new title. This risk applies to each selectable split part independently.

## Recommended identity model

1. Give every materially new PPP 001 card a **new unique card ID**, while displaying episode `001` through its catalog ordinal/family number. Final IDs are set after the complete script and part inventory; a new part need not map one-to-one to an old part.
2. Keep old 001 rows and media during staging and verification, with old IDs hidden from the active catalog once new cards launch. This is a temporary rollback state, not a permanent playable archive.
3. Add `catalog_visible boolean not null default true` to `talktag_cards`, and filter `list_talktag_cards` on `catalog_visible` during the coordinated release. The existing database uniqueness rule permits old and new cards to share language, area, level, and ordinal when IDs differ.
4. Replace old 001 public metadata entries with new IDs and artwork only when protected content and media are ready. Do not migrate old completion rows to new IDs or automatically mark new cards complete.
5. After the new cards pass live verification, delete the old 001 protected card rows and their dependent protected content/media rows. Remove only old R2 objects proven unshared by a complete reference audit. Old direct links must then cease playback. Preserve member-owned `learning_progress`, `member_learning_state`, and `member_learning_history` rows unless the user separately asks to erase them.

This requires no generic player completion-key change and no bulk rewrite of member-owned data. The member tables store text lesson IDs rather than foreign keys to `talktag_cards` in the checked schema; recheck the live schema before deletion. The current administrator summary RPC joins member records to `talktag_cards`, so deleting old rows could hide historical counts or entries even though the records survive. Update and verify that dashboard query before cleanup. A retired history entry may remain visible as a learning record, but its old playback link must be removed or labeled unavailable.

## Staging and release order

1. Export a read-only ID/part map from the **protected** catalog and compare it with the public baseline. Record each old `card_id`, language, area, level, ordinal, title, script revision, media variant/key/checksum, and current publication status. The four Boot Camp family summaries must be expanded into their level-specific protected card IDs before migration.
2. Apply the reviewed catalog-visibility migration with all existing rows visible by default. Add a focused database test: a published archived card is absent from `list_talktag_cards`, but its content/media resolvers still enforce the normal entitlement and serve it to an entitled member.
3. Stage new PPP 001 rows under distinct IDs, initially `published=true, catalog_visible=false` for authorized direct-link QC. Use immutable new R2 keys. Check every new card's script, translation, image, audio, duration/cues, access, completion/undo, and resume behavior.
4. Prepare the matching static catalog/artwork build. During one coordinated release, change visibility of the old/new protected rows in one database transaction and deploy the reviewed site build. Preserve the original publication ordering for replacement notices.
5. Verify the active 001 catalog in English and Korean, all five supported areas and levels, new playback, protected access, completion shelves, member-owned history/progress, and mobile/desktop presentation. Before old-row deletion, a failed release check can restore the prior static build and visibility flags while both sets of media remain intact.
6. Once verification passes, audit all old 001 media references across protected rows, public metadata, other episodes, and known variant keys. Verify the administrator summary still displays historical member activity after old card removal. Delete old protected card rows, then delete only R2 objects with no surviving references. Recheck that old direct links cannot play and that old member progress/history rows remain intact and remain visible as records. Record the deleted IDs, media keys, and audit evidence; never infer an object is unshared from its filename alone.

## Acceptance gates

- A member's old 001 completion, resume, and history data remain attached to the old lesson ID as retained records; old audio no longer opens after retirement.
- The new 001 card starts incomplete and at the beginning, even for a member who completed its predecessor.
- New and old split parts have independent progress; no old part silently completes a new part.
- The active catalog shows one current 001 family per supported language/area/level without duplicate old entries.
- Before retirement, old cards remain protected by normal entitlement; after retirement, old direct links cease playback. No R2 object is deleted while any surviving card references it.
- Japanese 001 cards and unrelated progress are unchanged.

Final new IDs and SQL data updates remain dependent on the complete PPP 001 content, protected-catalog inventory, and live reference audit.
