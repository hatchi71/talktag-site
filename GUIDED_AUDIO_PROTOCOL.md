# Guided Listen & Repeat: mandatory audio-card protocol

Approved 2026-10-09. Applies to every current and future Guided L&R upload, including QC replacements. Does not apply to Vocal Camp, Audio Essays & Articles, or other independent tracks.

- Episodes exceeding 10 minutes must be split into separately selectable, manually completable cards.
- Aim for approximately 9–10 minutes; natural sentence boundaries may extend a card to 11 minutes maximum. Shorter cards are preferable to cutting a repetition cycle or padding with silence.
- Keep all repetitions of a sentence together in one card: A1/A2 10 repetitions; B1–C2 15 repetitions. Preserve the existing 2.5-times voice-duration response gap.
- Partition in original sentence order. Every sentence and repetition must occur exactly once across the cards, with no omissions or duplicate material.
- Preserve audio quality. Use frame-preserving MP3 cuts when safe; never re-encode merely to shrink files.
- Preserve the original episode's start sound only in its first card and ending sound only in its last card. Do not add extra dings at internal boundaries.
- Number cards as episode–part (01–01, 01–02…). Display the original title, part/total, sentence range, and actual file duration.
- Give each part its own stable identifier, audio URL, manual completion state and resume position. Retain original episode ID for its first card so existing links work. Migrate legacy completion and resume state once without marking new learning automatically complete.
- Slice English and Korean script arrays to the same sentence range. Rebase cue start/end/voice-end times to the new audio file, and sentence indices to zero. Preserve repetition numbers.
- New uploads and replacement audio must run the duration/cue validator before publication. No active card may exceed 660 seconds; all cues and translations must match.
- Verify actual R2 streaming, first/last playback, script synchronization, per-card completion/undo and previous/next navigation. Test 360/375/390/430 CSS px, Bright/Dark, increased text size and desktop.
- Do not publish administrator prototypes or unrelated local changes. Retain old R2 objects until replacements are live and verified; deletion requires scoped authorization.

Validation: run `node scripts/validate-guided-cards.mjs` against the release directory. When adding an episode, generate its sentence-boundary parts and append them to `guided-card-parts.js` before running validation.
