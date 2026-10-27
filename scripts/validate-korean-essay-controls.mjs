import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import './validate-korean-mini-migration.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(resolve(root, file), 'utf8');
for (const page of ['K-korean-audio-library.html', 'K-korean-audio-player.html']) {
  const html = read(page);
  assert.doesNotMatch(html, /native-audio-korean-aea-00[12]\.js|korean-support-essays-00[12]\.js|korean-support-japanese-essays\.js|native-essay-variants\.js|audio-essays-articles\/segments-001\/manifest\.js/,
    `${page}: retired Korean essay modules must not load`);
  assert.match(html, /mini-talks-korean-001\.js/);
  assert.match(html, /korean-support-mini-talks-001\.js/);
}
const context = {window: {TalkTagNative: {language: 'ko'}, TalkTagNativeCatalogs: {ko: []}}};
for (const file of ['mini-talks-korean-001.js', 'korean-support-mini-talks-001.js', 'native-audio-catalog.js']) {
  runInNewContext(read(file), context, {filename: file});
}
assert.equal(context.window.TalkTagKoreanMiniReleaseReady, true,
  'Retired Korean essays require all six published Mini Talks and six-language meanings');
const player = read('native-audio-player.js');
assert.match(player, /retired-essay-page/, 'Old direct links need a track-change notice');
assert.match(player, /Your completion record remains saved separately/,
  'Old completion records must remain separate');
console.log('PASS: Korean essay imports retired; six Mini Talks remain complete and old routes retain their notice.');
