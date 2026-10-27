# Mini Talks migration inventory and release plan

Inventory checked on 2026-10-27 against the local production catalog. This is a production plan, **not** a claim that new Mini Talks audio is recorded or published.

## One track, three language areas

| Course | Learner-facing label | Shared entry and practice | Voice policy |
| --- | --- | --- | --- |
| English | Mini Talks | Sound Check → level picker → episode START → listen, repeat, respond → completed missions | Mostly American English; B2–C2 may include British and Australian voices, with Indian English only occasionally. |
| Korean | Mini Talks | The same sequence and controls, with English-language help where this course already uses it. | Natural Korean voices; follow the Korean-space 50:50 male/female production-batch target. |
| Japanese | Mini Talks | The same sequence and controls, with Korean-language help where this course already uses it. | Natural Japanese voices; do not import the English accent or nationality policy. |

The label is exactly **Mini Talks** in all three courses. Localize descriptions and help text, not the name. Keep the existing TalkTag level cards, START buttons, completion shelf, phone layout, and Bright/Dark styling. The learner must be able to hide or reveal the script and meaning, pause/resume, undo completion, and practise without a separate listening approval gate.

## Existing catalog to retire, not relabel

| Course | Published old essay cards | Other old entries | Migration treatment |
| --- | --- | --- | --- |
| English | `aea-a1-001` through `aea-c2-001` and `aea-a1-002` through `aea-c2-002` (12 published cards across six levels). | No unpublished 002 previews: `audio-essays-002-media.js` supplies published audio for all six. | Keep their identities and completion history separate from the new talk cards; never present their story scripts as dialogue recordings. |
| Korean | `ko-plain-a1-001`, `ko-plain-a2-001`, `ko-plain-b1-001`, `ko-plain-b2-001`, `ko-plain-c1-001`, `ko-plain-c2-001`, `ko-plain-a1-002` | None found. | Preserve old completion keys but do not count them toward Mini Talks. Verify replacement coverage before withdrawing old entries. |
| Japanese | No published `plain` card found. | `J-audio-essays.html` and level placeholders route to the old category. | Replace the doorway and placeholder copy when original Japanese talks are ready; no Japanese essay media need migration. |

New IDs should use `mt-en-<level>-<unit>`, `mt-ko-<level>-<unit>`, and `mt-ja-<level>-<unit>` so old essay progress cannot be mistaken for new talk progress. Compatibility URLs must explain the change or redirect to the corresponding level picker; they must not silently substitute a new conversation for an old essay. Do not delete any old R2 object until a reference audit shows it is unused by the live site.

## First release coverage

Prepare one short original `001` talk per A1, A2, B1, B2, C1, and C2 level in each language before switching that course's active lesson catalog. The category title may change first, as requested, only if every old card is visibly identified as a previous audio essay and the page says new dialogue cards are still being prepared. These are scene briefs, not adapted source scripts:

| Level | Practical scene | Interaction target | Typical cast |
| --- | --- | --- | --- |
| A1 | Find the right place for a simple appointment or class. | Ask where; confirm; thank. | 2 |
| A2 | Change a pickup time or small plan. | Explain the change; choose a workable time. | 2 |
| B1 | Resolve a service mix-up without blaming anyone. | State the problem; clarify; agree on the next step. | 2–3 |
| B2 | Choose between two group plans with limited time or money. | State a preference, acknowledge a constraint, and compromise. | 2–3 |
| C1 | Discuss how a group can include a quieter member. | Compare perspectives and adjust the plan. | 3–4 when useful |
| C2 | Mediate a nuanced disagreement about a shared decision. | Recognize assumptions, reframe, and find a workable conclusion. | 4+ when useful |

Scenes may change to fit real life in each language area. Speaker count is a tendency, never a quota. Do not use one language's script as a literal translation of another: author natural, culturally plausible exchanges and independently check their support-language meanings.

## Release gates

1. Read the approved Drills Framework, assigned reference **Markdown**, and `MINI_TALKS_PRODUCTION_PROTOCOL.md` for each card; record source section and rights status in local authoring notes. For Japanese, identify a suitable Japanese reference before drafting. The [Japan Foundation Irodori overview](https://www.irodori.jpf.go.jp/en/about.html) and the [Council of Europe's CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors) are official starting points, not permission to copy sample dialogues.
2. Approve original scripts, natural support-language meanings, and a genuinely conversational recording with one distinguishable voice per role. Cast character voice and gender from the story, not a per-card quota. A1/A2 are normally two speakers; complexity and group discussion may grow through B and C.
3. Assemble and QC every turn using the verified MiniSkit audio-boundary procedure. Check exact transcript order, −16 LUFS integrated finished-file loudness, true peak no higher than −1 dBTP, gaps, dings, duration, synced scripts, resume, and phone playback. Do not claim a human listening review unless one occurred.
4. Upload versioned audio, download it from each exact public catalog URL, and compare checksum and duration. Switch the active catalog, practice guide, cards, and player as one release per course; the early category title must continue to mark old essays as legacy until then. Rebuild the home-news feed and validate the repository and live pages at 360, 375, 390, and 430 CSS px in Bright and Dark modes.
5. Keep legacy completion recoverable, then remove old catalog/media only after live-reference and rollback checks. Do not show an empty Mini Talks category as if finished, or label an essay as a Mini Talk.
