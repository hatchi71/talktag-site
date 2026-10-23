#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const stories = JSON.parse(read('content/readable/readable-stories-A1-C2-60.json'));
assert.equal(stories.length, 60);
for (const level of ['A1','A2','B1','B2','C1','C2']) {
  assert.equal(stories.filter(story => story.level === level).length, 10, `${level} must retain ten chapters`);
}
for (const file of ['readable.html','K-korean-readable.html']) {
  const html = read(file);
  for (const shared of ['audio-lab.css','sound-check.css','guided-library.css','content-completion.css','korean-readable.css']) {
    assert.ok(html.includes(shared), `${file} is missing shared GLR styling: ${shared}`);
  }
  assert.ok(html.includes('tt-level-postits') && html.includes('readableMissionsToggle'), `${file} is missing level bins or completed shelf`);
}
assert.ok(read('readable-english-library.js').includes('TalkTagCompletion?.mount(list)'));
assert.ok(read('bootcamp-level.html').includes("'readable.html?level='"), 'Legacy level links must reach the current Readable catalog');
console.log('PASS: 60 English chapters, ten per level, shared GLR-style Readable shells, completion, and legacy routes.');
