import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const window = {};
runInNewContext(read('bootcamp-stage-rules.js'), { window });
const target = window.TalkTagBootCampStages.vocalRepetitions;
for (const [level, repeats] of Object.entries({ A1:10, A2:10, B1:12, B2:12, C1:15, C2:15 })) {
  assert.equal(target(level), repeats, `${level} Vocal Camp target`);
}
assert.throws(() => target('D1'));

for (const [page, player] of [
  ['vocalcamp-player.html', 'vocalcamp-player.js'],
  ['japanese/J-vocalcamp-player.html', 'japanese/J-vocalcamp-player.js']
]) {
  assert.match(read(page), /bootcamp-stage-rules\.js\?v=20261025-vocal-shorter-repeats/);
  assert.match(read(player), /TalkTagBootCampStages\.vocalRepetitions/);
  assert.match(read(player), /Math\.min\(REPEAT(?:_TARGET|S),/);
}
assert.match(read('vocalcamp-player-loader.js'), /vocalcamp-player\.js\?v=20261025-vocal-shorter-repeats/);
console.log('PASS: Vocal Camp A=10, B=12, C=15 across English, Korean and Japanese; saved counts clamp to the new targets.');
