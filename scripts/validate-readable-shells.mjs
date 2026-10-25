#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const levels = ['A1','A2','B1','B2','C1','C2'];
const chapters = levels.map(level => JSON.parse(read(`content/readable/en-${level.toLowerCase()}-001.json`)));
let previousWords = 0;
for (const [index, chapter] of chapters.entries()) {
  assert.equal(chapter.id, `${levels[index]}-001`);
  assert.equal(chapter.level, levels[index]);
  assert.equal(chapter.status, 'published');
  assert.ok(chapter.paragraphs.length >= 6, `${chapter.level} needs a complete chapter`);
  assert.ok(chapter.paragraphs.every(item => item.en && item.kr), `${chapter.level} needs aligned English and Korean`);
  assert.equal(chapter.source.url, 'https://www.gutenberg.org/ebooks/14838');
  const words = chapter.paragraphs.flatMap(item => item.en.trim().split(/\s+/)).length;
  assert.ok(words > previousWords, `${chapter.level} should expand the reading burden from the prior level`);
  previousWords = words;
}
for (const file of ['readable.html','K-korean-readable.html']) {
  const html = read(file);
  for (const shared of ['audio-lab.css','sound-check.css','guided-library.css','content-completion.css','korean-readable.css']) {
    assert.ok(html.includes(shared), `${file} is missing shared GLR styling: ${shared}`);
  }
  assert.ok(html.includes('tt-level-cards') && html.includes('readableMissionsToggle'), `${file} is missing level cards or completed shelf`);
}
for (const file of ['readable-english-library.js','korean-readable-library.js']) {
  assert.ok(read(file).includes("levelsNav.after(document.getElementById('readableMissions'))"), `${file} must place completed missions directly after level cards`);
}
assert.ok(read('readable-english-library.js').includes('TalkTagCompletion?.mount(list)'));
assert.ok(read('readable-english-library.js').includes('Promise.all(levels.map'));
assert.ok(!read('readable-english-library.js').includes("fetch('content/readable/readable-stories-A1-C2-60.json')"), 'Legacy chapters must not appear in the new catalog');
assert.ok(read('readable-chapter.html').includes('STEP 05 · COMING SOON'));
assert.ok(read('readable-chapter.js').includes('readable:en:${level}-001'));
assert.ok(read('bootcamp-level.html').includes("'readable.html?level='"), 'Legacy level links must reach the current Readable catalog');
console.log('PASS: English Readable 001 A1–C2, bilingual chapters, five-step practice, shared shell, completion, and legacy routing.');
