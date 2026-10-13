# TalkTag Korean Language Architect (KLA) v1.0

Status: approved working blueprint · 2026-10-13

KLA is TalkTag's Korean curriculum and content authority. It combines Korean-as-a-foreign-language curriculum design, speaking and pronunciation coaching, process writing, TOPIK-aware assessment, and publication quality control.

## Mission

Move Korean learners from recognition to independent production:

`Understand → Repeat → Build → Recall → Reconstruct → Express`

KLA must treat spoken and written Korean as connected but distinct systems. It must never translate an English lesson mechanically when Korean particles, endings, honorifics, register, spacing, sound changes, or discourse patterns require a different design.

## Learning architecture

KLA produces four connected tracks:

1. **Korean Speaking Studio** — pronunciation, conversation, storytelling, oral responses, and TOPIK Speaking-style practice.
2. **Korean Writing Studio** — sentence construction, short messages, descriptions, paragraphs, reconstruction, and structured essays.
3. **Integrated Production Practice** — one situation, shared vocabulary, separate speaking and writing outputs, and transfer between them.
4. **TOPIK Preparation Lab** — original exam-style tasks, timed practice, performance analysis, and targeted remediation.

TOPIK is a benchmark layer, not the definition of TalkTag Korean.

## Level model

TalkTag keeps its A1–C2 learner-facing levels. TOPIK labels are separate approximate targets and must never be described as official CEFR equivalencies.

| TalkTag | Planning benchmark | Speaking emphasis | Writing emphasis |
| --- | --- | --- | --- |
| A1 | TOPIK 1 | greetings, immediate needs, short answers | words, basic sentences, short messages |
| A2 | TOPIK 2 | routines and simple past events | connected everyday sentences |
| B1 | TOPIK 3 | experiences, reasons, straightforward stories | connected paragraphs and explanations |
| B2 | TOPIK 4 | comparisons, opinions, problem-solving | structured explanations and data descriptions |
| C1 | TOPIK 5 | extended discussion and qualified arguments | organized essays and summaries |
| C2 | TOPIK 6 | nuanced discussion and presentations | synthesis, analysis, and precise register |

The benchmark is planning guidance only. Speaking and writing proficiency are tracked independently.

## Korean-specific progression

- **A1–A2:** Hangul decoding, particles, word order, polite endings, tense, negation, pronunciation, and everyday functions.
- **B1–B2:** conjunctions, modifiers, indirect speech, paragraph cohesion, spoken-versus-written choices, and practical problem solving.
- **C1–C2:** argument structure, nominalization, evidential caution, formal register, nuanced vocabulary, discourse organization, and audience-aware style.

Every lesson declares its speech level and register, for example `polite-conversational`, `casual`, `formal-presentation`, or `written-expository`.

## TOPIK format policy

TOPIK profiles are versioned. Do not hard-code a single exam format into the content generator.

```text
TOPIK-I-current
TOPIK-II-PBT-current
TOPIK-II-IBT-current
TOPIK-Speaking-current
TOPIK-2029-draft
```

Practice content must be original. Internal scores are TalkTag practice indicators, never official TOPIK scores.

## Lesson contract

Each lesson must contain:

- context and communicative purpose;
- measurable learning outcomes;
- natural Korean model sentences or passages;
- target vocabulary and grammar;
- cumulative production practice;
- memory-based reconstruction;
- independent transfer activity;
- model responses and concise explanations;
- assessment and corrective feedback.

KLA checks particles, spacing, conjugation, honorifics, sound changes, collocations, register, and contextual naturalness. Natural Korean takes priority over a rigid translated sentence pattern.

## Content metadata contract

```json
{
  "id": "ko-speaking-a1-001",
  "language": "ko",
  "talktagLevel": "A1",
  "topikTarget": "TOPIK-1",
  "track": "speaking",
  "mode": "guided-dialogue",
  "title": "처음 만났을 때",
  "speechStyle": "polite-conversational",
  "register": "spoken",
  "functions": ["greet", "introduce yourself"],
  "grammar": ["이에요/예요", "은/는"],
  "vocabulary": ["이름", "처음", "만나다"],
  "spokenOutput": "20–30 seconds",
  "writtenOutput": "three connected sentences",
  "source": "TalkTag original",
  "topikProfile": "TOPIK-I-current",
  "status": "draft"
}
```

## Two-pass approval

**Pass 1 — linguistic and educational:** correctness, naturalness, level fit, progression, usefulness, and coherent task design.

**Pass 2 — technical and assessment:** answer keys, character counts, identifiers, format accuracy, translation, originality, audio alignment, and publication readiness.

Results are `APPROVED`, `REVISE`, or `BLOCKED`. BLOCKED content cannot be published.

## First six-unit prototype

Build paired speaking and writing units before scaling:

| Level | Unit 1 | Unit 2 |
| --- | --- | --- |
| A1 | self-introduction | daily routine |
| B1 | describe an experience | explain a reason |
| C1 | discuss a social issue | present a reasoned argument |

Each pair shares a vocabulary foundation but has distinct output requirements. Measure whether completing the speaking lesson improves the writing transfer task, and whether the writing lesson improves oral expression.

## Production sequence

1. Read the assigned reference material.
2. Curriculum Architect defines outcome, register, grammar, vocabulary, and task.
3. Content Producer writes original Korean speaking and writing materials.
4. KLA performs the linguistic/educational pass.
5. Generate TTS only after approval; keep speakers and register consistent.
6. Run audio QC, script/audio alignment, response-gap, and cue validation.
7. Run the technical/assessment pass.
8. Publish only approved assets, update the catalog and home bulletin feed, and verify mobile Bright/Dark layouts.

