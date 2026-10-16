#!/usr/bin/env node
/* Keep fallback script timing tied to the audio selected by the player. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const player = fs.readFileSync(new URL('../native-audio-player.js', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../native-audio-sync.js', import.meta.url), 'utf8');
const handoff = 'window.TalkTagActiveNativeLesson = lesson;';
const legacySelection = 'if (legacyPlayback && native.language === "ko")';
assert.ok(player.includes(handoff), 'Player must share its active lesson with synchronized scripts');
assert.ok(player.indexOf(handoff) > player.indexOf(legacySelection),
  'Active lesson must be shared after selecting any legacy recording');

const cutoff = '  if (!data || !data.cues.length) return;';
assert.ok(source.includes(cutoff), 'Synchronization source changed: review this test');
const inspectSelection = source.replace(cutoff, '  globalThis.selectedSyncData = data; return;');

function selected({ language = 'ko', id, catalog, active, essayMedia }) {
  const context = vm.createContext({
    window: {
      TalkTagNative: { language },
      TalkTagAudioLessons: catalog,
      TalkTagActiveNativeLesson: active,
      TalkTagEssayMedia: essayMedia,
    },
    location: { search: '?id=' + encodeURIComponent(id) },
    URLSearchParams,
  });
  vm.runInContext(inspectSelection, context, { filename: 'native-audio-sync.js' });
  return context.selectedSyncData;
}

const id = 'ko-guided-a1-001';
const newer = { id, expressions: ['Current line'], meanings: ['Current meaning'],
  training: { cues: [{ s: 5, voiceEnd: 6, e: 9, i: 0, r: 1 }] } };
const fallback = { id, expressions: ['Legacy line'], meanings: ['Legacy meaning'],
  training: { cues: [{ s: 0.5, voiceEnd: 1.5, e: 4.5, i: 0, r: 1 }] } };
const oldAudioSync = selected({ id, catalog: [newer], active: fallback });
assert.strictEqual(oldAudioSync.cues, fallback.training.cues,
  'Legacy playback must synchronize to legacy audio cues');
assert.equal(oldAudioSync.lines[0].en, 'Legacy line');
assert.equal(oldAudioSync.lines[0].ko, 'Legacy meaning');

const ordinarySync = selected({ id, catalog: [newer], active: { ...fallback, id: 'different' } });
assert.strictEqual(ordinarySync.cues, newer.training.cues,
  'A different active card must not override this card');

const japanese = { id: 'ja-guided-a1-001', expressions: ['日本語です。'], meanings: ['일본어입니다.'],
  training: { cues: [{ s: 0.5, voiceEnd: 1.4, e: 4.4, i: 0, r: 1 }] } };
assert.strictEqual(selected({ language: 'ja', id: japanese.id, catalog: [newer], active: japanese }).cues,
  japanese.training.cues, 'Japanese pause variants must share the current cue array');

const essaySync = { lines: [{ en: 'Essay' }], cues: [{ s: 0, e: 2 }] };
assert.strictEqual(selected({ id: 'ko-essay-001', catalog: [newer], active: fallback,
  essayMedia: { 'ko-essay-001': { sync: essaySync } } }), essaySync,
  'Audio Essays synchronization must remain unchanged');

console.log('Native audio synchronization follows the selected GLR recording and leaves essays intact.');
