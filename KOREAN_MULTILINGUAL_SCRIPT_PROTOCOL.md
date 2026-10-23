# Korean-learning multilingual script production standard

Applies to every Korean-learning card in Guided Listen & Repeat, Essays & Articles, Vocal Camp, Story Camp, Starter, and future Readable lessons. Korean is always the immutable learning source; audio, cue timing, completion, and card IDs do not change when a meaning language changes.

## Data contract

Keep translations separate from the Korean source. Use the existing stable card ID and the exact source-line order. For a card with `n` Korean source lines, each published support-language array must contain exactly `n` nonempty strings. Do not combine, omit, reorder, or split source lines. For a cumulative story, translate the **new source line** at each index; the player builds the cumulative meaning from lines 0 through the current step.

```js
{
  cardId: "ko-guided-a1-001", // existing production card ID
  sourceLanguage: "ko",
  source: ["..."], // exact Korean lines; runtime refuses stale source
  sourceHash: "sha256-of-normalized-Korean-lines", // validator/review record
  translations: {
    en: ["..."], vi: ["..."], ne: ["..."],
    km: ["..."], my: ["..."], th: ["..."], ja: ["..."]
  },
  review: {
    vi: { status: "reviewed", reviewer: "name", reviewedAt: "YYYY-MM-DD" }
  }
}
```

English (`en`) is the baseline support language. The other support languages are Vietnamese (`vi`), Nepali (`ne`), Khmer (`km`), Burmese (`my`), Thai (`th`), and Japanese (`ja`). Display native names: English, Tiếng Việt, नेपाली, ខ្មែរ, မြန်မာ, ไทย, 日本語. Encode all source files as UTF-8 and retain native-script punctuation and line breaks. Keep translator notes and review metadata out of learner-facing text.

## Publication gate

1. Freeze Korean source and stable IDs first. Review meaning and politeness against the Korean, not an English paraphrase.
2. Draft each language independently. Check names, honorifics, gendered forms, level, cultural context, and naturalness.
3. Prefer native-language review before marking text `reviewed`. The owner approved a provisional `ai-reviewed` status on 2026-10-20: it may appear only with a clear learner-facing notice that native-speaker verification is still pending. AI-generated text alone must never be labeled `reviewed`.
4. Validate source hash, one-to-one line counts, nonempty Unicode text, card coverage, and UI layout at 360, 375, 390, and 430 CSS px, plus desktop and Bright/Dark.
5. Show a language on a card only when **all** its lines are aligned and the status is `reviewed` or `ai-reviewed`. The player requires an exact source match. `ai-reviewed` is visibly marked as a draft on the selector and below it. Never fill missing lines with English or label English as another language. The already-published GLR 001 pilot remains a legacy exception and still needs an independent native-language review.
6. A Korean-source edit invalidates the corresponding translations until rechecked. Audio QC and existing completion data remain separate.

## Learner behavior

Show Korean plus at most one support language. The compact selector lists supported languages and marks unavailable card translations as pending. Remember the most recent support language in `talktag:korean:support-language`; migrate the GLR-001 pilot key `talktag:korean-glr:support-language`. If an account profile preference becomes available, it takes priority over browser storage. If the saved language is unavailable for a card, show **English** with an explicit pending notice; keep the saved choice for cards where it is available. Default to English. Preserve Show/Hide meaning, playback, resume, and completion. Do not show multiple translations simultaneously.

The same ID-keyed translation registry and selector are reused by every Korean-learning track; no separate card copy per language. The Japanese production catalog is ID-keyed and merged at selector mount. The registry must refuse a translation whose source-line count does not match the card.
