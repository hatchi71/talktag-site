# TalkTag release conventions

Home bulletin board: exactly three fixed slots. Slot 1 is the current Talk & Tag gathering notice; slots 2 and 3 show the newest two published content groups, newest first. Run `node scripts/update-home-news.mjs` for every content upload/publication, or install `.githooks` with `git config core.hooksPath .githooks`. The pre-commit hook rebuilds the feed automatically. Do not manually edit homepage upload notices. Preserve first-publication dates for QC replacements, translations, splits and styling changes. New catalog modules must be supported by the generator. Never include drafts or unavailable audio.

For every Guided Listen & Repeat upload, replacement or deployment, read and apply `GUIDED_AUDIO_PROTOCOL.md`. Episode recordings over 10 minutes must become independently selectable sentence-boundary parts, with an 11-minute hard maximum per card. Preserve full repetition cycles, English/Korean synchronization and original episode start/ending cues. Run `node scripts/validate-guided-cards.mjs` before publication. Do not apply this splitting rule to other tracks.

Learner-facing pages must retain TalkTag visual consistency and pass mobile 360/375/390/430 CSS px, Bright/Dark and desktop checks. Preserve 44px touch targets, safe areas, no horizontal overflow, and manual completion/undo. Do not publish administrator prototypes or unrelated unfinished work.

Guided L&R ding update, approved 2026-10-09: each independently selectable audio card must contain its own start and ending dings, including split episode parts. This supersedes first-part/last-part-only dings. Preserve full sentence cycles, quality, bilingual synchronization and duration limits.
