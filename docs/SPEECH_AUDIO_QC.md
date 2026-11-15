# Speech audio release gate

Measure the **finished encoded file**, with voice intervals separated from response gaps and cue sounds. Keep the source manifest and QC report outside the public site repository. Run:

```sh
node scripts/validate-speech-audio-qc.mjs --manifest /private/path/audio-qc-input.json --out /private/path/audio-qc-report.json
```

The private input is `{ "schemaVersion": 1, "media": [...] }`. Each media item needs a unique `id`, absolute `file` path, `sha256`, `bytes`, `voiceIntervals` containing `{ "key", "start", "end" }` in seconds, and an explicit `cuePolicy`:

- `"none"`: no cues; use `"cueIntervals": []`.
- `"start-end"`: two nonoverlapping `cueIntervals`, first with `"kind": "start"`, second with `"kind": "end"`; each has `start` and `end` seconds.

The command checks every file's SHA-256 and byte length, decodes its voice and cues, measures EBU R128 loudness and true peak, and exits nonzero if any item fails. The current gate is voiced speech at least −19 LUFS, every utterance at least −25 dBFS RMS, cue RMS no more than 3 dB above speech RMS, and whole-file true peak at most −1 dBTP. The report binds to the input manifest checksum and records the exact file hash. Whole-file −16 LUFS remains a production target; it cannot substitute for the speech gate.

If music overlaps the voice, use a track-specific check that measures the voice stem separately; selecting a mixed interval cannot prove speech loudness. Re-run QC after any edit or re-encoding, then verify the uploaded bytes and authorized playback before publishing.
