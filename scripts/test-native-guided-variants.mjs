#!/usr/bin/env node
/* Regression checks for native GLR variant selection, timing and script alignment. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const window = {};
const context = vm.createContext({ window, console, URLSearchParams,
  location: { search: '?id=ja-guided-a1-001' },
  document: { body: { dataset: {} }, getElementById: () => null, querySelector: () => null },
  Event: class { constructor(type) { this.type = type; } } });
const load = file => vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, { filename: file });
load('native-guided-data.js');
load('native-guided-variants.js');

const validRatios = [2, 2.5, 3, 3.5];
for (const [language, file, globalName] of [
  ['ja', 'audio/japanese/guided/segments-001/variants/manifest.js', 'TalkTagJapaneseGuidedVariants'],
  ['ko', 'audio/korean/guided/segments-001-002/manifest.js', 'TalkTagKoreanGuidedVariants']
]) {
  if (!fs.existsSync(path.join(repo, file))) continue;
  if (language === 'ko') {
    load('native-guided-ko-002.js');
    load('native-guided-ko-003.js');
    load('native-guided-ko-splits.js');
  }
  load(file);
  if (language === 'ko') load('native-guided-ko-003-variants.js');
  const manifest = window[globalName];
  assert.ok(manifest?.cards?.length, `${language}: manifest missing cards`);
  for (const card of manifest.cards) {
    const lesson = window.TalkTagNativeCatalogs[language].find(item => item.id === card.id);
    assert.ok(lesson, `${language}: catalog missing ${card.id}`);
    assert.ok(window.TalkTagNativeGuidedVariants.isValid(card, lesson),
      `${language}: ${card.id} variant/script mismatch`);
    assert.deepEqual([...card.variants.map(item => item.ratio)].sort((a, b) => a - b), validRatios);
    for (const variant of card.variants) {
      assert.ok(variant.audio.startsWith('https://audio.talktag.co.kr/'),
        `${language}: ${card.id} ${variant.ratio} has no public audio URL`);
      assert.ok(variant.endingCueStart < variant.durationSeconds);
    }
  }
  console.log(`${language}: ${manifest.cards.length} cards × 4 pause variants match the published script catalog`);
}

const lesson = window.TalkTagNativeCatalogs.ja.find(item => item.id === 'ja-guided-a1-001');
const manifest = window.TalkTagJapaneseGuidedVariants;
if (lesson && manifest) {
  let state = { pauseMultiplier: 2.5, position: 0 };
  const listeners = new Map();
  const audio = {
    paused: true, currentTime: 0, duration: 1000, dataset: {},
    addEventListener(name, callback) { const list = listeners.get(name) || []; list.push(callback); listeners.set(name, list); },
    removeEventListener(name, callback) { listeners.set(name, (listeners.get(name) || []).filter(item => item !== callback)); },
    dispatchEvent(event) { for (const callback of [...(listeners.get(event.type) || [])]) callback(event); },
    pause() { this.paused = true; this.dispatchEvent({ type: 'pause' }); },
    play() { this.paused = false; this.dispatchEvent({ type: 'playing' }); return Promise.resolve(); },
    load() { if (this.immediateMetadata) this.dispatchEvent({ type: 'loadedmetadata' }); }
  };
  const native = { language: 'ja', ui: 'ko', playerPage: 'J-glr-player.html' };
  const controller = window.TalkTagNativeGuidedVariants.forLesson(lesson, native, audio,
    () => state, patch => (state = { ...state, ...patch }));
  assert.ok(controller, 'Japanese variant controller did not mount');
  assert.equal(audio.segmented, true);
  assert.equal(audio.src, manifest.cards.find(item => item.id === lesson.id).variants.find(item => item.ratio === 2.5).audio);
  const savedLegacy = { position: lesson.training.cues[0].voiceEnd };
  // The current lesson cues were swapped at mount, so use an explicit old cue set
  // when testing the pure mapping below.
  const source = { cues: [{ s: 0.5, voiceEnd: 1.5, e: 4.5, i: 0, r: 1 }], endingCueStart: 4.5 };
  const target = { cues: [{ s: 0.5, voiceEnd: 1.5, e: 5.5, i: 0, r: 1 }], endingCueStart: 5.5, durationSeconds: 6.5 };
  assert.equal(window.TalkTagNativeGuidedVariants.equivalentTime(source, target, 3), 3.5);
  assert.ok(savedLegacy.position > 0);

  audio.currentTime = 5;
  audio.setPauseMultiplier(3);
  assert.equal(audio.segmentRatio, 3);
  audio.dispatchEvent({ type: 'loadedmetadata' });
  assert.equal(state.positionRatio, 3);
  assert.equal(state.positionMode, 'native-variant');
  audio.play();
  const activeCue = lesson.training.cues[0];
  audio.currentTime = activeCue.s + 0.1;
  audio.setPauseMultiplier(3.5);
  assert.equal(audio.segmentRatio, 3, 'ratio must not change during audible speech');
  audio.currentTime = activeCue.voiceEnd + 0.1;
  audio.dispatchEvent({ type: 'timeupdate' });
  assert.equal(audio.segmentRatio, 3.5, 'ratio should change at the next quiet gap');
  audio.dispatchEvent({ type: 'loadedmetadata' });
  assert.equal(state.positionRatio, 3.5);
  audio.immediateMetadata = true;
  audio.currentTime = lesson.training.cues[0].voiceEnd + 0.1;
  audio.setPauseMultiplier(2);
  assert.equal(audio.segmentRatio, 2);
  assert.equal(state.positionRatio, 2, 'synchronous metadata must complete the source switch');
  assert.equal(audio.dataset.segmentSwitching, undefined, 'source switch must not leave playback blocked');
  console.log('Native pause selection, safe-boundary switching and cue-relative seeking passed');
}

if (fs.existsSync(path.join(repo, 'native-guided-ko-splits.js')) &&
    fs.existsSync(path.join(repo, 'audio/korean/guided/segments-001-002/manifest.js'))) {
  const items = new Map();
  const localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value))
  };
  const migrationWindow = { TalkTagNative: { language: 'ko' } };
  const migrationContext = vm.createContext({ window: migrationWindow, localStorage, console });
  const migrateLoad = file => vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'),
    migrationContext, { filename: file });
  migrateLoad('native-guided-data.js');
  migrateLoad('native-guided-ko-002.js');
  const oldFirst = migrationWindow.TalkTagNativeCatalogs.ko.find(item => item.id === 'ko-guided-b1-002');
  const oldSecond = migrationWindow.TalkTagNativeCatalogs.ko.find(item => item.id === 'ko-guided-b1-002-part2');
  assert.ok(oldFirst && oldSecond, 'split test source cards missing');
  const firstPosition = oldFirst.training.cues.find(cue => cue.i === 2 && cue.r === 7).s + 0.2;
  const secondPosition = oldSecond.training.cues.find(cue => cue.i === 1 && cue.r === 4).s + 0.2;
  localStorage.setItem('talktag-audio:ko-guided-b1-002', JSON.stringify({ position: firstPosition,
    completed: true, pauseMultiplier: 3 }));
  localStorage.setItem('talktag-audio:ko-guided-b1-002-part2', JSON.stringify({ position: secondPosition,
    completed: false, pauseMultiplier: 2.5 }));
  localStorage.setItem('talktag-content-completions:v1', JSON.stringify({
    'audio:ko-guided-b1-002': { source: 'manual', completedAt: '2026-10-15T00:00:00Z' }
  }));
  migrateLoad('native-guided-ko-splits.js');
  migrateLoad('audio/korean/guided/segments-001-002/manifest.js');
  migrateLoad('native-guided-progress-migration.js');
  const base = JSON.parse(localStorage.getItem('talktag-audio:ko-guided-b1-002'));
  const newPart2 = JSON.parse(localStorage.getItem('talktag-audio:ko-guided-b1-002-part2'));
  const newPart3 = JSON.parse(localStorage.getItem('talktag-audio:ko-guided-b1-002-part3'));
  assert.equal(base.completed, true, 'old first-part completion should stay on first new part');
  assert.equal(newPart2.completed, true, 'old first-part completion should follow its second new part');
  assert.equal(newPart3.completed, false, 'old second-part state must not leak onto unrelated lines');
  assert.equal(base.position, 0);
  assert.ok(newPart2.position > 0, 'resume must move to the card containing the old sentence');
  assert.ok(newPart3.position > 0, 'old second-part resume must move to the repurposed ID');
  assert.ok(localStorage.getItem('talktag-native-guided-migration:ko-guided-splits-20261016-v1:backup'),
    'migration must preserve a recoverable snapshot');
  localStorage.setItem('talktag-audio:ko-guided-b1-002-part2', JSON.stringify({ ...newPart2, completed: false }));
  migrateLoad('native-guided-progress-migration.js');
  assert.equal(JSON.parse(localStorage.getItem('talktag-audio:ko-guided-b1-002-part2')).completed,
    false, 'migration must not re-complete a manually undone new card');
  console.log('Korean sentence-boundary split, completion and resume migration passed');
}
