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
assert.match(library, /type==="guided"\?"Guided L&R":"Essays & Articles"/);
assert.match(read('guided-library.css'), /body\[data-audio-type\] \.filter-bar\.tt-level-postits>a/);
const player = read('K-korean-audio-player.html');
assert.match(player, /essay-pause-control\.js\?v=20261016-essay-pause-v1/);
assert.match(read('native-audio-player.js'), /TalkTagEssayPause\?\.mount/);
assert.match(read('essay-pause-control.js'), /audio\.pause\(\)/);
console.log('PASS: 6 Korean essay pause maps and matching Sound Check level cards.');
