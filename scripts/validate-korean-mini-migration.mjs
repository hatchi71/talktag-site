import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const read = path => fs.readFileSync(path, 'utf8');
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const oldEssay = {id: 'ko-plain-a1-001', type: 'plain', level: 'A1', available: true};
const card = level => ({
  id: `mt-ko-${level.toLowerCase()}-001`, type: 'plain', format: 'mini-talks', level,
  status: 'published', available: true,
  audio: `https://audio.talktag.co.kr/Korean/mini-talks/001/mt-ko-${level.toLowerCase()}-001.mp3`,
  sourceSha256: 'a'.repeat(64), artwork: `/assets/mini-talks/ko/001/${level.toLowerCase()}-scene.jpg`,
  artworkAlt: 'Two people talking', training: {kind: 'mini-talks', cues: [{i: 0, s: 0, e: 2}]},
  expressions: ['안녕하세요.'], meanings: ['Hello.'], speakers: ['A']
});
function releaseReady(lessons, badSupportId = '') {
  const translations = Object.fromEntries(lessons.filter(lesson => lesson.format === 'mini-talks').map(lesson => [lesson.id, {
    sourceHash: 'b'.repeat(64), source: [...lesson.expressions],
    translations: Object.fromEntries(['vi', 'ne', 'km', 'my', 'th', 'ja'].map(code => [code, ['Hello.']])),
    review: Object.fromEntries(['vi', 'ne', 'km', 'my', 'th', 'ja'].map(code => [code, {status: 'ai-reviewed', passes: 2}]))
  }]));
  if (badSupportId) translations[badSupportId].source[0] = '다른 문장.';
  const context = {window: {TalkTagNative: {language: 'ko'}, TalkTagNativeCatalogs: {ko: lessons}, TalkTagKoreanTranslations: translations}};
  vm.createContext(context);
  vm.runInContext(read('native-audio-catalog.js'), context, {filename: 'native-audio-catalog.js'});
  assert.equal(context.window.TalkTagAudioLessons.length, lessons.length, 'Catalog must retain distinct old and new IDs');
  return context.window.TalkTagKoreanMiniReleaseReady;
}
assert.equal(releaseReady([oldEssay, ...levels.slice(0, -1).map(card)]), false, 'Never switch while a level is missing');
assert.equal(releaseReady([oldEssay, ...levels.map(card)]), true, 'Switch only when all six levels are verified');
assert.equal(releaseReady([oldEssay, ...levels.map(level => ({...card(level), ...(level === 'B2' ? {status: 'draft'} : {})}))]), false, 'Drafts must not activate release');
assert.equal(releaseReady([oldEssay, ...levels.map(level => ({...card(level), ...(level === 'C1' ? {audio: '/audio/local.mp3'} : {})}))]), false, 'Local audio must not activate release');
assert.equal(releaseReady([oldEssay, ...levels.map(level => ({...card(level), ...(level === 'C2' ? {artwork: ''} : {})}))]), false, 'Missing illustration must not activate release');
assert.equal(releaseReady([oldEssay, ...levels.map(level => ({...card(level), ...(level === 'A2' ? {meanings: []} : {})}))]), false, 'Unaligned scripts must not activate release');
assert.equal(releaseReady([oldEssay, ...levels.map(card)], 'mt-ko-a2-001'), false, 'Translations must match the final source lines');

const legacyImportStates = [];
for (const file of ['K-korean-audio-library.html', 'K-korean-audio-player.html']) {
  const html = read(file);
  const old = html.indexOf('/native-audio-korean-aea-001.js');
  const mini = html.indexOf('/mini-talks-korean-001.js');
  const translations = html.indexOf('/korean-support-mini-talks-001.js');
  const catalog = html.indexOf('/native-audio-catalog.js');
  assert.ok(mini >= 0 && mini < translations && translations < catalog,
    `${file}: load Korean Mini Talks and six translations before catalog assembly`);
  if (old >= 0) assert.ok(old < mini, `${file}: old essays must load before Mini Talks while the release gate is off`);
  legacyImportStates.push(old >= 0);
}
assert.equal(new Set(legacyImportStates).size, 1, 'Both Korean pages must retire old imports together');
assert.equal(legacyImportStates[0], false, 'Retired Korean essays must not be re-imported');
const current = {window: {TalkTagNative: {language: 'ko'}, TalkTagNativeCatalogs: {ko: []}}};
vm.createContext(current);
for (const file of ['mini-talks-korean-001.js', 'korean-support-mini-talks-001.js', 'native-audio-catalog.js']) {
  vm.runInContext(read(file), current, {filename: file});
}
assert.equal(current.window.TalkTagKoreanMiniReleaseReady, true,
  'Retired Korean essays require all six published Mini Talks and six-language meanings');
const player = read('native-audio-player.js');
assert.match(player, /retired-essay-page/, 'Retired essay URLs need a distinct screen');
assert.match(player, /Your completion record remains saved separately/, 'Do not silently replace or transfer old completion');
assert.match(read('native-audio-sync.js'), /classList\.contains\("retired-essay-page"\)/, 'Retired essay screen must not mount the old synchronized player');
assert.match(read('scripts/update-home-news.mjs'), /native:ko:mini:001/, 'Release must publish a Korean Mini Talks upload group');
console.log('PASS: Korean Mini Talks activates only after six complete published cards; retired essay routes and completion stay separate.');
