# Audio Essays & Articles production protocol

Historical maintenance only. Mini Talks supersedes this category for **new** Sound Check production in English, Korean, and Japanese; follow `MINI_TALKS_PRODUCTION_PROTOCOL.md`. Keep this document for QC or emergency repair of still-published legacy essay audio until those cards are safely retired. Do not use it to author new essay cards or relabel existing essays as Mini Talks.

## 5. Opening and closing dings

Every independently playable Essays & Articles audio card must have one TalkTag opening ding before the narration and one closing ding after it. Apply this to English and Korean cards, including existing cards when their audio is next replaced, and to any future language catalog. Reuse the approved TalkTag `Start.mp3` and `Ending.mp3` cues; do not generate new sounds or add a ding between paragraphs, sentences, or playback pauses.

Before release, check whether either cue is already embedded in the source so it is not doubled. Preserve the complete narration, natural speed, and level-specific text. Measure the final encoded duration including both dings, verify both are audible and not clipped, and update duration labels, synchronized timestamps, and saved-position migration if the timeline changes. Keep the card ID and completion state stable. Publish a versioned audio URL only after the new file has passed QC and remote byte/hash verification; do not replace the original R2 object in place.

This boundary-cue requirement does not add Guided L&R repetition, sentence gaps, or a pause-control bar to Essays & Articles.
