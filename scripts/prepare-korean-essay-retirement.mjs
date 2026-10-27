#!/usr/bin/env node
// Inventory retired Korean essay media and stage only HTML import cleanup.
// No command in this file deletes local files or R2 objects.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const IDS = [...LEVELS.map(level => `ko-plain-${level.toLowerCase()}-001`), 'ko-plain-a1-002'];
const HTML_IMPORTS = {
  'K-korean-audio-library.html': [
    'native-audio-korean-aea-001.js', 'native-audio-korean-aea-002.js',
    'essay-ding-media.js', 'essay-artwork.js'
  ],
  'K-korean-audio-player.html': [
    'native-audio-korean-aea-001.js', 'native-audio-korean-aea-002.js',
    'essay-ding-media.js', 'audio/korean/audio-essays-articles/segments-001/manifest.js',
    'essay-artwork.js', 'korean-support-essays-001.js',
    'korean-support-essays-002.js', 'korean-support-japanese-essays.js',
    'native-essay-variants.js'
  ]
};

function read(relative) { return fs.readFileSync(path.join(ROOT, relative), 'utf8'); }
function run(context, relative) {
  vm.runInContext(read(relative), context, {filename: relative, timeout: 1000});
}

export function releaseCatalog() {
  const context = {window: {
    // Simulate the public page, not the local preview override. A preview-only
    // catalog must never authorize removal of the learner's old cards.
    TalkTagNative: {language: 'ko'}, TalkTagMiniTalksPreview: false,
    TalkTagNativeCatalogs: {ko: []}
  }};
  vm.createContext(context);
  run(context, 'mini-talks-korean-001.js');
  run(context, 'korean-support-mini-talks-001.js');
  run(context, 'native-audio-catalog.js');
  return {
    ready: context.window.TalkTagKoreanMiniReleaseReady === true,
    lessons: context.window.TalkTagNativeCatalogs.ko.filter(lesson => lesson.format === 'mini-talks')
  };
}

function oldCatalog() {
  const context = {window: {TalkTagNativeCatalogs: {ko: []}}};
  vm.createContext(context);
  run(context, 'native-audio-korean-aea-001.js');
  run(context, 'native-audio-korean-aea-002.js');
  const lessons = context.window.TalkTagNativeCatalogs.ko;
  assert.deepEqual(lessons.map(lesson => lesson.id).sort(), [...IDS].sort(),
    'The old Korean essay ID set changed; re-audit before retiring anything');
  run(context, 'essay-ding-media.js');
  return lessons;
}

function mediaRecord(url, origin) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://audio.talktag.co.kr', `Unexpected R2 origin in ${origin}`);
  const key = decodeURIComponent(parsed.pathname.slice(1));
  assert.ok(key && !key.split('/').includes('..'), `Unsafe R2 key in ${origin}`);
  return {bucket: 'talktag-audio', key, url, origin};
}

function localCandidate(relative, category) {
  const absolute = path.join(ROOT, relative);
  return {path: relative, category, exists: fs.existsSync(absolute),
    bytes: fs.existsSync(absolute) ? fs.statSync(absolute).size : null};
}

export function inventory() {
  const legacy = oldCatalog();
  const manifest = JSON.parse(read('audio/korean/audio-essays-articles/segments-001/manifest.json'));
  assert.equal(manifest.cards.length, 6, 'Old Korean segmented manifest changed');
  const r2 = [
    ...legacy.map(lesson => mediaRecord(lesson.audio, lesson.id)),
    ...manifest.cards.flatMap(card => [
      ...card.lines.map(line => mediaRecord(line.audio, `${card.id}:line-${line.index}`)),
      ...card.variants.map(variant => mediaRecord(variant.audio, `${card.id}:ratio-${variant.ratio}`))
    ])
  ];
  assert.equal(r2.length, 60, 'Old Korean R2 object count changed; re-audit before retiring');
  assert.equal(new Set(r2.map(item => item.key)).size, r2.length,
    'Old Korean R2 inventory contains duplicate keys');
  const local = [
    ...LEVELS.map(level => `audio/korean/audio-essays-articles/001/${level.toLowerCase()}.mp3`),
    'content/audio/ko-plain-a1-002.mp3',
    ...LEVELS.map(level => `audio/essays-boundary-dings-20261020/ko/ko-plain-${level.toLowerCase()}-001.mp3`),
    ...LEVELS.map(level => `assets/essay-scenes/ko/001-${level.toLowerCase()}.jpg`),
    'assets/essay-scenes/ko/002-a1.jpg',
    'audio/korean/audio-essays-articles/segments-001/manifest.js',
    'audio/korean/audio-essays-articles/segments-001/manifest.json',
    'native-audio-korean-aea-001.js', 'native-audio-korean-aea-002.js',
    'korean-support-essays-001.js', 'korean-support-essays-002.js',
    'korean-support-japanese-essays.js', 'native-essay-variants.js'
  ].map(relative => localCandidate(relative, relative.endsWith('.mp3') ? 'audio' :
    relative.endsWith('.jpg') ? 'illustration' : 'legacy-code-or-manifest'));
  const mini = releaseCatalog();
  return {schema: 'talktag-korean-essay-retirement-inventory-v1',
    releaseGateReady: mini.ready, replacementIds: mini.lessons.map(lesson => lesson.id),
    legacyIds: legacy.map(lesson => lesson.id),
    pageImportsToRemoveAfterGate: HTML_IMPORTS,
    keepSharedFiles: ['essay-ding-media.js', 'essay-artwork.js',
      'audio/essays-boundary-dings-20261020/manifest.json',
      'K-korean-audio-essays.html'],
    r2DeletionCandidatesAfterLiveReferenceAudit: r2,
    localDeletionCandidatesAfterLiveReferenceAudit: local};
}

export function stripRetiredImports(html, page) {
  const imports = HTML_IMPORTS[page];
  assert.ok(imports, `Not a Korean Mini Talks page: ${page}`);
  const lines = html.split('\n');
  const counts = new Map(imports.map(name => [name, 0]));
  const kept = lines.filter(line => {
    const matched = imports.find(name => line.trim().startsWith(`<script src="/${name}?`) &&
      line.trim().endsWith('defer></script>'));
    if (!matched) return true;
    counts.set(matched, counts.get(matched) + 1);
    return false;
  });
  const values = [...counts.values()];
  assert.ok(values.every(count => count === 1) || values.every(count => count === 0),
    `${page}: partial or duplicate old imports; inspect before continuing`);
  const removed = values.every(count => count === 1);
  const result = kept.join('\n');
  assert.match(result, /mini-talks-korean-001\.js/, `${page}: replacement catalog missing`);
  assert.match(result, /korean-support-mini-talks-001\.js/, `${page}: replacement meanings missing`);
  assert.match(result, /native-audio-catalog\.js/, `${page}: catalog assembly missing`);
  return {html: result, removed};
}

async function verifyPublicReplacementAudio(lessons) {
  assert.deepEqual(lessons.map(lesson => lesson.level).sort(), [...LEVELS].sort(),
    'Need one Mini Talk 001 for each A1–C2 level');
  for (const lesson of lessons) {
    const expected = lesson.checksum || lesson.sourceSha256;
    assert.match(expected, /^[a-f0-9]{64}$/);
    const response = await fetch(lesson.audio, {redirect: 'error'});
    assert.equal(response.status, 200, `${lesson.id}: public audio is not available`);
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.ok(buffer.length > 50000, `${lesson.id}: public audio is unexpectedly small`);
    assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), expected,
      `${lesson.id}: public audio differs from the QC-approved catalog hash`);
  }
}

async function main() {
  const mode = process.argv[2] || '--inventory';
  assert.ok(['--inventory', '--apply-imports'].includes(mode),
    'Usage: node scripts/prepare-korean-essay-retirement.mjs [--inventory|--apply-imports]');
  const result = inventory();
  if (mode === '--inventory') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  assert.equal(result.releaseGateReady, true,
    'All six published Mini Talks and six-language meanings must pass the release gate first');
  const mini = releaseCatalog();
  await verifyPublicReplacementAudio(mini.lessons);
  const edits = Object.keys(HTML_IMPORTS).map(page => {
    const original = read(page);
    return {page, original, ...stripRetiredImports(original, page)};
  });
  assert.ok(edits.every(edit => edit.removed) || edits.every(edit => !edit.removed),
    'Korean page imports have a mixed retirement state; inspect before continuing');
  for (const edit of edits.filter(edit => edit.removed)) {
    fs.writeFileSync(path.join(ROOT, edit.page), edit.html);
  }
  console.log(`Verified six public MP3 hashes. ${edits[0].removed ? 'Removed old Korean essay page imports.' : 'Imports were already retired.'}`);
  console.log('No old completion keys, local files, or R2 objects were deleted.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
