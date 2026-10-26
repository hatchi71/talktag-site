import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const read = path => fs.readFileSync(path, 'utf8');
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
assert.match(library, /type==="guided"\?"Guided Listen & Repeat":"Essays & Articles"/);
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
