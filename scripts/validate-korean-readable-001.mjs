#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const context = {window: {}};
runInNewContext(read('content/readable/korean-001.js'), context);
const chapter = context.window.TalkTagKoreanReadable.find(item => item.id === 'ko-readable-a1-001');
assert.ok(chapter && chapter.status === 'published');
assert.equal(chapter.level, 'A1');
assert.equal(chapter.readingMinutes, '4–6');
assert.equal(chapter.paragraphs.length, 8);
assert.ok(chapter.paragraphs.every(p => typeof p.ko === 'string' && p.ko.trim() && typeof p.en === 'string' && p.en.trim()));
const source = chapter.paragraphs.map(p => p.ko.trim());
assert.equal(createHash('sha256').update(source.join('\n')).digest('hex'), chapter.sourceHash);
const eojeol = source.join(' ').split(/\s+/u).length;
assert.ok(eojeol >= 180 && eojeol <= 330, `Unexpected A1 reading length: ${eojeol} eojeol`);
assert.ok(read('K-korean-readable-chapter.html').includes('korean-support-language.js'), 'Shared Korean language selector missing');
assert.ok(read('korean-readable-chapter.js').includes('TalkTagKoreanSupport?.mount'), 'Readable meaning selector not mounted');
assert.ok(read('korean-readable-chapter.js').includes("'readable:' + item.id"), 'Manual completion identity missing');
console.log(`PASS: Korean Readable 001, eight aligned paragraphs, ${eojeol} eojeol, source hash, language selector, and completion.`);
