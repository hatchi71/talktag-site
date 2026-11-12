import { recordMemberVisit } from './member-visits.js';
import { checkDeviceSession, watchDeviceSession } from './device-session.js';
import { openMemberLearningState } from './member-learning-state.js';
let memberState;
import { vocalPauseTimings } from './vocal-pause-timings.js';
import { createVocalBoundaryCues } from './vocal-boundary-cues.js';
import { createClient } from '@supabase/supabase-js';
import { japaneseWithFurigana } from './japanese-furigana.js';

const workerOrigin = 'https://talktag-private-media-preview.ejkim2022.workers.dev';
const cardId = new URLSearchParams(location.search).get('id');
const cardLanguage = /^(?:ko-|mt-ko-)/.test(cardId || '') ? 'ko' : /^(?:ja-|mt-ja-)/.test(cardId || '') ? 'ja' : 'en';
const ui = (english, korean) => cardLanguage === 'ko' ? english : korean;
document.documentElement.lang = cardLanguage === 'ko' ? 'en' : 'ko';
const initialLabels = {
  '#title': ['Opening your card…', '카드를 여는 중…'],
  '#status': ['Checking your account and access…', '로그인과 이용 권한을 확인하고 있어요…'],
  '#sign-in': ['Sign in to practice', '로그인하고 연습하기'],
  '#play-toggle': ['▶ Play', '▶ 재생'],
  '#rewind small': ['10 sec', '10초'],
  '.whole-repeat span': ['Repeat whole audio', '전체 반복'],
  '.text-actions-label': ['Script', '스크립트'],
  '#hide-script': ['Hidden', '숨기기'],
  '#show-script': ['Script', '원문'],
  '#show-meaning': ['Script + meaning', '원문 + 뜻']
};
for (const [selector, labels] of Object.entries(initialLabels)) {
  const node = document.querySelector(selector);
  if (node) node.textContent = ui(...labels);
}
document.querySelector('#sign-in').href = `/account.html?ui=${cardLanguage === 'ko' ? 'en' : 'ko'}&from=${cardLanguage}&returnTo=${encodeURIComponent(location.pathname + location.search)}`;
// The return route must work for visitors and denied cards too. Those users
// cannot fetch the private lesson body, so derive the public catalog from ID.
const inferredLevel = cardId?.match(/(?:^|-)(a0|a1|a2|b1|b2|c1|c2)(?:-|$)/i)?.[1]?.toUpperCase() || 'A1';
const inferredArea = /^mt-/.test(cardId || '') ? 'mini-talks'
  : /-vocal-camp-/.test(cardId || '') ? 'vocal-camp'
  : /-story-camp-/.test(cardId || '') ? 'story-camp'
  : /-readable-/.test(cardId || '') ? 'readable' : 'guided-listen-repeat';
const publicCatalogs = {
  en: { 'guided-listen-repeat': '/audio-library.html?type=guided', 'mini-talks': '/audio-library.html?type=plain', 'vocal-camp': '/vocal-camp.html', 'story-camp': '/story-camp.html', readable: '/readable.html' },
  ko: { 'guided-listen-repeat': '/K-korean-audio-library.html?type=guided', 'mini-talks': '/K-korean-audio-essays.html', 'vocal-camp': '/K-korean-vocal-camp.html', 'story-camp': '/K-korean-story-camp.html', readable: '/K-korean-readable.html' },
  ja: { 'guided-listen-repeat': '/japanese/J-guided.html', 'mini-talks': '/japanese/J-audio-essays.html', 'vocal-camp': '/japanese/J-vocal-camp.html', 'story-camp': '/japanese/J-story-camp.html', readable: '/japanese/J-readable.html' }
};
function setReturnRoute(language, area, level) {
  const page = publicCatalogs[language]?.[area];
  const back = document.querySelector('#back');
  back.href = page ? `${page}${page.includes('?') ? '&' : '?'}level=${encodeURIComponent(level)}`
    : language === 'ko' ? '/K-korean.html' : language === 'ja' ? '/japanese/J-index.html' : '/E-english.html';
  back.textContent = language === 'ko' ? `← Back to ${level} cards` : `← ${level} 카드로`;
}
setReturnRoute(cardLanguage, inferredArea, inferredLevel);
const accountControl = document.querySelector('#player-account');
if (accountControl) {
  accountControl.href = document.querySelector('#sign-in').href;
  accountControl.textContent = ui('Log in', '로그인');
  document.querySelector('.site-header .brand').href = cardLanguage === 'ko' ? '/K-korean.html' : cardLanguage === 'ja' ? '/japanese/J-index.html' : '/E-english.html';
  document.querySelector('#player-theme').onclick = () => {
    const value = document.documentElement.dataset.appearance === 'dark' ? 'bright' : 'dark';
    document.documentElement.dataset.appearance = value;
    try { localStorage.setItem('talktag-appearance', value); } catch {}
  };
  document.querySelector('#player-share').onclick = async () => {
    try { if (navigator.share) await navigator.share({ title: document.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); document.querySelector('#player-share').textContent = '✓'; }
    } catch {}
  };
}
const config = window.TalkTagAuthConfig || {};
const status = document.querySelector('#status');
const card = document.querySelector('#card');
const audio = document.querySelector('#audio');
const playToggle = document.querySelector('#play-toggle');
const rewind = document.querySelector('#rewind');
const replay = document.querySelector('#replay');
const seek = document.querySelector('#seek');
const clock = value => { const seconds = Math.max(0, Math.floor(value || 0)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
playToggle.addEventListener('click', () => {
  if (guidedHold || vocalWaiting) {
    cancelGuidedHold();
    if (vocalWaiting) stopVocal();
    audio.pause();
    playToggle.textContent = ui('▶ Play', '▶ 재생');
    return;
  }
  if (audio.paused) audio.play().catch(() => {
    document.querySelector('#play-status').textContent = ui('Tap Play to try again.', '재생 버튼을 눌러 다시 시도해 주세요.');
  });
  else audio.pause();
});
rewind.setAttribute('aria-label', ui('Back 10 seconds', '10초 뒤로'));
replay.setAttribute('aria-label', ui('Restart audio', '처음부터 다시 듣기'));
rewind.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
replay.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); });
seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number(seek.value) / 1000; });
audio.addEventListener('play', () => { playToggle.textContent = ui('Ⅱ Pause', 'Ⅱ 일시정지'); });
audio.addEventListener('pause', () => { playToggle.textContent = ui('▶ Play', '▶ 재생'); });
audio.addEventListener('timeupdate', () => { document.querySelector('#elapsed').textContent = clock(audio.currentTime); if (Number.isFinite(audio.duration) && audio.duration > 0) seek.value = String(Math.round(audio.currentTime / audio.duration * 1000)); });
audio.addEventListener('loadedmetadata', () => { document.querySelector('#duration').textContent = clock(audio.duration); });
const clips = document.querySelector('#clips');
const lessonText = document.querySelector('#lesson-text');
const scriptButton = document.querySelector('#show-script');
const meaningButton = document.querySelector('#show-meaning');
const hideScriptButton = document.querySelector('#hide-script');
const wholeRepeat = document.querySelector('#whole-repeat');
hideScriptButton.addEventListener('click', () => {
  showScript = false;
  showMeaning = false;
  lessonText.hidden = true;
  updateScriptChoice();
});
wholeRepeat.addEventListener('change', () => { audio.loop = wholeRepeat.checked; });
function updateScriptChoice() {
  hideScriptButton.setAttribute('aria-pressed', String(!showScript && !showMeaning));
  scriptButton.setAttribute('aria-pressed', String(showScript && !showMeaning));
  meaningButton.setAttribute('aria-pressed', String(showMeaning));
}
let content;
let client;
let currentVariant = 'main';
let showScript = false;
let showMeaning = false;
let audioRetry = 0;
let reconnecting = false;
let retryWindowStarted = 0;
let lastProgressTime = 0;
let ticketExpiresAt = 0;
let renewing = false;
let vocalRun = 0;
let vocalTimer = 0;
let vocalStep = -1;
let vocalCounts = [];
let vocalTarget = 0;
let vocalSteps = [];
let vocalWaiting = false;
let refreshVocalStage = () => {};
const vocalCues = /^en-vocal-camp-003-(?:a1|a2|b1|b2|c1|c2)$/i.test(cardId || '')
  ? createVocalBoundaryCues() : null;
let guidedHold = null;
let guidedInternalSeek = false;
let guidedPreviousTime = 0;
let guidedProcessed = new Set();
let guidedCues = [];
let guidedMultiplier = 2.5;
let guidedProgress;
let guidedCompletion;
let guidedDone = false;
let signedInUserId = '';
let otherCompletion;
const scriptCuesByVariant = new Map();
const lineClipIndices = new Map();
let activeScriptIndex = -1;

function registerScriptCues(variant, cues, lineIds = []) {
  if (!variant || !Array.isArray(cues)) return;
  const normalized = cues.map(cue => ({
    s: Number(cue.s ?? cue.start),
    e: Number(cue.e ?? cue.pauseEnd),
    i: Number(cue.i ?? lineIds.indexOf(cue.lineId))
  })).filter(cue => Number.isFinite(cue.s) && Number.isFinite(cue.e)
    && Number.isInteger(cue.i) && cue.i >= 0 && cue.e > cue.s)
    .sort((a, b) => a.s - b.s);
  if (normalized.length) scriptCuesByVariant.set(variant, normalized);
}

function activeLineAt(time) {
  if (audio.ended) return -1;
  const cues = scriptCuesByVariant.get(currentVariant) || [];
  let low = 0;
  let high = cues.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cues[mid].s <= time) { found = mid; low = mid + 1; }
    else high = mid - 1;
  }
  if (found >= 0 && time < cues[found].e) return cues[found].i;
  return audio.currentSrc && lineClipIndices.has(currentVariant) && time >= 0
    ? lineClipIndices.get(currentVariant) : -1;
}

function updateScriptHighlight(force = false) {
  const index = activeLineAt(audio.currentTime);
  if (!force && index === activeScriptIndex) return;
  activeScriptIndex = index;
  for (const line of lessonText.querySelectorAll('[data-line-index]')) {
    const current = Number(line.dataset.lineIndex) === index;
    line.classList.toggle('is-current-line', current);
    if (!line.classList.contains('secondary')) {
      if (current) line.setAttribute('aria-current', 'true');
      else line.removeAttribute('aria-current');
    }
  }
  if (index < 0 || lessonText.hidden || !lessonText.classList.contains('is-synchronized')) return;
  const currentLine = [...lessonText.querySelectorAll('p[data-line-index]')]
    .find(line => !line.classList.contains('secondary') && Number(line.dataset.lineIndex) === index);
  if (!currentLine) return;
  const top = currentLine.getBoundingClientRect().top
    - lessonText.getBoundingClientRect().top + lessonText.scrollTop;
  const bottom = top + currentLine.offsetHeight;
  if (top < lessonText.scrollTop || bottom > lessonText.scrollTop + lessonText.clientHeight) {
    lessonText.scrollTop = Math.max(0, top - 12);
  }
}

for (const event of ['timeupdate', 'seeked', 'loadedmetadata', 'play', 'ended']) {
  audio.addEventListener(event, () => updateScriptHighlight());
}

function guidedKey(kind) { return `talktag-guided-preview:${kind}:${cardId}`; }

function updateGuidedCompletion() {
  const label = guidedDone ? ui('Undo mission completion', '미션 완료 취소') : ui('Complete mission', '미션 완료로 표시');
  guidedCompletion.textContent = guidedDone ? ui('Undo', '완료 취소') : ui('✓ Complete', '✓ 완료');
  guidedCompletion.setAttribute('aria-label', label);
  guidedCompletion.title = label;
}

function cancelGuidedHold() {
  if (!guidedHold) return;
  clearTimeout(guidedHold);
  guidedHold = null;
}

function mountGuidedControls(item) {
  const cues = item.training?.cues;
  if (!Array.isArray(cues) || !cues.length) return;
  guidedCues = cues.filter(cue => Number.isFinite(cue.s) && Number.isFinite(cue.voiceEnd) && Number.isFinite(cue.e));
  if (!guidedCues.length) return;
  const section = document.createElement('section');
  section.className = 'guided-controls';
  const pauseRow = document.createElement('div');
  pauseRow.className = 'guided-pause-row';
  const label = document.createElement('label');
  label.textContent = ui('Speaking pause', '말하기 간격');
  const range = document.createElement('input');
  range.id = 'guided-pause';
  label.htmlFor = range.id;
  range.type = 'range'; range.min = '0'; range.max = '3'; range.step = '1';
  const output = document.createElement('output');
  output.setAttribute('aria-hidden', 'true');
  const options = [2, 2.5, 3, 3.5];
  try { const saved = Number(memberState.getItem(guidedKey('pause'))); if (options.includes(saved)) guidedMultiplier = saved; } catch {}
  const update = () => {
    const multiplier = guidedMultiplier.toFixed(1);
    range.value = String(options.indexOf(guidedMultiplier));
    range.setAttribute('aria-valuetext', ui(`${multiplier} times the voice length`, `음성 길이의 ${multiplier}배`));
    output.textContent = `${multiplier}×`;
  };
  update();
  range.addEventListener('input', () => {
    guidedMultiplier = options[Number(range.value)]; update();
    try { memberState.setItem(guidedKey('pause'), String(guidedMultiplier)); } catch {}
  });
  guidedProgress = paragraph('', true);
  guidedProgress.className = 'guided-progress';
  pauseRow.append(label, range, output);
  const actions = document.createElement('div');
  actions.className = 'guided-action-row';
  const navigation = document.createElement('div');
  navigation.className = 'guided-sentence-nav';
  navigation.setAttribute('role', 'group');
  navigation.setAttribute('aria-label', ui('Sentence controls', '문장 재생 조작'));
  const sentenceIds = [...new Set(guidedCues.map(cue => Number(cue.i)))].sort((a, b) => a - b);
  const jump = (direction) => {
    const current = guidedCues.find(cue => audio.currentTime >= cue.s && audio.currentTime < cue.e);
    const currentSentence = Number(current?.i ?? 0);
    const position = Math.max(0, sentenceIds.indexOf(currentSentence));
    const targetSentence = sentenceIds[Math.max(0, Math.min(sentenceIds.length - 1, position + direction))];
    const firstCue = guidedCues.find(cue => Number(cue.i) === targetSentence);
    if (!firstCue) return;
    cancelGuidedHold();
    guidedProcessed.clear();
    audio.currentTime = firstCue.s;
    guidedProgress.textContent = ui(`Sentence ${targetSentence + 1}/${content.expressions?.length || sentenceIds.length} · Ready to listen`, `문장 ${targetSentence + 1}/${content.expressions?.length || sentenceIds.length} · 듣기 준비 완료`);
  };
  const sentenceActions = [
    [ui('← Prev', '← 이전'), ui('Prev sentence', '이전 문장'), -1],
    [ui('↻ Replay', '↻ 다시 듣기'), ui('Replay sentence', '문장 다시 듣기'), 0],
    [ui('Next →', '다음 →'), ui('Next sentence', '다음 문장'), 1]
  ];
  for (const [text, label, direction] of sentenceActions) {
    if (sentenceIds.length === 1 && direction !== 0) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', () => jump(direction));
    navigation.append(button);
  }
  const completion = document.createElement('button');
  completion.type = 'button'; completion.className = 'completion-button';
  guidedCompletion = completion;
  updateGuidedCompletion();
  completion.addEventListener('click', async () => {
    if (!signedInUserId) return;
    completion.disabled = true;
    const next = !guidedDone;
    const query = client.from('learning_progress');
    const result = next
      ? await query.insert({ user_id: signedInUserId, lesson_id: cardId })
      : await query.delete().eq('user_id', signedInUserId).eq('lesson_id', cardId);
    if (result.error && !(next && result.error.code === '23505')) {
      document.querySelector('#play-status').textContent = ui('Completion could not be saved. Please try again.', '완료 상태를 저장하지 못했어요. 다시 시도해 주세요.');
      completion.disabled = false;
      return;
    }
    guidedDone = next;
    try {
      if (guidedDone) memberState.setItem(guidedKey('completed'), new Date().toISOString());
      else memberState.removeItem(guidedKey('completed'));
    } catch {}
    updateGuidedCompletion();
    completion.disabled = false;
  });
  actions.append(navigation, completion);
  section.append(pauseRow, guidedProgress, actions);
  document.querySelector('#audio-section').append(section);
  try {
    const saved = Number(memberState.getItem(guidedKey('position')));
    if (saved > 1) audio.addEventListener('loadedmetadata', () => {
      if (saved < audio.duration - 2) audio.currentTime = saved;
    }, { once: true });
  } catch {}
}

function adjustGuidedPause() {
  if (!guidedCues.length) return;
  const time = audio.currentTime;
  if (time < guidedPreviousTime - 0.2 && !guidedInternalSeek) guidedProcessed.clear();
  guidedPreviousTime = time;
  if (audio.paused || audio.seeking || guidedInternalSeek || guidedHold || guidedMultiplier === 2.5) return;
  const index = guidedCues.findIndex(cue => time >= cue.voiceEnd + 0.05 && time < cue.e - 0.08);
  if (index < 0 || guidedProcessed.has(index)) return;
  const cue = guidedCues[index];
  guidedProcessed.add(index);
  const target = Math.max(3, (cue.voiceEnd - cue.s) * guidedMultiplier);
  const delta = target - (cue.e - cue.voiceEnd);
  if (delta > 0.08) {
    audio.pause();
    guidedHold = setTimeout(() => { guidedHold = null; audio.play().catch(() => {}); }, delta * 1000);
  } else if (delta < -0.08) {
    guidedInternalSeek = true;
    audio.currentTime = Math.min(cue.e - 0.08, time - delta);
  }
}

audio.addEventListener('timeupdate', adjustGuidedPause);
audio.addEventListener('timeupdate', () => {
  if (!guidedProgress || !guidedCues.length) return;
  const time = audio.currentTime;
  const cue = guidedCues.find(value => time >= value.s && time < value.e);
  if (!cue) return;
  const total = Math.max(1, Number(content?.training?.defaultReps) || guidedCues.filter(value => value.i === cue.i).length);
  const sentence = Number(cue.i) + 1;
  const count = Number(cue.r) || 1;
  const phase = time < cue.voiceEnd ? ui('Listen', '듣기') : ui('Speak', '따라 말하기');
  const next = `${ui("Sentence", "문장")} ${sentence}/${content.expressions?.length || sentence} · ${phase} ${count}/${total}`;
  if (guidedProgress.textContent !== next) guidedProgress.textContent = next;
});
audio.addEventListener('seeking', () => { if (!guidedInternalSeek) { cancelGuidedHold(); guidedProcessed.clear(); } });
audio.addEventListener('seeked', () => { guidedInternalSeek = false; guidedPreviousTime = audio.currentTime; });
audio.addEventListener('pause', () => {
  if (!guidedHold && guidedCues.length) try { memberState.setItem(guidedKey('position'), String(audio.currentTime)); } catch {}
});
audio.addEventListener('ended', () => {
  cancelGuidedHold(); guidedProcessed.clear();
  if (guidedCues.length && currentVariant === 'main' && !guidedDone && guidedCompletion && !guidedCompletion.disabled) guidedCompletion.click();
  if (guidedCues.length) try { memberState.removeItem(guidedKey('position')); } catch {}
  if (vocalStep < 0) document.querySelector('#play-status').textContent = ui('Playback finished', '재생이 끝났어요');
});
addEventListener('pagehide', () => {
  cancelGuidedHold();
  if (guidedCues.length && !audio.ended) try { memberState.setItem(guidedKey('position'), String(audio.currentTime)); } catch {}
});

function stopVocal() {
  vocalRun++;
  vocalCues?.stop();
  clearTimeout(vocalTimer);
  vocalTimer = 0;
  vocalWaiting = false;
  vocalStep = -1;
  audio.pause();
  clips.querySelectorAll('button[data-step]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}

function vocalStatus() {
  const node = document.querySelector('#play-status');
  if (vocalStep < 0) return;
  const count = vocalCounts[vocalStep] || 0;
  node.textContent = vocalWaiting
    ? ui(`Step ${vocalStep + 1} · Speak the whole passage during the pause · ${count}/${vocalTarget}`, `${vocalStep + 1}단계 · 쉬는 동안 누적 이야기 전체를 말해 보세요 · ${count}/${vocalTarget}`)
    : ui(`Step ${vocalStep + 1} · Listen ${Math.min(count + 1, vocalTarget)}/${vocalTarget}`, `${vocalStep + 1}단계 · 듣기 ${Math.min(count + 1, vocalTarget)}/${vocalTarget}`);
}

async function startVocalStep(index, run = null) {
  if (!vocalSteps[index]) return;
  const fromTap = run === null;
  if (fromTap) { stopVocal(); run = vocalRun; }
  vocalStep = index;
  vocalWaiting = false;
  const step = vocalSteps[index];
  try {
    const cue = fromTap ? vocalCues?.start() : null;
    await Promise.all([cue, selectClip(step.variant, ui(`Step ${index + 1} · Listen ${vocalCounts[index] + 1}/${vocalTarget}`, `${index + 1}단계 · 듣기 ${vocalCounts[index] + 1}/${vocalTarget}`), false, run)]);
    if (run !== vocalRun) return;
    for (const button of clips.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index));
    }
    await audio.play();
  } catch {
    if (run === vocalRun) { stopVocal(); document.querySelector('#play-status').textContent = ui('Playback paused. Tap the step to try again.', '재생이 멈췄어요. 해당 단계를 눌러 다시 시작해 주세요.'); }
  }
}

audio.addEventListener('timeupdate', () => {
  const step = vocalSteps[vocalStep];
  if (!step?.embeddedTiming || audio.paused || audio.seeking) return;
  const timing = step.embeddedTiming;
  const target = Math.max(3, timing.speech * (step.pauseRatio || 2.5));
  // Shorten only the recorded silence; never change speech speed.
  if (target < timing.gap && audio.currentTime >= timing.voiceEnd + target && audio.currentTime < audio.duration - 0.06) {
    audio.currentTime = Math.max(0, audio.duration - 0.04);
  }
});

audio.addEventListener('ended', () => {
  if (vocalStep < 0 || !vocalSteps[vocalStep]) return;
  const index = vocalStep;
  const run = vocalRun;
  vocalCounts[index] = Math.min(vocalTarget, vocalCounts[index] + 1);
  try { memberState.setItem(`talktag-vocal-preview:${cardId}`, JSON.stringify(vocalCounts)); } catch {}
  const button = clips.querySelector(`[data-step="${index}"]`);
  if (button) paintVocalButton(button, index);
  const duration = Number(audio.duration) || Number(vocalSteps[index].duration) || 1;
  const step = vocalSteps[index];
  const gap = step.embeddedTiming
    ? Math.max(0, Math.round((Math.max(3, step.embeddedTiming.speech * (step.pauseRatio || 2.5)) - step.embeddedTiming.gap) * 1000))
    : step.pauseIncluded ? 0 : Math.max(3000, Math.round(duration * (step.pauseRatio || 2.5) * 1000));
  vocalWaiting = gap > 0;
  vocalStatus();
  vocalTimer = setTimeout(async () => {
    if (run !== vocalRun) return;
    vocalWaiting = false;
    if (vocalCounts[index] < vocalTarget) startVocalStep(index, run);
    else if (vocalSteps[index + 1]) startVocalStep(index + 1, run);
    else {
      if (vocalCues && vocalCounts.every(count => count >= vocalTarget)) {
        await vocalCues.end();
        if (run !== vocalRun) return;
      }
      stopVocal();
      refreshVocalStage();
      document.querySelector('#play-status').textContent = ui(`All ${vocalSteps.length} cumulative steps complete. Continue to speaking and writing.`, `누적 ${vocalSteps.length}단계를 마쳤어요. 말하고 쓰기로 이어가세요.`);
    }
  }, gap);
});

function paragraph(text, secondary) {
  const p = document.createElement('p');
  p.textContent = text;
  if (secondary) p.className = 'secondary';
  return p;
}

function mountCompletion() {
  if (otherCompletion) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'completion-button';
  button.textContent = ui('Mark mission complete', '미션 완료로 표시');
  button.addEventListener('click', async () => {
    if (!signedInUserId) return;
    button.disabled = true;
    const next = !button.dataset.completed;
    const query = client.from('learning_progress');
    const result = next
      ? await query.insert({ user_id: signedInUserId, lesson_id: cardId })
      : await query.delete().eq('user_id', signedInUserId).eq('lesson_id', cardId);
    button.disabled = false;
    if (result.error && !(next && result.error.code === '23505')) {
      status.hidden = false;
      status.textContent = ui('Completion could not be saved. Please try again.', '완료 상태를 저장하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    if (next) button.dataset.completed = 'true';
    else delete button.dataset.completed;
    button.textContent = next ? ui('✓ Completed · Undo', '✓ 완료 · 취소') : ui('Mark mission complete', '미션 완료로 표시');
  });
  document.querySelector('.card-body').append(button);
  otherCompletion = button;
}

function safeArtwork(value) {
  if (typeof value !== 'string') return null;
  const url = new URL(value, location.origin);
  return url.origin === location.origin && /\.(?:png|jpe?g|webp|svg)$/i.test(url.pathname)
    ? url.href : null;
}

// Older Guided L&R lessons store their scene image by card ID rather than in
// the lesson catalog. Preserve that existing artwork in the protected player.
function guidedArtwork(content) {
  if (content.type !== 'guided' || typeof content.id !== 'string') return null;
  const id = content.id;
  const native = /^(?:ko|ja)-guided-(a1|a2|b1|b2|c1|c2)-001(?:-part\d+)?$/.exec(id);
  if (native) return `/assets/glr-scenes/native-001-${native[1]}.webp`;
  const miniskit = /^guided-(a2|b1|b2|c1|c2)-(08|09|10)-miniskit(?:-part\d+)?$/.exec(id);
  if (miniskit) return `/assets/glr-scenes/miniskit/${miniskit[2].padStart(3, '0')}-${miniskit[1]}.jpg`;
  if (!/^guided-(?:a1|a2|b1|b2|c1|c2)-\d{2}(?:-part\d+|-miniskit(?:-pilot)?)?$/.test(id)) return null;
  const base = id.replace(/-(?:miniskit-pilot|miniskit)$/, '');
  const extension = /(?:07|08|09|10)(?:-miniskit-pilot|-miniskit)?$/.test(id) ? 'jpg' : 'webp';
  return `/assets/glr-scenes/${base}.${extension}`;
}

async function request(path, body) {
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error('denied');
  const response = await fetch(`${workerOrigin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body), cache: 'no-store'
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'denied' : String(response.status));
  return response.json();
}

async function selectClip(variant, label, preservePosition = true, expectedVocalRun = null) {
  const ticket = await request('/api/media-ticket', { cardId, variant });
  if (expectedVocalRun !== null && expectedVocalRun !== vocalRun) return;
  if (!ticket?.url) throw new Error('missing_media');
  ticketExpiresAt = Number(ticket.expiresAt) * 1000 || 0;
  const stored = memberState && !content?.lesson && !guidedCues.length ? Number(memberState.getItem(`audio-position:${variant}`)) || 0 : 0;
  const resume = preservePosition && currentVariant === variant ? audio.currentTime : stored;
  if (currentVariant !== variant) lastProgressTime = 0;
  currentVariant = variant;
  audio.src = ticket.url;
  updateScriptHighlight(true);
  if (resume > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = resume; }, { once: true });
  document.querySelector('#play-status').textContent = label;
  for (const button of clips.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.step !== undefined ? Number(button.dataset.step) === vocalStep : button.dataset.variant === variant));
  }
}

async function renewExpiredAudio() {
  if (renewing || reconnecting || !content || !ticketExpiresAt || Date.now() < ticketExpiresAt - 10_000) return;
  renewing = true;
  const wasPlaying = !audio.paused;
  try {
    await selectClip(currentVariant, ui('Refreshing audio…', '음원을 연결하고 있어요…'));
    if (wasPlaying) await audio.play();
    document.querySelector('#play-status').textContent = wasPlaying ? ui('Playing', '재생 중') : ui('Ready to play', '재생 준비 완료');
  } catch {
    document.querySelector('#play-status').textContent = ui('Audio could not reconnect. Please try playing again.', '음원을 연결하지 못했어요. 재생 버튼을 다시 눌러 주세요.');
  } finally {
    renewing = false;
  }
}

audio.addEventListener('play', () => {
  if (vocalStep < 0 && !renewing) document.querySelector('#play-status').textContent = ui('Playing', '재생 중');
  void renewExpiredAudio();
});
audio.addEventListener('waiting', renewExpiredAudio);
audio.addEventListener('stalled', renewExpiredAudio);

audio.addEventListener('error', async () => {
  if (reconnecting || !content) return;
  const now = Date.now();
  if (now - retryWindowStarted > 30_000) {
    retryWindowStarted = now;
    audioRetry = 0;
  }
  if (audioRetry++ >= 2) {
    document.querySelector('#play-status').textContent = ui('Audio could not play. Please reopen this card.', '음원을 재생하지 못했어요. 카드를 다시 열어 주세요.');
    return;
  }
  reconnecting = true;
  try {
    await selectClip(currentVariant, ui('Reconnecting audio…', '음원을 다시 연결하고 있어요…'));
    await audio.play();
  } catch {
    document.querySelector('#play-status').textContent = ui('Audio could not play. Please reopen this card.', '음원을 재생하지 못했어요. 카드를 다시 열어 주세요.');
  } finally {
    reconnecting = false;
  }
});

audio.addEventListener('timeupdate', () => {
  if (audio.currentTime > lastProgressTime + 1) {
    lastProgressTime = audio.currentTime;
    if (Date.now() - retryWindowStarted > 30_000) audioRetry = 0;
  }
  // Long cards can outlive a five-minute ticket while playing continuously.
  if (ticketExpiresAt && Date.now() >= ticketExpiresAt - 10_000) void renewExpiredAudio();
});

function renderLines(lines, meanings = [], speakers = [], readings = [], lineVariants = [], withFurigana = cardLanguage === 'ja') {
  lessonText.replaceChildren();
  lineClipIndices.clear();
  lessonText.classList.toggle('is-synchronized', lines.length > 3 &&
    (scriptCuesByVariant.size > 0 || lineVariants.some(value => /^clip_\d{3}$/.test(value || ''))));
  lines.forEach((line, index) => {
    const primary = paragraph('');
    primary.dataset.lineIndex = String(index);
    if (speakers[index]) primary.append(document.createTextNode(`${speakers[index]}: `));
    primary.append(withFurigana ? japaneseWithFurigana(line, readings[index]) : document.createTextNode(line));
    if (/^clip_\d{3}$/.test(lineVariants[index] || '')) {
      lineClipIndices.set(lineVariants[index], index);
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'line-play';
      play.textContent = ui('Play line', '문장 듣기');
      play.setAttribute('aria-label', ui(`Play line ${index + 1}`, `${index + 1}번 문장 듣기`));
      play.addEventListener('click', async () => {
        if (vocalSteps.length) stopVocal();
        audioRetry = 0;
        try {
          await selectClip(lineVariants[index], ui(`Line ${index + 1} of ${lines.length}`, `문장 ${index + 1}/${lines.length}`));
          await audio.play();
        } catch { document.querySelector('#play-status').textContent = ui('This line could not load.', '이 문장을 불러오지 못했어요.'); }
      });
      primary.append(play);
    }
    lessonText.append(primary);
    if (showMeaning && meanings[index]) {
      const meaning = paragraph(meanings[index], true);
      meaning.dataset.lineIndex = String(index);
      lessonText.append(meaning);
    }
  });
  lessonText.hidden = !showScript && !showMeaning;
  updateScriptChoice();
  updateScriptHighlight(true);
}

function mountKoreanMeaningChoice(item, lines, english, translations, repaint) {
  if (item.language !== 'ko' || !translations || typeof translations !== 'object') return () => english;
  const names = { en: 'English', vi: 'Tiếng Việt', ne: 'नेपाली', km: 'ខ្មែរ', my: 'မြန်မာ', th: 'ไทย', ja: '日本語' };
  const options = Object.keys(names).filter(code => {
    const values = code === 'en' ? english : translations[code];
    return Array.isArray(values) && values.length === lines.length && values.every(value => typeof value === 'string' && value.trim());
  });
  if (options.length < 2) return () => english;
  const label = document.createElement('label');
  label.className = 'translation-choice';
  label.textContent = 'Meaning language';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Meaning language');
  options.forEach(code => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = names[code];
    select.append(option);
  });
  select.addEventListener('change', repaint);
  label.append(select);
  document.querySelector('#text-actions').append(label);
  return () => select.value === 'en' ? english : translations[select.value];
}

function renderSound(item) {
  const lines = Array.isArray(item.expressions) ? item.expressions : [];
  const meanings = Array.isArray(item.meanings) ? item.meanings : [];
  const speakers = Array.isArray(item.speakers) ? item.speakers : [];
  const readings = Array.isArray(item.readings) ? item.readings : [];
  registerScriptCues('main', item.training?.cues, lines.map((_, index) => index));
  const selectedMeaning = mountKoreanMeaningChoice(item, lines, meanings, item.translations,
    () => { if (showMeaning) renderLines(lines, selectedMeaning(), speakers, readings); });
  document.querySelector('#audio-section').hidden = false;
  document.querySelector('#text-actions').hidden = !lines.length;
  meaningButton.hidden = !meanings.length;
  scriptButton.addEventListener('click', () => {
    showScript = true;
    showMeaning = false;
    renderLines(lines, selectedMeaning(), speakers, readings);
  });
  meaningButton.addEventListener('click', () => {
    showMeaning = true;
    showScript = false;
    renderLines(lines, selectedMeaning(), speakers, readings);
  });
  renderLines(lines, selectedMeaning(), speakers, readings);
  // Mini Talks can carry cue timing for display, but they do not use Guided
  // repetition cycles or the adjustable speaking-pause player.
  const repeatLabel = wholeRepeat.closest('label');
  repeatLabel.hidden = false;
  if (item.area === 'guided-listen-repeat' || item.type === 'guided') {
    const buttons = playToggle.parentElement;
    buttons.classList.add('practice-buttons--compact');
    const playback = document.createElement('div');
    playback.className = 'practice-playback-group';
    playback.setAttribute('role', 'group');
    playback.setAttribute('aria-label', ui('Audio playback', '음원 재생 조작'));
    playback.append(rewind, playToggle, replay);
    wholeRepeat.setAttribute('aria-label', ui('Repeat whole audio', '전체 반복'));
    repeatLabel.querySelector('span').textContent = ui('Loop', '전체 반복');
    buttons.append(playback, repeatLabel);
    mountGuidedControls(item);
  }
  const prompt = item.tinyPrompt || item.variationPrompt?.ko || item.variationPrompt?.en;
  if (prompt) {
    const node = document.querySelector('#prompt');
    node.textContent = prompt;
    node.hidden = false;
  }
  if (item.area === 'mini-talks' || item.type === 'plain') mountCompletion();
  return selectClip('main', ui('Ready to play', '재생 준비 완료'));
}

// Original pre-migration Boot Camp components, with protected media handlers retained.
function mountCampTemplate(kind) {
  document.body.dataset.camp = kind;
  const sheet = document.createElement('link'); sheet.rel = 'stylesheet';
  sheet.href = '/bootcamp-restored.css?v=20261102-vocal-controls'; document.head.append(sheet);
  document.querySelector('.card-body').classList.add('pilot-card', 'is-active');
  const brand = document.querySelector('.brand strong');
  if (brand) brand.textContent = kind === 'vocal' ? ui('Vocal Camp', '보컬 캠프') : ui('Story Camp', '스토리 캠프');
}
function paintVocalButton(button, index) {
  button.classList.add('sound-step');
  const shape = document.createElement('span'); shape.className = 'sound-shape'; shape.setAttribute('aria-hidden', 'true');
  for (let i = 0; i <= index; i++) shape.append(document.createElement('i'));
  const label = document.createElement('strong');
  label.textContent = index === 0 ? ui('Unit 1', '의미 단위 1') : ui(`Units 1–${index + 1}`, `1–${index + 1} 누적`);
  const count = document.createElement('small'); count.textContent = `${vocalCounts[index]} / ${vocalTarget}`;
  const icon = document.createElement('em'); icon.textContent = vocalCounts[index] >= vocalTarget ? '✓' : '▶';
  icon.setAttribute('aria-hidden', 'true');
  button.classList.toggle('is-complete', vocalCounts[index] >= vocalTarget);
  button.replaceChildren(shape, label, count, icon);
}

function renderVocal(item) {
  mountCampTemplate('vocal');
  const lesson = item.lesson || {};
  const lines = Array.isArray(lesson.lines)
    ? lesson.lines.map(line => typeof line === 'string' ? line : line?.text || '') : [];
  const meanings = Array.isArray(lesson.translation) ? lesson.translation
    : Array.isArray(lesson.meanings) ? lesson.meanings : [];
  const lineVariants = Array.isArray(lesson.lines)
    ? lesson.lines.map(line => typeof line === 'object' ? line?.variant : null) : [];
  const readings = Array.isArray(lesson.readings) ? lesson.readings : [];
  const lineIds = Array.isArray(lesson.lines)
    ? lesson.lines.map(line => typeof line === 'object' ? line?.id : null) : [];
  const rawSteps = Array.isArray(lesson.steps) ? lesson.steps : [];
  for (const step of rawSteps) {
    for (const clip of step.variants || []) registerScriptCues(clip.variant, clip.cues, lineIds);
  }
  for (const step of Array.isArray(lesson.audioSteps) ? lesson.audioSteps : []) {
    registerScriptCues(step.variant, step.cues, lineIds);
  }
  const selectedMeaning = mountKoreanMeaningChoice(item, lines, meanings, lesson.translations,
    () => { if (showMeaning) renderLines(lines, selectedMeaning(), [], readings, lineVariants); });
  document.querySelector('#audio-section').hidden = false;
  document.querySelector('#text-actions').hidden = !lines.length;
  meaningButton.hidden = !meanings.length;
  scriptButton.addEventListener('click', () => { showScript = true; showMeaning = false; renderLines(lines, selectedMeaning(), [], readings, lineVariants); });
  meaningButton.addEventListener('click', () => { showMeaning = true; showScript = false; renderLines(lines, selectedMeaning(), [], readings, lineVariants); });
  renderLines(lines, selectedMeaning(), [], readings, lineVariants);
  const steps = Array.isArray(lesson.audioSteps) ? lesson.audioSteps
    : Array.isArray(lesson.steps) ? lesson.steps.map(step => ({
      step: step.step,
      variant: step.variants?.find(clip => clip.ratio === 2.5)?.variant
        || step.variants?.[0]?.variant,
      pauseIncluded: true
    })) : [];
  // Legacy audioSteps contain a baked-in 2.5x pause, not speech-only audio.
  const timingKey = `${item.language}:${Number(item.ordinal || cardId.match(/camp-(\d+)/)?.[1])}:${item.level}`;
  if (Array.isArray(lesson.audioSteps)) steps.forEach((step, index) => {
    step.embeddedTiming = vocalPauseTimings[timingKey]?.[index];
    step.pauseIncluded = true;
  });
  let vocalPause = 2.5;
  const pausePanel = document.createElement('label'); pausePanel.className = 'camp-pause';
  const pauseTitle = document.createElement('span'); pauseTitle.textContent = ui('Speaking pause', '말하기 간격');
  const pauseValue = document.createElement('strong'); pauseValue.textContent = '2.5×';
  const pauseRange = document.createElement('input'); pauseRange.type = 'range'; pauseRange.min = '2'; pauseRange.max = '3.5'; pauseRange.step = '0.5'; pauseRange.value = '2.5';
  pauseRange.setAttribute('aria-label', ui('Speaking pause', '말하기 간격'));
  pauseRange.addEventListener('input', () => {
    stopVocal(); vocalPause = Number(pauseRange.value); pauseValue.textContent = `${vocalPause}×`;
    steps.forEach((step, index) => {
      const variant = rawSteps[index]?.variants?.find(clip => Number(clip.ratio) === vocalPause);
      if (variant) step.variant = variant.variant;
      step.pauseRatio = vocalPause;
    });
  });
  const marks = document.createElement('div'); marks.className = 'vocal-pause-marks';
  for (const value of ['2.0×', '2.5×', '3.0×', '3.5×']) { const mark = document.createElement('span'); mark.textContent = value; marks.append(mark); }
  const hint = document.createElement('small'); hint.textContent = ui('Pause after the whole passage. The voice stays at its natural speed.', '누적 이야기 전체가 끝난 뒤 말해 보세요. 음성 속도는 그대로 유지됩니다.');
  pausePanel.append(pauseTitle, pauseValue, pauseRange, marks, hint); clips.before(pausePanel);
  clips.classList.add('sound-ladder');
  clips.after(document.querySelector('#play-status'));
  vocalSteps = steps;
  vocalTarget = /^A[12]$/.test(item.level) ? 10 : /^B[12]$/.test(item.level) ? 12 : 15;
  vocalCounts = steps.map(() => 0);
  try {
    const saved = JSON.parse(memberState.getItem(`talktag-vocal-preview:${cardId}`) || 'null');
    if (Array.isArray(saved) && saved.length === steps.length) {
      vocalCounts = saved.map(value => Math.max(0, Math.min(vocalTarget, Math.floor(Number(value) || 0))));
    }
  } catch {}
  clips.hidden = false;
  for (const [index, step] of steps.entries()) {
    if (!/^clip_\d{3}$/.test(step.variant)) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variant = step.variant;
    button.dataset.step = String(index);
    paintVocalButton(button, index);
    button.setAttribute('aria-label', ui(`Start cumulative step ${step.step}, ${vocalTarget} listens and speaking pauses`, `누적 ${step.step}단계 시작, ${vocalTarget}회 듣고 말하기`));
    button.addEventListener('click', () => {
      audioRetry = 0;
      if (vocalStep === index) {
        stopVocal();
        document.querySelector('#play-status').textContent = ui(`Step ${step.step} stopped. Tap again to continue from ${vocalCounts[index]}/${vocalTarget}.`, `${step.step}단계가 멈췄어요. 다시 누르면 ${vocalCounts[index]}/${vocalTarget}회부터 이어갑니다.`);
        button.setAttribute('aria-pressed', 'false');
        return;
      }
      if (vocalCounts[index] >= vocalTarget) {
        if (vocalCounts.every(count => count >= vocalTarget)) vocalCues?.reset();
        vocalCounts[index] = 0;
        paintVocalButton(button, index);
      }
      startVocalStep(index);
    });
    clips.append(button);
  }
  const followup = document.createElement('section');
  followup.className = 'camp-followup';
  const koreanLearning = item.language === 'ko';
  const prompts = koreanLearning ? [
    ['2 · SAY & WRITE', 'Say the whole Korean story from memory, then write what you remember. Open the script only after trying.'],
    ['3 · MY STORY', 'Keep the situation, but change the people, place, choice, and result to fit your experience.'],
    ['4 · SHARE', 'Close your notes and tell your version to a partner.']
  ] : [
    ['2 · 말하고 쓰기', '전체 이야기를 기억해서 말한 뒤 적어 보세요. 먼저 해 본 다음 원문을 확인하세요.'],
    ['3 · 나의 이야기', '이야기의 흐름은 유지하고 인물, 장소, 선택과 결과를 내 경험에 맞게 바꿔 보세요.'],
    ['4 · 나누기', '노트를 덮고 내가 만든 이야기를 파트너에게 자연스럽게 전해 보세요.']
  ];
  const stageKey = `talktag-vocal-preview:${cardId}:stage`;
  let stage = 0;
  try { stage = Math.max(0, Math.min(3, Number(memberState.getItem(stageKey)) || 0)); } catch {}
  const trainingComplete = () => vocalCounts.length > 0 && vocalCounts.every(count => count >= vocalTarget);
  if (!trainingComplete()) stage = 0;
  const heading = document.createElement('h2');
  const meter = document.createElement('progress'); meter.max = 4; meter.className = 'camp-progress'; meter.setAttribute('aria-label', ui('Practice progress', '훈련 진행'));
  const instruction = paragraph(''); instruction.className = 'card-guide';
  const stageLabel = paragraph(''); stageLabel.className = 'card-label';
  const stageCount = document.createElement('div'); stageCount.className = 'pilot-status';
  const writing = document.createElement('textarea');
  writing.rows = 6;
  writing.setAttribute('aria-label', ui('Your story notes', '내 이야기 노트'));
  const navigation = document.createElement('div');
  navigation.className = 'guided-navigation';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = ui('← Previous', '← 이전');
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = ui('Next step →', '다음 단계 →');
  const menu = document.createElement('details'); menu.className = 'camp-menu';
  const menuTitle = document.createElement('summary'); menuTitle.textContent = '•••'; menuTitle.setAttribute('aria-label', ui('Learning menu', '학습 메뉴'));
  menu.append(menuTitle);
  const restart = document.createElement('button'); restart.type = 'button'; restart.textContent = ui('Back to listening', '듣기 단계로');
  restart.addEventListener('click', () => { saveNotes(); stopVocal(); stage = 0; paintStage(); menu.open = false; });
  menu.append(restart);
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'pilot-reset-button'; reset.textContent = ui('↻ Reset', '↻ 초기화');
  reset.addEventListener('click', () => { stopVocal(); vocalCues?.reset(); vocalCounts.fill(0); stage = 0;
    try { memberState.setItem(`talktag-vocal-preview:${cardId}`, JSON.stringify(vocalCounts)); } catch {}
    clips.querySelectorAll('button[data-step]').forEach((button, index) => { paintVocalButton(button, index); button.setAttribute('aria-pressed', 'false'); }); paintStage(); });
  navigation.append(menu, previous, next, reset);
  followup.append(stageLabel, heading, instruction, writing);
  card.before(stageCount, meter);
  document.body.append(navigation);
  document.querySelector('#audio-section').before(followup);
  followup.classList.add('camp-deck');
  navigation.classList.add('camp-deck-navigation');
  mountCompletion();
  const saveNotes = () => {
    if (stage === 1 || stage === 2) try { memberState.setItem(`${stageKey}:notes:${stage}`, writing.value); } catch {}
  };
  writing.addEventListener('input', saveNotes);
  const paintStage = () => {
    document.querySelector('#audio-section').hidden = stage !== 0;
    document.querySelector('#text-actions').hidden = stage > 1 || !lines.length;
    lessonText.hidden = stage > 1 || (!showScript && !showMeaning);
    meter.value = stage + 1;
    stageCount.textContent = `${stage + 1} / 4`;
    stageLabel.textContent = ['1 · SOUND', '2 · SAY & WRITE', '3 · MY STORY', '4 · SHARE'][stage];
    heading.textContent = stage === 0 ? ui('Build the story through sound', '소리가 조금씩 자랍니다') : [
      ui('Speak first, then write it down.', '이제 휴대폰을 내려놓으세요'),
      ui('Make the same flow your own', '같은 흐름을 나의 이야기로'),
      ui('Tell a partner your story', '파트너에게 이야기해 주세요')
    ][stage - 1];
    instruction.textContent = stage === 0
      ? ui(`Listen and repeat ${steps.length} meaning units. Each stage starts again and adds one unit.`, `의미 단위 ${steps.length}개를 하나씩 더하며 누적해 듣고 따라 말해 보세요.`)
      : prompts[stage - 1][1];
    writing.hidden = stage !== 1 && stage !== 2;
    writing.value = '';
    if (!writing.hidden) try { writing.value = memberState.getItem(`${stageKey}:notes:${stage}`) || ''; } catch {}
    previous.disabled = stage === 0;
    next.hidden = stage === 3;
    next.disabled = stage === 0 && !trainingComplete();
    otherCompletion.hidden = stage !== 3;
    try { memberState.setItem(stageKey, String(stage)); } catch {}
  };
  previous.addEventListener('click', () => { saveNotes(); stage = Math.max(0, stage - 1); paintStage(); });
  next.addEventListener('click', () => {
    if (stage === 0 && !trainingComplete()) return;
    saveNotes(); stopVocal(); stage = Math.min(3, stage + 1); paintStage();
  });
  refreshVocalStage = paintStage;
  paintStage();
  if (steps[0]) return selectClip(steps[0].variant, ui(`Ready · ${steps.length} cumulative steps, ${vocalTarget} repetitions each`, `준비 완료 · 누적 ${steps.length}단계, 단계마다 ${vocalTarget}회`));
}

function addReadingSteps(item) {
  const section = document.querySelector('#reading-steps');
  const learnerKorean = item.language === 'ko';
  const steps = learnerKorean ? [
    ['1. Read the story', 'Read the Korean story first. Open English support only when you need it.'],
    ['2. Recall & Summary', 'The story is hidden. Write what you remember in Korean.'],
    ['3. Revise & Polish', 'Keep your first draft and write a clearer version. AI feedback is coming soon.'],
    ['4. Retell', 'Keep the story hidden and tell it aloud in your own Korean.'],
    ['5. Discuss', 'Discuss with AI — coming soon.']
  ] : [
    ['1. 이야기 읽기', '먼저 영어 이야기를 읽어 보세요. 필요할 때만 한국어 뜻을 확인하세요.'],
    ['2. 기억해서 요약하기', '이야기를 덮고 기억나는 내용을 영어로 적어 보세요.'],
    ['3. 글 다듬기', '첫 번째 글을 보관하면서 더 자연스럽게 고쳐 보세요. AI 피드백은 준비 중입니다.'],
    ['4. 내 말로 이야기하기', '이야기를 덮고 내 말로 영어로 다시 말해 보세요.'],
    ['5. AI와 토론하기', 'AI 토론은 준비 중입니다.']
  ];
  const panels = [];
  const drafts = [];
  let stage = 0;
  let readingDone = false;
  let readingCompletion;
  const savedStageKey = `talktag-readable-preview:${cardId}:stage`;
  try { stage = Math.max(0, Math.min(4, Number(memberState.getItem(savedStageKey)) || 0)); } catch {}
  const completionLabel = () => {
    if (readingCompletion) readingCompletion.textContent = readingDone ? ui('✓ Practice complete · Undo', '✓ 연습 완료 · 취소') : ui('Mark practice complete', '연습 완료로 표시');
  };
  const loadCompletion = async () => {
    const { data, error } = await client.from('learning_progress')
      .select('lesson_id').eq('user_id', signedInUserId).eq('lesson_id', cardId).maybeSingle();
    if (error) return;
    readingDone = Boolean(data);
    if (!readingDone && stage === 4) stage = 3;
    completionLabel();
    paintStage();
  };
  const paintStage = () => {
    panels.forEach((panel, index) => { panel.hidden = index !== stage; });
    lessonText.hidden = stage !== 0;
    document.querySelector('#text-actions').hidden = stage !== 0 || !item.paragraphs?.length;
    const original = section.querySelector('[data-original-draft]');
    const notes = section.querySelector('[data-retell-notes]');
    if (original) original.textContent = drafts[0]?.value || '';
    if (notes) notes.textContent = drafts[1]?.value || drafts[0]?.value || '';
    try { memberState.setItem(savedStageKey, String(stage)); } catch {}
  };
  const go = index => { stage = index; paintStage(); section.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  steps.forEach(([name, description], index) => {
    const block = document.createElement('section');
    block.hidden = true;
    const heading = document.createElement('h2'); heading.textContent = name;
    block.append(heading, paragraph(description));
    if (index === 1 || index === 2) {
      if (index === 2) {
        const original = paragraph('');
        original.dataset.originalDraft = '';
        original.className = 'reading-draft';
        block.append(paragraph(ui('Original draft', '처음 쓴 글')), original);
      }
      const textarea = document.createElement('textarea');
      textarea.setAttribute('aria-label', name);
      textarea.placeholder = ui('Write your thoughts here…', '생각을 적어 보세요…');
      const draftKey = `talktag-readable-preview:${cardId}:step-${index + 1}`;
      try { textarea.value = memberState.getItem(draftKey) || ''; } catch {}
      textarea.addEventListener('input', () => {
        try { memberState.setItem(draftKey, textarea.value); } catch {}
      });
      block.append(textarea);
      drafts[index - 1] = textarea;
    }
    if (index === 3) {
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.textContent = ui('Show my notes', '내 노트 보기'); toggle.setAttribute('aria-expanded', 'false');
      const notes = paragraph(''); notes.dataset.retellNotes = ''; notes.className = 'reading-draft'; notes.hidden = true;
      toggle.addEventListener('click', () => {
        notes.hidden = !notes.hidden;
        toggle.textContent = notes.hidden ? ui('Show my notes', '내 노트 보기') : ui('Hide my notes', '내 노트 숨기기');
        toggle.setAttribute('aria-expanded', String(!notes.hidden));
      });
      block.append(toggle, notes);
    }
    if (index > 0) {
      const previous = document.createElement('button');
      previous.type = 'button'; previous.textContent = ui('← Previous step', '← 이전 단계');
      previous.addEventListener('click', () => go(index - 1));
      block.append(previous);
    }
    if (index < 3) {
      const next = document.createElement('button');
      next.type = 'button'; next.textContent = index === 0 ? ui('Hide story & recall →', '이야기 덮고 기억하기 →') : ui('Next step →', '다음 단계 →');
      next.addEventListener('click', () => go(index + 1));
      block.append(next);
    } else if (index === 3) {
      const complete = document.createElement('button');
      complete.type = 'button'; complete.className = 'completion-button';
      readingCompletion = complete;
      completionLabel();
      complete.addEventListener('click', async () => {
        if (!signedInUserId) return;
        complete.disabled = true;
        const next = !readingDone;
        const query = client.from('learning_progress');
        const result = next
          ? await query.insert({ user_id: signedInUserId, lesson_id: cardId })
          : await query.delete().eq('user_id', signedInUserId).eq('lesson_id', cardId);
        complete.disabled = false;
        if (result.error && !(next && result.error.code === '23505')) {
          status.hidden = false;
          status.textContent = ui('Completion could not be saved. Please try again.', '완료 상태를 저장하지 못했어요. 다시 시도해 주세요.');
          return;
        }
        readingDone = next;
        completionLabel();
        if (next) go(4);
      });
      block.append(complete);
    } else {
      const back = document.createElement('a');
      back.href = document.querySelector('#back').href;
      back.textContent = ui('← Back to level cards', '← 레벨 카드로');
      block.append(back);
    }
    section.append(block);
    panels.push(block);
  });
  section.hidden = false;
  paintStage();
  void loadCompletion();
}

function renderText(item) {
  let lines = [];
  let meanings = [];
  let readings = [];
  if (Array.isArray(item.paragraphs)) {
    const primary = item.language === 'ko' ? 'ko' : 'en';
    const secondary = primary === 'ko' ? 'en' : 'kr';
    lines = item.paragraphs.map(p => p[primary] || '');
    meanings = item.paragraphs.map(p => p[secondary] || p.ko || '');
  } else if (Array.isArray(item.story?.lines)) {
    lines = item.story.lines;
    meanings = item.story.translation || item.story.meanings || [];
    readings = item.story.readings || [];
  }
  showScript = true;
  const story = item.area === 'story-camp' || item.type === 'story';
  const selectedMeaning = mountKoreanMeaningChoice(item, lines, meanings,
    story ? item.story?.translations : item.translations, () => paint());
  let storyStage = 0;
  const storyKey = `talktag-story-preview:${cardId}`;
  if (story && lines.length) {
    try { storyStage = Math.max(0, Math.min(lines.length + 3, Number(memberState.getItem(storyKey)) || 0)); } catch {}
  }
  const japaneseStory = story && item.language === 'ja';
  let storyView = 'original';
  const paint = () => {
    if (story && storyStage >= lines.length) {
      lessonText.hidden = true;
      document.querySelector('#text-actions').hidden = true;
      return;
    }
    if (story) document.querySelector('#text-actions').hidden = !meanings.length;
    const count = story ? storyStage + 1 : lines.length;
    if (japaneseStory) {
      const source = storyView === 'meaning' ? meanings : lines;
      renderLines(source.slice(0, count), [], [], storyView === 'reading' ? readings.slice(0, count) : [], [], storyView === 'reading');
      lessonText.hidden = false;
      hideScriptButton.setAttribute('aria-pressed', String(storyView === 'original'));
      scriptButton.setAttribute('aria-pressed', String(storyView === 'reading'));
      meaningButton.setAttribute('aria-pressed', String(storyView === 'meaning'));
      return;
    }
    renderLines(lines.slice(0, count), selectedMeaning().slice(0, count), [], readings.slice(0, count));
  };
  paint();
  document.querySelector('#text-actions').hidden = !meanings.length;
  scriptButton.hidden = !japaneseStory || !readings.length;
  hideScriptButton.hidden = !japaneseStory;
  meaningButton.hidden = !meanings.length;
  if (japaneseStory) {
    hideScriptButton.textContent = '일본어';
    scriptButton.textContent = '후리가나';
    meaningButton.textContent = '한국어 뜻';
    for (const [button, view] of [[hideScriptButton, 'original'], [scriptButton, 'reading'], [meaningButton, 'meaning']]) {
      button.addEventListener('click', () => { storyView = view; showScript = true; paint(); });
    }
  } else {
    meaningButton.addEventListener('click', () => { showMeaning = !showMeaning; paint(); });
  }
  if (story && lines.length) {
    mountCampTemplate('story');
    const steps = document.querySelector('#reading-steps');
    steps.hidden = false;
    steps.classList.add('story-steps');
    const heading = document.createElement('h2');
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', ui('Cumulative story steps', '누적 이야기 단계'));
    const activities = item.language === 'ko' ? [
      ['Rewrite the whole story', 'Cover the Korean story and write it again from memory. Open the script only after writing.'],
      ['Retell from memory', 'Cover both the story and your notes. Tell the whole story aloud in Korean.'],
      ['Make it your story', 'Keep the sequence, but change the people, place, choice, and result to fit your life.'],
      ['Tell a partner', 'Close your notes and tell your new story naturally to another person.']
    ] : [
      ['이야기 전체 다시 쓰기', '원문을 덮고 이야기 전체를 기억해서 다시 써 보세요. 다 쓴 뒤에만 원문을 확인하세요.'],
      ['기억해서 말하기', '원문과 노트를 모두 덮고 이야기를 처음부터 끝까지 말해 보세요.'],
      ['나의 이야기 만들기', '흐름을 유지하며 인물, 장소, 선택과 결과를 내 경험에 맞게 바꿔 보세요.'],
      ['파트너에게 전달하기', '노트를 덮고 내가 만든 이야기를 실제 사람에게 자연스럽게 전해 보세요.']
    ];
    const buttons = [...lines, ...activities].map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = index < lines.length ? `1–${index + 1}` : String(index + 1);
      button.setAttribute('aria-label', index < lines.length ? ui(`Cumulative story step ${index + 1}`, `누적 이야기 ${index + 1}단계`) : activities[index - lines.length][0]);
      button.addEventListener('click', () => {
        storyStage = index;
        try { memberState.setItem(storyKey, String(index)); } catch {}
        update();
      });
      nav.append(button);
      return button;
    });
    const cue = paragraph(ui('Read from the beginning, cover the story, then write what you remember in your own words.', '처음부터 읽고 이야기를 덮은 뒤 기억나는 내용을 내 말로 적어 보세요.'));
    const activity = document.createElement('section');
    activity.className = 'story-activity';
    const reference = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = item.language === 'ko' ? 'Check the full Korean story' : '완성된 이야기 확인하기';
    reference.append(summary);
    lines.forEach(line => reference.append(paragraph(line)));
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = ui('Next step →', '다음 단계 →');
    next.addEventListener('click', () => buttons[Math.min(storyStage + 1, buttons.length - 1)].click());
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = ui('← Previous', '← 이전'); previous.addEventListener('click', () => buttons[Math.max(0, storyStage - 1)].click());
    const navigation = document.createElement('div'); navigation.className = 'camp-deck-navigation'; navigation.append(previous, next);
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'pilot-reset-button'; reset.textContent = ui('↻ Reset', '↻ 초기화'); reset.addEventListener('click', () => buttons[0].click()); navigation.append(reset);
    const menu = document.createElement('details'); menu.className = 'camp-menu';
    const menuTitle = document.createElement('summary'); menuTitle.textContent = '•••'; menuTitle.setAttribute('aria-label', ui('Learning menu', '학습 메뉴'));
    menu.append(menuTitle, nav); navigation.prepend(menu);
    const meter = document.createElement('progress'); meter.max = buttons.length; meter.className = 'camp-progress'; meter.setAttribute('aria-label', ui('Practice progress', '훈련 진행'));
    card.before(meter); steps.append(heading, cue, activity); cue.className = 'card-guide';
    document.body.append(navigation);
    document.querySelector('#text-actions').before(steps);
    function update() {
      const building = storyStage < lines.length;
      meter.value = storyStage + 1;
      menu.open = false;
      previous.disabled = storyStage === 0;
      heading.textContent = building ? ui(`Cumulative story · ${storyStage + 1} of ${lines.length}`, `누적 이야기 · ${storyStage + 1}/${lines.length}`) : activities[storyStage - lines.length][0];
      buttons.forEach((button, index) => button.setAttribute('aria-current', index === storyStage ? 'step' : 'false'));
      cue.hidden = !building;
      activity.hidden = building;
      activity.replaceChildren();
      if (!building) {
        activity.append(paragraph(activities[storyStage - lines.length][1]));
        if (storyStage === lines.length) activity.append(reference);
        if (storyStage === lines.length || storyStage === lines.length + 2) {
          const notes = document.createElement('textarea'); notes.rows = 6; notes.setAttribute('aria-label', activities[storyStage - lines.length][0]);
          const noteKey = `${storyKey}:notes:${storyStage}`;
          try { notes.value = memberState.getItem(noteKey) || ''; } catch {}
          notes.addEventListener('input', () => { try { memberState.setItem(noteKey, notes.value); } catch {} });
          activity.append(notes);
        }
      }
      next.hidden = storyStage === buttons.length - 1;
      if (otherCompletion) otherCompletion.hidden = storyStage !== buttons.length - 1;
      paint();
    }
    mountCompletion();
    update();
  }
  if (item.area === 'readable') addReadingSteps(item);
  if (story) mountCompletion();
}

async function run() {
  if (!cardId || !/^[a-z0-9-]{1,160}$/.test(cardId)) { status.textContent = ui('This card is unavailable.', '이 카드는 이용할 수 없어요.'); return; }
  if (!config.url || !config.publishableKey) { status.textContent = ui('Sign-in is unavailable right now.', '지금은 로그인할 수 없어요.'); return; }
  client = createClient(config.url, config.publishableKey);
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session) {
    document.querySelector('#title').textContent = ui('Sign in to practice', '로그인하고 연습하기');
    status.textContent = ui('Sign in to open this card.', '로그인하면 이 카드를 열 수 있어요.');
    document.querySelector('#sign-in').hidden = false;
    return;
  }
  const replaced=()=>{if(vocalCues)stopVocal();audio.pause();audio.removeAttribute('src');audio.load();memberState?.close();signedInUserId=null;document.querySelector('#card').hidden=true;status.hidden=false;status.textContent=ui('Signed in on another device. Sign in again to continue here.','다른 기기에서 로그인했어요. 이 기기에서 계속하려면 다시 로그인해 주세요.');document.querySelector('#sign-in').hidden=false;client.auth.signOut({scope:'local'});};
  if(!await checkDeviceSession(client)){replaced();return;}
  void recordMemberVisit(client, session.user.id);
  watchDeviceSession(client,replaced);
  signedInUserId = session.user.id;
  if (accountControl) {
    accountControl.textContent = ui('Log out', '로그아웃');
    accountControl.onclick = async event => {
      event.preventDefault(); if (vocalCues) stopVocal(); audio.pause();
      await client.auth.signOut();
      location.replace(accountControl.href);
    };
  }
  try {
    memberState = await openMemberLearningState(client, signedInUserId, cardId);
    const syncStatus = document.createElement('p');
    syncStatus.setAttribute('role', 'status');
    syncStatus.style.cssText = 'font-size:14px;line-height:1.6;margin:12px 0;color:var(--muted,#607086)';
    syncStatus.textContent = ui('Progress is saved to your account.', '학습 기록은 계정에 저장됩니다.');
    document.querySelector('.card-body').append(syncStatus);
    window.addEventListener('talktag:sync-status', event => {
      const saved = event.detail.message === 'Progress saved';
      syncStatus.textContent = saved ? ui('Progress saved', '학습 기록이 저장되었어요.') : ui('Not synced yet. Reconnect to save your progress.', '아직 동기화되지 않았어요. 인터넷에 연결하면 다시 저장합니다.');
    });
    client.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id === signedInUserId) return;
      if (vocalCues) stopVocal();
      memberState.close(); signedInUserId = null; audio.pause(); audio.removeAttribute('src'); audio.load();
      document.querySelector('#card').hidden = true;
      status.hidden = false; status.textContent = ui('Sign in to continue.', '로그인하고 계속해 주세요.');
      document.querySelector('#sign-in').hidden = false;
      location.reload();
    });
    content = await request('/api/card-content', { cardId });
    const historyResult = await client.rpc('record_member_lesson_open', { p_lesson_id: cardId, p_title: content.title || content.nativeTitle || cardId });
    if (historyResult.error) throw new Error('Learning history could not be saved.');
    if (!content || content.id !== cardId) throw new Error('invalid_payload');
    document.querySelector('#title').textContent = content.title || content.nativeTitle || 'Practice card';
    const description = content.description || content.summary || content.theme || '';
    document.querySelector('#description').textContent = description;
    document.querySelector('#kicker').textContent = `${content.level || ''} · ${content.area || content.type || ''}`.toUpperCase();
    document.title = `${content.title || content.nativeTitle || 'Practice card'} · TalkTag`;
    const publishedArt = window.TalkTagAudioLessons?.find(card => card.id === content.id);
    const reviewedArt = window.TalkTagCardArtwork?.[content.id];
    const picture = safeArtwork(reviewedArt?.src || publishedArt?.artwork || content.artwork || guidedArtwork(content));
    if (picture) { const node = document.querySelector('#artwork'); node.src = picture; node.alt = reviewedArt?.alt || publishedArt?.artworkAlt || content.artworkAlt || ''; node.hidden = false; }
    const scene = content.scene || content.briefing || content.situation || '';
    const normalizeCopy = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
    const sceneCopy = normalizeCopy(scene);
    if (sceneCopy && sceneCopy !== normalizeCopy(description)) {
      const node = document.querySelector('#scene');
      node.textContent = scene;
      node.hidden = false;
    }
    if (content.lesson?.audioSteps || content.lesson?.steps) await renderVocal(content);
    else if (Array.isArray(content.expressions)) await renderSound(content);
    else renderText(content);
    status.hidden = true;
    card.hidden = false;
    if (guidedCompletion) {
      const { data: progress, error: progressError } = await client.from('learning_progress')
        .select('lesson_id').eq('user_id', signedInUserId).eq('lesson_id', cardId).maybeSingle();
      if (!progressError) {
        guidedDone = Boolean(progress);
        updateGuidedCompletion();
      }
    }
    if (otherCompletion) {
      const { data: progress, error: progressError } = await client.from('learning_progress')
        .select('lesson_id').eq('user_id', signedInUserId).eq('lesson_id', cardId).maybeSingle();
      if (!progressError && progress) {
        otherCompletion.dataset.completed = 'true';
        otherCompletion.textContent = ui('✓ Completed · Undo', '✓ 완료 · 취소');
      }
    }
    const rawArea = content.area || content.type;
    const area = rawArea === 'guided' ? 'guided-listen-repeat' : rawArea === 'plain' ? 'mini-talks' : rawArea || 'guided-listen-repeat';
    const language = content.language || (cardId.startsWith('ko-') ? 'ko' : cardId.startsWith('ja-') ? 'ja' : 'en');
    const level = content.level || 'A1';
    setReturnRoute(language, area, level);
  } catch (cause) {
    status.textContent = cause.message === 'denied' ? ui('This card is not included in your membership.', '현재 이용권으로는 이 카드를 이용할 수 없어요.')
      : ui('The private card could not load. Please try again shortly.', '카드를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  }
}

run();

window.addEventListener('pagehide', () => {
  if (vocalCues) stopVocal();
  memberState?.flush();
});

let lastRemotePositionSecond = -1;
audio.addEventListener('timeupdate', () => {
  if (!memberState || !signedInUserId || !content || content.lesson || audio.ended) return;
  const second = Math.floor(audio.currentTime);
  if (second === lastRemotePositionSecond || second % 5 !== 0) return;
  lastRemotePositionSecond = second;
  memberState.setItem(guidedCues.length ? guidedKey('position') : `audio-position:${currentVariant}`, String(audio.currentTime));
});
audio.addEventListener('ended', () => {
  if (memberState && !content?.lesson && !guidedCues.length) memberState.removeItem(`audio-position:${currentVariant}`);
  // Mini Talks play once: finishing the main conversation completes the card.
  if ((content?.area === 'mini-talks' || content?.type === 'plain') && currentVariant === 'main' && otherCompletion && !otherCompletion.disabled && !otherCompletion.dataset.completed) otherCompletion.click();
});
