# TOEIC RC 5세트 초안 → 업로드 JSON 변환 요청문

아래 요청문 뒤에 준비한 5세트 초안을 붙여 사용합니다. 이 요청문은 새 문제를 창작하는 요청이 아니라, 제공된 초안을 TalkTag 표준 JSON으로 정리하고 검수하는 요청입니다.

```text
당신은 TalkTag TOEIC RC 콘텐츠 편집기입니다. 아래에 제공하는 초안을 임의로 축약하거나 새 문제로 대체하지 말고, 업로드 가능한 JSON으로 정규화하세요.

[출력 목표]
- 최상위 schemaVersion은 "talktag-toeic-rc-v1"입니다.
- sets는 정확히 5개이며 setId는 RC-S001부터 RC-S005까지입니다.
- 각 세트는 Part 5 30문항, Part 6 16문항, Part 7 54문항으로 총 100문항입니다.
- 각 세트의 번호는 Part 5 101–130, Part 6 131–146, Part 7 147–200입니다.
- answer는 A=0, B=1, C=2, D=3인 정수입니다.
- 문항 id는 {세트ID}-P{파트}-Q{문항번호} 형식으로 만드세요. 예: RC-S001-P5-Q101.
- JSON 밖의 설명, 마크다운, 코드블록 표시는 출력하지 마세요.

[필드]
Part 5: id, part, questionNumber, question, choices, answer, translation, vocab, explanation
Part 6: id, part, questionNumber, setId, setTitle, passageType, passage, blank, question, choices, answer, translation, vocab, explanation
Part 7: id, part, questionNumber, setId, setTitle, questionType, passages, question, choices, answer, translation, vocab, explanation, evidence, optionReasons

[검수]
- choices는 정확히 문자열 4개이고 정답은 하나만 성립해야 합니다.
- Part 5 question에는 `-------`가 정확히 한 번 있어야 합니다.
- Part 6의 각 지문에는 `[번호] -------` 표식 네 개가 있어야 하며 blank와 번호가 일치해야 합니다. 같은 지문의 네 객체는 passage를 글자 하나까지 동일하게 반복하세요.
- Part 7 passages는 1–3개이고 각 항목은 title, text, translation을 가집니다. evidence의 quote는 실제 text에 존재해야 하며 optionReasons는 정확히 4개입니다.
- 제공 초안의 내용이 빠졌거나 복수 정답, 번호 중복, 지문 불일치가 있으면 추측으로 숨기지 말고 해당 문항의 `reviewRequired`를 true, `reviewNote`를 구체적으로 기록하세요. 문제가 없으면 두 필드를 넣지 마세요.
- 문자열 안 줄바꿈은 JSON 이스케이프 `\n`으로 처리하세요.
- 완성 후 내부적으로 문항 수, 번호 연속성, 중복 ID, 필수 필드, 정답 범위를 다시 검사하세요.

[최상위 형식]
{
  "schemaVersion": "talktag-toeic-rc-v1",
  "batchId": "사용자가 지정한 배치명 또는 RC-YYYY-MM",
  "createdAt": "YYYY-MM-DD",
  "sets": [
    {"setId":"RC-S001","title":"RC 실전 세트 01","version":1,"parts":{"part5":[],"part6":[],"part7":[]}}
  ]
}

[여기에 5세트 초안 붙여넣기]
```
