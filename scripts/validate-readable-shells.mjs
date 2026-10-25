#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const chapter = JSON.parse(read('content/readable/en-a1-001.json'));
assert.equal(chapter.id, 'A1-001');
assert.equal(chapter.status, 'published');
assert.equal(chapter.paragraphs.length, 7);
assert.ok(chapter.paragraphs.every(item => item.en && item.kr), 'Every paragraph needs English and Korean');
for (const file of ['readable.html','K-korean-readable.html']) {
  const html = read(file);
  for (const shared of ['audio-lab.css','sound-check.css','guided-library.css','content-completion.css','korean-readable.css']) {
    assert.ok(html.includes(shared), `${file} is missing shared GLR styling: ${shared}`);
  }
  assert.ok(html.includes('tt-level-postits') && html.includes('readableMissionsToggle'), `${file} is missing level bins or completed shelf`);
}
assert.ok(read('readable-english-library.js').includes('TalkTagCompletion?.mount(list)'));
assert.ok(read('readable-english-library.js').includes('content/readable/en-a1-001.json'));
assert.ok(!read('readable-english-library.js').includes("fetch('content/readable/readable-stories-A1-C2-60.json')"), 'Legacy chapters must not appear in the new catalog');
assert.ok(read('readable-chapter.html').includes('STEP 05 · COMING SOON'));
assert.ok(read('readable-chapter.js').includes("'readable:en:A1-001'"));
assert.ok(read('bootcamp-level.html').includes("'readable.html?level='"), 'Legacy level links must reach the current Readable catalog');
console.log('PASS: English Readable A1 001, bilingual chapter, five-step practice, shared shell, completion, and legacy routing.');
