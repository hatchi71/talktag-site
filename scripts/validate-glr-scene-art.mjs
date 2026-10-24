import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = { window: {}, URLSearchParams, location: { search: '' } };
vm.createContext(context);
const load = filename => vm.runInContext(fs.readFileSync(new URL(filename, root), 'utf8'), context, { filename });

for (const filename of [
  'audio-lessons.js', 'guided-drill-data.js', 'guided-lauren003.js',
  'guided-lauren004.js', 'guided-jarnathan005.js', 'guided-max006.js',
  'guided-roger007.js', 'guided-miniskit-pilots.js',
  'guided-miniskit-a2-c2.js', 'guided-card-parts.js'
]) load(filename);
const english = context.window.TalkTagAudioLessons.filter(lesson => lesson.type === 'guided' && lesson.available !== false);

for (const filename of ['native-guided-data.js', 'native-guided-ko-002.js', 'native-guided-ko-003.js', 'native-guided-ko-004-a1.js', 'native-guided-ko-005-010.js', 'native-guided-ko-splits.js']) load(filename);
const native = Object.values(context.window.TalkTagNativeCatalogs).flat()
  .filter(lesson => lesson.type === 'guided' && lesson.available !== false);
const lessons = [...english, ...native];
context.window.TalkTagAudioLessons = lessons;

let title;
let card;
let images = [];
let refresh;
context.window.addEventListener = (name, listener) => { if (name === 'pageshow') refresh = listener; };
context.document = {
  body: { dataset: { audioType: 'guided' } },
  querySelectorAll: selector => selector === '#lessonList .lesson-card' && card ? [card] : [],
  getElementById: id => id === 'lessonTitle' ? title : null,
  createElement: tag => tag === 'img'
    ? (images.push({ addEventListener() {}, remove() {}, classList: { add() {} } }), images.at(-1))
    : { append() {} }
};
context.MutationObserver = class {};
context.location.search = '?id=' + encodeURIComponent(lessons[0].id);
title = { parentElement: { classList: { contains: () => false } }, before() {} };
load('glr-scenes.js');
assert.equal(typeof refresh, 'function', 'Scene renderer did not register its refresh hook');

const seen = new Set();
for (const lesson of lessons) {
  assert(!seen.has(lesson.id), 'Duplicate guided card ID: ' + lesson.id);
  seen.add(lesson.id);
  images = [];
  title = { parentElement: { classList: { contains: () => false } }, before() {} };
  card = {
    dataset: { completionId: 'audio:' + lesson.id },
    querySelector: selector => selector === '.lesson-copy h2'
      ? { parentElement: { classList: { contains: () => false } }, before() {} }
      : null
  };
  context.location.search = '?id=' + encodeURIComponent(lesson.id);
  refresh();
  assert.equal(images.length, 2, 'Cartoon missing in library or player for ' + lesson.id);
  assert.equal(images[0].src, images[1].src, 'Library/player cartoons differ for ' + lesson.id);
  for (const image of images) assert(image.alt?.trim(), 'Missing cartoon description for ' + lesson.id);
  const pathname = new URL(images[0].src, 'https://talktag.co.kr/').pathname;
  assert(pathname.startsWith('/assets/glr-scenes/'), 'Unexpected cartoon path for ' + lesson.id + ': ' + pathname);
  const file = new URL('..' + pathname, import.meta.url);
  assert(fs.existsSync(file), 'Missing cartoon file for ' + lesson.id + ': ' + pathname);
  const bytes = fs.readFileSync(file);
  assert(bytes.length > 1024, 'Empty cartoon file: ' + pathname);
  assert(pathname.endsWith('.jpg') ? bytes[0] === 0xff && bytes[1] === 0xd8
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
  'Invalid cartoon format: ' + pathname);
}

console.log('PASS: ' + english.length + ' English + ' + native.length +
  ' Korean/Japanese Guided L&R cards have artwork, descriptions and valid image files.');
