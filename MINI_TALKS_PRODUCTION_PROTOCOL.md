# TalkTag Mini Talks production protocol

Approved product direction: 2026-10-27. This protocol supersedes the Audio Essays & Articles learning purpose for new Sound Check production in English, Korean, and Japanese. It does not authorize relabelling old essay recordings as dialogues or publishing draft media.

## Purpose and learner action

Mini Talks are short, original, practical spoken scenes. A learner first understands who is doing what in a place, then hears one natural exchange. The learner may shadow or replay it by choice, jot down key details, summarize, and retell it in their own words. Keep the scene concrete and useful in everyday life. Do not embed forced repetitions of turns in the audio.

The same track label, level-first card layout, START action, script/meaning controls, completion shelf, and practice flow apply in all three language areas. The learner-facing track name is **Mini Talks** in English, Korean, and Japanese; explanatory text and controls may follow each course's existing interface language. Existing `type=plain` URLs may remain as compatibility routes, but they must not silently present old essays as Mini Talks.

## Level progression

| Level | Typical scene and language | Typical cast |
| --- | --- | --- |
| A1 | One immediate need; predictable question and answer; short, concrete turns. | Usually two |
| A2 | Routine change, choice, or simple reason; a short follow-up or repair. | Usually two |
| B1 | Explain a small problem, response, and next step with connected everyday language. | Two or three |
| B2 | Compare options, qualify a preference, or negotiate tactfully. | Two or three |
| C1 | Multiple perspectives on one practical topic; implication and natural register shifts. | Three or more when useful |
| C2 | Subtle stance, disagreement, or mediation in one coherent conversation. | Four or more when useful |

These are casting tendencies, not quotas. A natural two-person C-level conversation is preferable to adding empty voices; a third A-level voice is fine when the situation genuinely calls for it. Increase conversational and linguistic complexity with level, not merely duration or speaker count. Keep each underlying scene brief even if repeated practice makes its finished audio longer.

## English voices and accents

Use natural American English as the default for English A1–B1 and the majority of the English catalog. From B2–C2, British and Australian voices may enter when the character and wording fit; Indian English is occasional, never a novelty accent. Choose each character's voice and gender from the script's actual roles and situation, not a preset male/female quota for an individual English card. Record the actual voice, accent, nationality when relevant to the scene, and accent-matched wording in the authoring record. Nationality is not an accent label. Do not force this English casting pattern onto Korean or Japanese Mini Talks; use natural voices for those target languages. Follow the Korean-space speaker-balance policy for Korean audio without adding an implausible character to a scene.

## Script brief and source use

Before authoring, read `TALKTAG_DRILLS_FRAMEWORK.md`, the assigned local Markdown reference and its relevant section, and this protocol. English and Korean reference PDFs remain private archives; use their verified Markdown companions only. The Japanese source must likewise be identified and rights-checked before production. Record: drill, target level, physical situation, learner input, expected spoken output, relationship, roles, speaker/voice/variety, exact reference section, rights status, and the model-hidden variation prompt. Write original dialogue and independently authored support-language meanings; never adapt reference dialogue or plot.

Each turn should be one naturally speakable unit. Preserve conversational contractions, interruptions, repairs, and response timing where level-appropriate. Avoid monologues disguised as conversations, test-style speeches, implausible agreement, and vocabulary chosen only to sound advanced. Treat medical, legal, financial, and changing public facts as questions a character can ask unless independently verified.

## Audio and interaction

- Give each turn a stable line ID, speaker ID, target-language text, and aligned meaning. One voice must not impersonate multiple speakers when the card claims a multi-person cast.
- Record clean source takes with the approved voices and natural delivery. If assembling separate turns, follow `MINISKIT_AUDIO_PROTOCOL.md`: word-level alignment, verified silence-window cuts, no clipped or duplicated words, and exact-match transcript checks.
- Default card audio in all three languages: one complete short exchange, with natural spacing between turns and one start/end cue. No automatic turn repetitions, speaking-gap loops, second full run-through, or forced variation prompt. Learners can replay or shadow voluntarily. The practice guide follows the former Audio Essays & Articles direction: shadowing, jotting down, summarizing and retelling; AI discussion remains visibly coming soon.
- The finished card has start and end cues, turn-accurate progress, pause/resume, and completion/undo. Preserve optional target script and translated meaning. An authored variation prompt may remain in production notes but is not a required player step.
- Technical QC must measure audio duration and loudness, verify the scripted turn order and cue/gap timestamps, compare transcripts with every spoken line, and exercise playback and resume on a phone-sized view. Apply the shared **−16 LUFS integrated finished-file target**, with true peak no higher than −1 dBTP; measure the encoded output rather than adding a fixed gain. Record measured integrated loudness, true peak, and any dialogue-to-cue level imbalance. Human listening is optional; never claim it occurred if it did not. Resolve uncertain pronunciation or edit boundaries before release.
- Version media by content hash. Publish catalog and R2 audio together only after the exact public audio URL downloads with the approved checksum and duration. Rebuild `home-news-feed.json`. Do not publish old essays under the Mini Talks label.

## Migration boundary

Inventory the published English and Korean essay cards and the Japanese doorway before replacement. Draft, record, QC, and publish replacement Mini Talks before removing an old card from the learner catalog. Give each newly authored talk a **new Mini Talks ID**; completing an essay must not mark a different conversation complete. Preserve the old completion record separately during migration. Route legacy essay links to a clear track-change notice or archived lesson until it is safe to retire them; never silently substitute a different lesson. Remove old R2 media only after proving that no live page or completion route references it. Japanese has no published essay card in the current catalog, so its new track starts with original Mini Talks rather than a destructive migration.
