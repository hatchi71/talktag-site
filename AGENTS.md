# TalkTag release conventions

For every Guided Listen & Repeat upload, replacement or deployment, read and apply `GUIDED_AUDIO_PROTOCOL.md`. Episode recordings over 10 minutes must become independently selectable sentence-boundary parts, with an 11-minute hard maximum per card. Preserve full repetition cycles, English/Korean synchronization and original episode start/ending cues. Run `node scripts/validate-guided-cards.mjs` before publication. Do not apply this splitting rule to other tracks.

Learner-facing pages must retain TalkTag visual consistency and pass mobile 360/375/390/430 CSS px, Bright/Dark and desktop checks. Preserve 44px touch targets, safe areas, no horizontal overflow, and manual completion/undo. Do not publish administrator prototypes or unrelated unfinished work.
