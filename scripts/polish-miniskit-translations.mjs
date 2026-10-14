#!/usr/bin/env node
/**
 * Applies reviewed, meaning-first Korean support text to the published 008–010
 * MiniSkit source and synchronizes the browser catalog.  Audio, cues, and
 * source-language dialogue are intentionally left unchanged.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'content', 'guided-miniskit-008-010-a2-c2.json');
const catalogPath = path.join(root, 'guided-miniskit-a2-c2.js');

// Key: episode:CEFR-level:zero-based-dialogue-line.
// Each entry was manually reviewed for meaning, register, and natural spoken Korean.
const reviewed = new Map([
  ['008:A2:2', '네, 저는 열 시 이후가 가장 괜찮아요.'],
  ['008:B1:0', '네가 메인 요리를 맡아 준다면, 나는 큰 샐러드를 가져갈게.'],
  ['008:B1:1', '좋아. 사람들이 마실 것도 아직 필요해.'],
  ['008:B1:2', '가는 길에 탄산수 사 갈게.'],
  ['008:B1:3', '종이 접시도 챙겨 줄 수 있어?'],
  ['008:B1:4', '그럼. 먼저 몇 명 오는지 확인해 볼게.'],
  ['008:B1:5', '좋아. 그러면 음식이 너무 많이 남는 일은 없겠네.'],
  ['008:B2:0', '저렴한 모델 쪽으로 마음이 기울기는 하는데, 다른 사람 의견도 들어보고 싶어.'],
  ['008:B2:2', '솔직히 말하면 저 기능 중 절반도 안 쓸 것 같아.'],
  ['008:B2:3', '그렇다면 눈에 확 띄지는 않더라도 기본형이 더 잘 맞을 수 있겠네.'],
  ['008:B2:4', '나도 그렇게 생각했어. 중요한 걸 놓치고 싶지 않았던 거야.'],
  ['008:B2:5', '결정하기 전에 보증 기간을 확인해 봐. 거기서 가격 차이가 나거든.'],
  ['008:C1:1', '목표일일 뿐이에요. 시간이 더 필요하면 검토 일정은 월요일로 미뤄도 됩니다.'],
  ['008:C1:2', '알겠습니다. 우선 조율이 가장 많이 필요한 부분부터 집중할게요.'],
  ['008:C1:3', '일정에 영향을 줄 수 있는 사항이 있으면 바로 표시해 주세요. 그러면 미리 조정할 수 있어요.'],
  ['008:C2:0', '시험 운영은 해볼 의향이 있어요. 다만 기간을 제한하고, 그 과정에서 무엇을 얻고 포기해야 하는지 명확히 해야 해요.'],
  ['008:C2:1', '동의해요. 첫 시도에서 좋은 결과가 나왔다고 해서 규모를 확대했을 때도 같은 방식이 효과적일 거라는 보장은 없으니까요.'],
  ['008:C2:2', '더 많은 자원을 투입하기 전에 무엇을 성공으로 볼지부터 정해 보죠.'],
  ['009:A2:1', '거의. 그런데 열쇠가 안 보여.'],
  ['009:A2:2', '문 옆 작은 탁자는 찾아봤어?'],
  ['009:B1:1', '지도상으로는 도서관 뒤쪽에 길이 있어.'],
  ['009:B1:2', '큰길로 가는 것보다 많이 더 멀어?'],
  ['009:B1:3', '몇 분 더 걸릴 뿐이고, 더 한적해 보여.'],
  ['009:B2:0', '이 슬라이드에 정말 많은 고민을 담으셨네요.'],
  ['009:B2:2', '핵심이 더 잘 드러나도록 몇 부분을 덜어내 보는 건 어떨까요?'],
  ['009:B2:3', '그렇게 할 수는 있지만, 배경 설명이 너무 빠지지는 않았으면 해요.'],
  ['009:B2:4', '추가 배경 설명은 유인물로 옮기면 어떨까요?'],
  ['009:C1:0', '더 이른 열차를 타면 좋겠지만, 늦은 열차로도 제시간에 도착한다면 꼭 그럴 필요는 없어요.'],
  ['009:C1:2', '맞아요. 그렇게 구분하면 우리 둘 다에게 맞는 요금을 찾을 여지가 더 생겨요.'],
  ['009:C1:3', '이상적으로 고를 것을 기준으로 하지 말고, 실제로 필요한 조건을 기준으로 선택지를 비교해 봅시다.'],
  ['009:C2:0', '오늘 저녁 모임은 특히 처음 오신 분들도 편하게 느끼셨을 것 같아요.'],
  ['009:C2:1', '다행이네요. 다만 입구 쪽에서 밀렸던 접수 절차는 다음에 더 매끄럽게 다듬을 수 있겠어요.'],
  ['009:C2:2', '좋은 지적이에요. 그곳에 자원봉사자를 한 명 더 두면 줄이 막히지 않으면서도 편안한 분위기를 유지할 수 있겠어요.'],
  ['010:B1:0', '나가기 전에 휴대폰에 표 저장해 뒀어?'],
  ['010:B1:1', '응, 통신이 안 될 경우에 대비해 화면도 캡처해 뒀어.'],
  ['010:B1:3', '조리대에 있는 작은 보조배터리 가져가. 충전이 다 돼 있어.'],
  ['010:B1:4', '고마워. 바로 찾을 수 있게 앞주머니에 넣어 둘게.'],
  ['010:B2:0', '날씨가 계속 괜찮으면 밖에서 먹어도 좋겠어.'],
  ['010:B2:2', '일단 실내 예약은 유지하고 도착해서 결정하자.'],
  ['010:B2:5', '좋아. 그러면 번거롭게 따로 준비하지 않고도 선택지를 남겨 둘 수 있겠네.'],
  ['010:C1:0', '그 제안을 지지할 수는 있지만, 금요일까지 완성된 초안을 낼 수 있다고 장담할 수는 없어요.'],
  ['010:C1:1', '현실적으로 그때까지 어디까지 마칠 수 있나요?'],
  ['010:C1:2', '핵심 부분의 개요를 잡고, 아직 결정해야 할 사항을 표시할 수 있어요.'],
  ['010:C1:3', '그 정도면 잘못된 기대를 갖게 하지 않고도 다음 단계로 넘어갈 수 있겠네요.'],
  ['010:C2:0', '토요일 일정에 관해 말씀드린 내용을 바꿔야 할 것 같아요. 가족 관련 일정이 생겼어요.'],
  ['010:C2:1', '지금 알려줘서 고마워. 네가 준비를 도와줄 거라고 생각하고 있었거든.'],
  ['010:C2:2', '그럴 만한 사정이라는 건 이해해요. 일정이 바뀌게 되어 미안해요. 금요일 저녁에 들러 미리 준비해 둘 수 있어요.'],
  ['010:C2:3', '그러면 정말 큰 도움이 돼. 그에 맞춰 토요일 계획을 조정할게.'],
]);

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
let changed = 0;
for (const card of source.cards) {
  card.utterances.forEach((utterance, index) => {
    const episode = String(card.episode).padStart(3, '0');
    const replacement = reviewed.get(`${episode}:${card.level}:${index}`);
    if (replacement && utterance[1] !== replacement) {
      utterance[1] = replacement;
      changed += 1;
    }
  });
}

if (changed !== reviewed.size) {
  throw new Error(`Expected to update ${reviewed.size} reviewed lines, updated ${changed}. Refusing partial sync.`);
}
fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

const sandbox = { window: { TalkTagAudioLessons: [] } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(catalogPath, 'utf8'), sandbox, { filename: catalogPath });
const lessons = sandbox.window.TalkTagAudioLessons;

for (const card of source.cards) {
  const matching = lessons.filter((lesson) => lesson.format === 'miniskit'
    && lesson.part === card.episode && lesson.level === card.level);
  if (matching.length === 0) throw new Error(`No published lesson for ${card.episode} ${card.level}`);
  for (const lesson of matching) {
    const start = (lesson.sentenceStart ?? 1) - 1;
    const meanings = card.utterances.slice(start, start + lesson.expressions.length).map(([, korean]) => korean);
    if (meanings.length !== lesson.expressions.length) {
      throw new Error(`Cannot align ${lesson.id} to ${card.episode} ${card.level}`);
    }
    lesson.meanings = meanings;
  }
}

const generated = [
  '/* Generated from content/guided-miniskit-008-010-a2-c2.json. Do not hand-edit. */',
  '(function () {',
  `  const cards = ${JSON.stringify(lessons)};`,
  '  window.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(cards);',
  '}());',
  '',
].join('\n');
fs.writeFileSync(catalogPath, generated);

console.log(`Updated ${changed} reviewed Korean translations and synchronized ${lessons.length} published MiniSkit cards.`);
