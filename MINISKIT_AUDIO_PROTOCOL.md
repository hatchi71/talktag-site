# TalkTag MiniSkit audio boundary protocol

Mandatory for every MiniSkit script-to-audio job, QC pass, replacement, and publication.

1. Do not cut dialogue turns using proportional word counts, approximate line length, or a silence window selected without transcript alignment.
2. Obtain word-level timestamps for the source dialogue and match every scripted utterance in order. Record each prior line's final spoken word and end time, and the next line's first spoken word and start time.
3. Place the edit only in the measured silence window between those two transcript anchors. Assembly must fail closed if any line is unmatched, alignment evidence is absent, anchor order is invalid, or the source silence window is not present.
4. Verify every assembled line join against the expected dialogue order: no next-line words attached to the previous line, no truncation, and no duplicated words. Verify split-card joins as well.
5. Before publishing a new or replacement MiniSkit, perform a human spot-listen at every join, including each changed join. If speech recognition is ambiguous or a join sounds merged, correct the boundary or regenerate the source take and repeat QC. Do not publish on an unverified guess.
6. Keep word-timestamp transcript evidence and boundary decisions in the local QC record. Continue to validate repetitions, response gaps, dings, duration, synchronized scripts, and streaming under the main Guided L&R protocol.

The MiniSkit assembler requires explicit word-timestamp-verified boundary entries and refuses heuristic fallback. Update `VERIFIED_TURN_BOUNDARIES` in `scripts/build-miniskit-a2-c2.py` before processing a new source card.
