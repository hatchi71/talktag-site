# Guided Listen & Repeat: mandatory audio-card protocol

Approved 2026-10-09. Applies to every current and future Guided L&R upload, including QC replacements. Does not apply to Vocal Camp, Audio Essays & Articles, or other independent tracks.

- Episodes exceeding 10 minutes must be split into separately selectable, manually completable cards.
- Aim for approximately 9–10 minutes; natural sentence boundaries may extend a card to 11 minutes maximum. Shorter cards are preferable to cutting a repetition cycle or padding with silence.
- Keep all repetitions of a sentence together in one card: A1/A2 10 repetitions; B1/B2 15 repetitions; C1/C2 21 repetitions (updated 2026-10-10). Preserve the existing 2.5-times voice-duration response gap.
- Partition in original sentence order. Every sentence and repetition must occur exactly once across the cards, with no omissions or duplicate material.
- Preserve audio quality. Use frame-preserving MP3 cuts when safe; never re-encode merely to shrink files.
- Updated 2026-10-09: every independently selectable card, including split parts, must have its own starting and ending dings. Never duplicate an existing boundary ding. Include both dings in actual card duration and rebase synchronized cues when prepending sound. This supersedes the original first-part/last-part-only rule.
- Number cards as episode–part (01–01, 01–02…). Display the original title, part/total, sentence range, and actual file duration.
- Give each part its own stable identifier, audio URL, completion state and resume position. Retain original episode ID for its first card so existing links work. Migrate legacy completion and resume state once without marking new learning automatically complete. Updated 2026-10-09: finishing a Guided L&R card automatically marks it complete in its own completed-missions shelf; retain manual completion and undo. Do not redirect away from the player or apply this behavior to other tracks.
- Slice English and Korean script arrays to the same sentence range. Rebase cue start/end/voice-end times to the new audio file, and sentence indices to zero. Preserve repetition numbers.
- New uploads and replacement audio must run the duration/cue validator before publication. No active card may exceed 660 seconds; all cues and translations must match.
- Verify actual R2 streaming, first/last playback, script synchronization, per-card completion/undo and previous/next navigation. Test 360/375/390/430 CSS px, Bright/Dark, increased text size and desktop.
- Do not publish administrator prototypes or unrelated local changes. Retain old R2 objects until replacements are live and verified; deletion requires scoped authorization.

Validation: run `node scripts/validate-guided-cards.mjs` against the release directory. When adding an episode, generate its sentence-boundary parts and append them to `guided-card-parts.js` before running validation.

V2 new-production rule (2026-10-09): new cards target 8:00-9:30 with a hard maximum of 600 seconds including cues. Shorter coherent recordings are welcome; do not add filler or slow speech to force the target. Existing legacy cards retain their previously approved <=660-second tolerance. New records carry `protocolVersion: 2`; validate actual MP3 duration <=600 as well as metadata/cues. Single-card additions may be loaded as their own content module before the parts module; include that module in the validator. Production handoff is scripts -> TTS -> operator-approved QC -> agent assembly, R2 upload and publication.

C-level override (2026-10-10): C1/C2 now use 21 repetitions. Prefer finished cards below 15 minutes including 2.5x gaps and both dings; shorter coherent cards are welcome. This supersedes the 10/11-minute limit for C levels only. Existing longer C-level cards may remain. Newly assembled C-level cards carry `protocolVersion: 3` and are validated against the 900-second preferred production ceiling; if a natural full cycle cannot fit, resolve the exception before publication rather than cutting speech or repetitions. Repetition-only changes preserve completion; rebase saved positions to the corresponding sentence/repetition or reset positions safely, not to a different sentence. A/B rules remain unchanged.
