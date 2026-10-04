# TalkTag TOEIC RC 5세트 JSON 표준 v1

## 확정 단위

- 한 배치: 5세트, 총 500문항
- 세트당: Part 5 30문항 + Part 6 16문항 + Part 7 54문항 = 100문항
- 문항 번호: 세트마다 Part 5는 101–130, Part 6는 131–146, Part 7은 147–200으로 다시 시작합니다.
- 정답값: A=0, B=1, C=2, D=3
- 모든 문항은 영구적으로 변하지 않는 `id`를 가집니다. 형식은 `RC-S001-P5-Q101`입니다.

## 업로드 원본

작업자는 `talktag-toeic-rc-v1` 형식의 JSON 하나를 준비합니다. 최상위 `sets` 배열에는 정확히 5개 세트가 있어야 합니다.

```json
{
  "schemaVersion": "talktag-toeic-rc-v1",
  "batchId": "RC-2026-10",
  "createdAt": "2026-10-04",
  "sets": [
    {
      "setId": "RC-S001",
      "title": "RC 실전 세트 01",
      "version": 1,
      "parts": {
        "part5": [],
        "part6": [],
        "part7": []
      }
    }
  ]
}
```

Part 5 문항 필드: `id`, `part`, `questionNumber`, `question`, `choices`, `answer`, `translation`, `vocab`, `explanation`.

Part 6 문항은 위 필드에 `setId`, `setTitle`, `passageType`, `passage`, `blank`를 추가합니다. 같은 지문의 네 문항은 `setId`, `setTitle`, `passageType`, `passage`가 완전히 같아야 합니다.

Part 7 문항은 공통 필드에 `setId`, `setTitle`, `questionType`, `passages`, `evidence`, `optionReasons`를 추가합니다.

## R2 및 공개 미러 구조

R2의 기준 경로는 아래와 같습니다.

```text
toeic/rc/manifest.json
toeic/rc/sets/RC-S001/part5.json
toeic/rc/sets/RC-S001/part6.json
toeic/rc/sets/RC-S001/part7.json
...
toeic/rc/sets/RC-S005/part7.json
```

Cloudflare Access로 보호된 R2 Worker를 학습자 브라우저에서 직접 호출하지 않습니다. 검수 완료본만 같은 상대 구조로 `toeic/content/rc/`에 공개 미러링합니다. R2는 기준 원본과 이전 버전 보관소, 공개 미러는 읽기 전용 서비스 파일입니다.

## 게시 규칙

1. JSON 문법, 필드, 번호, 정답 분포, 중복 ID를 자동 검사합니다.
2. Part별 문항 수가 30/16/54가 아니면 게시하지 않습니다.
3. 세 파일을 R2에 업로드하고 SHA-256 값을 기록합니다.
4. 공개 미러에 같은 파일을 반영합니다.
5. 마지막에 manifest의 `published`, `status`, `version`, `releaseDate`를 갱신합니다. manifest는 항상 마지막에 교체합니다.
6. 이전 파일은 `toeic/rc/archive/{setId}/v{version}/`에 보관합니다.
