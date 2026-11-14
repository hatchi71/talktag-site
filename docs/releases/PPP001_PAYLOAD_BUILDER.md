# PPP 001 private payload builder

`scripts/build-ppp001-payloads.mjs` turns the 14 private English/Korean A0–C2 episode 001 drafts into an **inert** Supabase staging pack. It does not upload media, run SQL, change the public catalog, or publish any card. Output must be outside this site repository. The builder copies only original learner-facing lines and meanings. Assigned reference text, reference paths, source guidance, rights notes, and authoring notes never enter card payloads.

## Use

```sh
node scripts/build-ppp001-payloads.mjs \
  --draft-dir /path/to/private/A0-A2 \
  --draft-dir /path/to/private/B1-B2 \
  --draft-dir /path/to/private/C1-C2 \
  --readable-support /path/to/private/ppp001-a0-readable-bilingual-draft.json \
  --readable-support /path/to/private/ppp001-a1-a2-readable-bilingual-draft.json \
  --readable-support /path/to/private/ppp001-b1-b2-readable-bilingual-draft.json \
  --readable-support /path/to/private/ppp001-c1-c2-readable-bilingual-draft.json \
  --media /path/to/private/ppp001-media.json \
  --audio-pipeline /path/to/private/ppp001-assembled-audio.json \
  --out /path/to/private/ppp001-staging-pack.json \
  --strict
```

`--draft` may also be repeated for individual files. The builder recognizes the `cards` A0–A2 shape, the flat `glr` B1/B2 shape, and the flat `guidedListenRepeat` C1/C2 shape. It rejects duplicate language/level sources. With incomplete media, omit `--strict` to inspect the private pack and its `issues`; `--strict` exits nonzero when any release gate remains.

The output contains `sourceFiles` with basenames and hashes, a proposed-to-final `idMap`, and `rows[]` shaped for `talktag_cards`, `talktag_card_content`, and `talktag_card_media`. Every card row has `published:false` and `catalog_visible:false`. Distinct `-ppp-v2` IDs protect old completion, resume, and history records. Final IDs are deterministic and always show episode ordinal `001`. The pack contains no credentials, SQL mutation, or publication switch.

`--readable-support` may be repeated for the private bilingual Readable registries. The builder verifies each paragraph ID, full source text, source hash, and exact translation against the frozen draft before attaching review status to the staging row. Missing or unreviewed registries are release gates. A registry may pass with a truthful native review record, or with `status:"ai-editorial-approved"`, `displayEligible:true`, and a concrete `editorialQcRecord`; the latter remains labeled AI editorial and is never presented as native review. The provisional drafts remain out of the live catalog until this sign-off. The C1/C2 registry can be added as soon as its bilingual draft is complete; there is no need to change the builder.

For PPP001, derive editorial, source-originality, Readable translation, and script–picture approvals from the independent **64-card AI sign-off**. First create a private overlay with `scripts/build-ppp001-editorial-overlay.mjs --signoff /absolute/private/PPP001_PER_CARD_AI_EDITORIAL_SIGNOFF_20261114.json --out /absolute/private/ppp001-editorial-overlay.json`, then pass `--editorial-overlay /absolute/private/ppp001-editorial-overlay.json` to this builder. It validates every signed draft hash, exact target-line IDs and text hash, one-to-one meaning alignment, scene bytes/hash, and English/Korean shared scene. The overlay merges only editorial and artwork fields; the audio manifest remains separate. Any changed script or picture invalidates the sign-off. This is Codex AI editorial review, not human/native review or legal clearance.

When audio assembly finishes, run its decoded QC and pass both files to `scripts/bridge-ppp001-release-media.mjs --assembly /absolute/private/release-media.json --qc /absolute/private/qc-assembled.json --out /absolute/private/ppp001-audio-bridge.json`. The bridge verifies every audio file checksum and a matching decoded QC pass, maps split Guided parts and cumulative Vocal variants to final card IDs, and retains the assembly status. Pass the output as `--audio-pipeline` to the payload builder. A `technical-preview-not-publishable` status remains a release gate even when every file passes technical QC. The assembly must be rerun in its final mode; do not relabel a technical preview as approved.

The seven optimized scene candidates are discovered at `/assets/ppp001-scenes/001-a0.jpg` through `001-c2.jpg`. Each staging row records the candidate path, file size, and SHA-256, and the builder checks that English and Korean cards at the same level use the same candidate. Candidate artwork is **not** copied into the learner payload until the media manifest supplies an explicit script-picture approval and QC record. This keeps a visually inspected candidate distinct from release authorization.

## Media manifest contract

The `--media` JSON has `schemaVersion:1` and a `cards` object keyed by the **final base card ID**. Each card needs approved script and picture records. Readable additionally needs a source-rights sign-off. Use a public image path that actually exists under `public/assets/`; the builder computes its bytes and SHA-256.

```json
{
  "schemaVersion": 1,
  "cards": {
    "en-guided-a1-001-ppp-v2": {
      "editorialApproved": true,
      "editorialQcRecord": "/private/qc/en-a1-001.md",
      "artwork": {
        "publicPath": "/assets/ppp001-scenes/001-a1.jpg",
        "alt": "Two adults meet at a neighborhood drawing class.",
        "scriptPictureApproved": true,
        "qcRecord": "/private/qc/en-a1-picture.md"
      },
      "audio": {
        "main": {
          "localFile": "/private/audio/en-guided-a1-001-ppp-v2.mp3",
          "r2Key": "ppp001/en-guided-a1-001-ppp-v2/main/IMMUTABLE_SHA256.mp3",
          "sha256": "64-lowercase-hex-digit-checksum",
          "byteLength": 123456,
          "durationSeconds": 490.2,
          "sourceHash": "sha256-of-trimmed-target-lines-joined-by-newline",
          "technicalQcPass": true,
          "qcRecord": "/private/qc/en-guided-a1-001-ppp-v2.json",
          "cues": [{ "s": 0.8, "voiceEnd": 2.1, "e": 5.4, "i": 0, "r": 1 }]
        }
      }
    }
  }
}
```

The example cue array is abbreviated; actual Guided audio must have one valid cue for every source line × repetition. Every cue uses local, zero-based `i`, one-based `r`, nonoverlapping `s < voiceEnd < e`, and a decoded response gap of at least `max(3 s, 2.5 × voice duration)`. A/B Guided cards must be at most 11 minutes. C cards over the preferred 15 minutes are flagged. A finished independent part has its own start and ending dings, verified in the audio QC record.

For an episode that must split, replace `audio` with `parts`, each with consecutive zero-based `sourceIndices` and its own `audio.main`. The builder generates `-part1`, `-part2`, etc. IDs and cue indices are local to each part. The union of `sourceIndices` must cover every source line exactly once, in order. If the audio pipeline supplies part records and local cue indices, the builder can derive these spans.

Mini Talks needs `audio.main` with the same checksum, duration, source-hash, and QC fields. Per-turn timings may be supplied as `cues` for script highlighting. Readable and Story Camp need no audio media row. All five areas need the reviewed artwork and editorial QC metadata.

Vocal Camp needs a clip for each cumulative stage at **2.0×, 2.5×, 3.0×, and 3.5×** speaking pauses. For stage 1 use variants `clip_001_2_0`, `clip_001`, `clip_001_3_0`, `clip_001_3_5`; continue with `clip_002…` and so on. `clip_001` is the 2.5× default the current player expects. Each clip contains the complete cumulative passage for that stage and its measured gap. The same file fields above apply to every variant, with `sourceHash` computed from the cumulative target lines up to that stage. The audio rows are only release-ready when all variants pass technical QC.

## Audio assembly output bridge

`--audio-pipeline` accepts the audio job's `cards[]` records and merges them with the artwork/editorial manifest. One record represents one completed MP3. The builder verifies local bytes and SHA-256, then creates an immutable R2 key from the hash if `r2Key` is absent. The audio job's **input** should use `episode`, `cards[{id,language,level,track,lines[{id,text,meaning,clip}],promptClip?}]`, and `dings{start,end}`. Its **output** record needs:

```json
{
  "episode": "001",
  "cards": [{
    "id": "en-guided-a1-001-ppp-v2",
    "partIndex": 1,
    "partCount": 1,
    "audioPath": "/private/audio/en-guided-a1-001-ppp-v2.mp3",
    "sha256": "64-lowercase-hex-digit-checksum",
    "bytes": 123456,
    "durationSeconds": 490.2,
    "sourceHash": "sha256-of-trimmed-target-lines-joined-by-newline",
    "training": { "defaultReps": 10, "silenceMultiplier": 2.5, "cues": [] },
    "technicalQcPass": true,
    "qcRecord": "/private/qc/en-guided-a1-001-ppp-v2.json"
  }]
}
```

For split Guided output, use the same base ID or a `-partN` ID in each record, with one-based `partIndex`, `partCount`, and `sourceIndices` or enough local cues to determine each consecutive source span. For Vocal output, add `stage` (one-based) and `ratio` (2.0, 2.5, 3.0, 3.5) or the exact `variant` name. Mini output may include `timings` for turn highlighting. The `sourceHash` recipe is SHA-256 of each file's exact trimmed target lines joined by `\n`; for Vocal, hash the cumulative lines in that stage.

## Release gates outside this builder

The staging pack alone is not a release. Before publication, verify source-rights treatment, full scripts and translations, final illustration against each script, all media loudness and cue timings, private R2 upload and public SHA-256, Supabase entitlement, old-card history access, mobile/desktop layout, and the coordinated catalog visibility switch. Only native-reviewed Korean support arrays are exported because the current protected player does not visibly label AI-reviewed text as provisional. Pending and unreviewed arrays stay private; English meanings remain the baseline.
