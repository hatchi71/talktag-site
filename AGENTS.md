# TalkTag release conventions

Learner-facing language convention: English and Japanese courses serve Korean-speaking learners, so Spaces destination labels and Japanese lesson titles use Korean. Korean courses serve English-speaking learners, so guidance and Spaces destination labels remain English. Preserve the language selector labels ENGLISH / KOREAN / 日本語. Do not globally translate all three audiences' interfaces into Korean.

Home bulletin board: exactly three fixed slots. Slot 1 is the current Talk & Tag gathering notice; slots 2 and 3 show the newest two published content groups, newest first. Run `node scripts/update-home-news.mjs` for every content upload/publication, or install `.githooks` with `git config core.hooksPath .githooks`. The pre-commit hook rebuilds the feed automatically. Do not manually edit homepage upload notices. Preserve first-publication dates for QC replacements, translations, splits and styling changes. New catalog modules must be supported by the generator. Never include drafts or unavailable audio.

For R2 uploads, read `R2_UPLOAD_PROTOCOL.md`. If the browser uploader fails, use a user-authorized, short-lived bucket-scoped S3 token and verify local, R2 and public SHA-256 before exposing media. Revoke the token after live checks; never store bucket write credentials in the repository.

For every Guided Listen & Repeat upload, replacement or deployment, read and apply `GUIDED_AUDIO_PROTOCOL.md`. Episode recordings over 10 minutes must become independently selectable sentence-boundary parts, with an 11-minute hard maximum per card. Preserve full repetition cycles, English/Korean synchronization and original episode start/ending cues. Run `node scripts/validate-guided-cards.mjs` before publication. Do not apply this splitting rule to other tracks.

Before drafting any new Guided L&R script, locate and read the assigned source in the local `0. Reference Materials` folder. Use the assigned material as level/topic guidance, not as copy: write original dialogue and independently written Korean support. If no material is assigned or the relevant section cannot be identified, pause script drafting and ask which reference to use.

Apply level-specific content: A1/A2 focus on basic expressions and vocabulary from the assigned references; B1/B2 use practical situations and increasingly complex, well-structured sentences; C1/C2 use natural real-life American or British English, including practical phrasal verbs and intellectually engaging language without sounding artificial. Match the chosen speaker accent to the script.

Learner-facing pages must retain TalkTag visual consistency and pass mobile 360/375/390/430 CSS px, Bright/Dark and desktop checks. Preserve 44px touch targets, safe areas, no horizontal overflow, and manual completion/undo. Do not publish administrator prototypes or unrelated unfinished work.

Guided L&R ding update, approved 2026-10-09: each independently selectable audio card must contain its own start and ending dings, including split episode parts. This supersedes first-part/last-part-only dings. Preserve full sentence cycles, quality, bilingual synchronization and duration limits.

GLR update approved 2026-10-10: A1/A2 10 repetitions, B1/B2 15, C1/C2 21. New C1/C2 finished cards prefer under 15 minutes; existing longer C cards are exempt from the old 10/11-minute cap. A/B duration rules remain unchanged. Preserve scripts, dings and completed states when increasing only repetition counts; use revision-specific resume positions when audio timing changes.
