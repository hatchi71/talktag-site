import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import './validate-korean-mini-migration.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const read = path => fs.readFileSync(path, 'utf8');
const legacySource = 'native-audio-korean-aea-001.js';
const legacyManifest = 'audio/korean/audio-essays-articles/segments-001/manifest.json';
const legacyImportsActive = read('K-korean-audio-library.html').includes('/native-audio-korean-aea-001.js') &&
  read('K-korean-audio-player.html').includes('/native-audio-korean-aea-001.js');
if (!legacyImportsActive) {
  const context = {window: {TalkTagNative: {language: 'ko'}, TalkTagNativeCatalogs: {ko: []}}};
  vm.createContext(context);
  for (const file of ['mini-talks-korean-001.js', 'korean-support-mini-talks-001.js', 'native-audio-catalog.js']) {
    vm.runInContext(read(file), context, {filename: file});
  }
  assert.equal(context.window.TalkTagKoreanMiniReleaseReady, true,
    'Old Korean essays may be removed only after all six published Mini Talks and six-language meanings are complete');
  for (const page of ['K-korean-audio-library.html', 'K-korean-audio-player.html']) {
    assert.doesNotMatch(read(page), /native-audio-korean-aea-00[12]\.js|korean-support-essays-00[12]\.js|native-essay-variants\.js|audio-essays-articles\/segments-001\/manifest\.js/,
      `${page}: old Korean essay modules must not load after the Mini Talks release`);
  }
  assert.match(read('native-audio-player.js'), /retired-essay-page/,
    'Old direct links must show a track-change notice instead of silently switching lessons');
  console.log('PASS: Korean essay imports retired after six-level Mini Talks release; old completion and route notice preserved.');
} else {
assert.ok(fs.existsSync(legacySource) && fs.existsSync(legacyManifest),
  'Legacy Korean essay imports must have their source and manifest while they remain active');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('native-audio-korean-aea-001.js'), context);
const lessons = context.window.TalkTagNativeCatalogs.ko;
assert.equal(lessons.length, 6);
for (const lesson of lessons) {
  assert.equal(lesson.sentenceGaps.length, lesson.expressions.length - 1, `${lesson.level}: one gap is needed between each pair of sentences`);
  let previousEnd = 0;
  for (const [end, next] of lesson.sentenceGaps) {
    assert.ok(end > previousEnd && next > end && next < lesson.durationSeconds, `${lesson.level}: invalid pause boundary`);
    assert.ok(next - end >= 0.5, `${lesson.level}: pause point must be inside a substantial quiet interval`);
    previousEnd = next;
  }
}
const library = read('native-audio-library.js');
assert.match(library, /document\.querySelectorAll\("\[data-level\]"\)\.forEach\(a=>\{/);
assert.match(library, /type==="guided"\?"Guided Listen & Repeat":"Mini Talks"/);
assert.match(library, /Previous Audio Essays/);
assert.match(read('guided-library.css'), /body\[data-audio-type\] \.filter-bar\.tt-level-postits>a/);
const player = read('K-korean-audio-player.html');
assert.doesNotMatch(player, /essay-pause-control\.js/);
assert.doesNotMatch(read('native-audio-player.js'), /TalkTagEssayPause\?\.mount/);
assert.match(player, /native-essay-variants\.js\?v=20261016-ko-essay-variants/);
assert.doesNotMatch(read('native-audio-player.js'), /TalkTagNativeEssayVariants\?\.forLesson/);
assert.match(read('essay-pause-control.js'), /if \(audio\.segmented\) audio\.setPauseMultiplier\(multiplier\)/);
const manifest = JSON.parse(read('audio/korean/audio-essays-articles/segments-001/manifest.json'));
assert.equal(manifest.cards.length, 6);
assert.equal(manifest.cards.reduce((total, card) => total + card.lines.length, 0), 29);
assert.ok(manifest.cards.every(card => card.variants.length === 4));
const releaseContext = { window: { TalkTagNativeCatalogs: { ko: lessons } } };
vm.createContext(releaseContext);
vm.runInContext(read('audio/korean/audio-essays-articles/segments-001/manifest.js'), releaseContext);
assert.doesNotMatch(player, /native-essay-catalog-variants\.js/);
assert.doesNotMatch(read('K-korean-audio-library.html'), /native-essay-catalog-variants\.js/);
vm.runInContext(read('native-essay-variants.js'), releaseContext);
for (const lesson of lessons) {
  assert.ok(!lesson.audio.includes('/segments-001/'), `${lesson.level}: use the original continuous recording`);
  const release = releaseContext.window.TalkTagKoreanEssayVariants;
  const variant = release.cards.find(card => card.id === lesson.id).variants[0];
  const position = releaseContext.window.TalkTagNativeEssayVariants.toOriginalPosition(lesson, {
    position: variant.cues[1].s,
    positionMode: 'essay-variant', positionRatio: variant.ratio, positionRevision: release.releaseBase
  });
  assert.ok(Math.abs(position - (lesson.sentenceGaps[0][0] + lesson.sentenceGaps[0][1]) / 2) < 0.001,
    `${lesson.level}: preserve the sentence when restoring continuous playback`);
}
console.log('PASS: 6 Korean essays use continuous playback without pause controls; saved variant positions map to original sentences.');
}
