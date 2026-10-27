import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventory, stripRetiredImports} from './prepare-korean-essay-retirement.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const plan = inventory();
assert.equal(plan.legacyIds.length, 7, 'A1–C2 001 plus A1 002 must be accounted for');
assert.equal(plan.r2DeletionCandidatesAfterLiveReferenceAudit.length, 60,
  'The 7 live audio objects and 53 old segment objects must be inventoried');
assert.ok(plan.r2DeletionCandidatesAfterLiveReferenceAudit.every(item =>
  item.bucket === 'talktag-audio' &&
  (item.key.startsWith('Essays/boundary-dings/v') ||
   item.key.startsWith('Korean/audio-essays-articles/segments-001/')) &&
  !item.key.includes('/en/')),
  'Do not include English or unrelated R2 assets in Korean retirement');
assert.equal(new Set(plan.r2DeletionCandidatesAfterLiveReferenceAudit.map(item => item.key)).size, 60);
assert.equal(plan.localDeletionCandidatesAfterLiveReferenceAudit.filter(item => item.category === 'audio').length, 13);
assert.equal(plan.localDeletionCandidatesAfterLiveReferenceAudit.filter(item => item.category === 'illustration').length, 7);
assert.ok(plan.localDeletionCandidatesAfterLiveReferenceAudit.every(item => item.exists),
  'Missing local candidates need a fresh inventory');
assert.ok(plan.keepSharedFiles.includes('K-korean-audio-essays.html'),
  'Keep the legacy entry point as a compatible redirect');

for (const page of Object.keys(plan.pageImportsToRemoveAfterGate)) {
  const original = read(page);
  const cleaned = stripRetiredImports(original, page);
  assert.ok(cleaned.removed || cleaned.html === original);
  for (const oldImport of plan.pageImportsToRemoveAfterGate[page]) {
    assert.doesNotMatch(cleaned.html, new RegExp(`<script src="/${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
  }
  assert.match(cleaned.html, /mini-talks-korean-001\.js/);
  assert.match(cleaned.html, /korean-support-mini-talks-001\.js/);
  assert.match(cleaned.html, /native-audio-catalog\.js/);
  assert.deepEqual(stripRetiredImports(cleaned.html, page), {html: cleaned.html, removed: false},
    'Import retirement should be idempotent after its first application');
}

const player = read('native-audio-player.js');
assert.match(player, /retired-essay-page/);
assert.match(player, /Your completion record remains saved separately/);
assert.match(read('native-audio-library.js'), /miniMode\?l\.format==="mini-talks":l\.format!=="mini-talks"/,
  'Release gate must hide legacy cards without transferring their completion');
console.log('PASS: Korean essay retirement inventory and gated HTML import plan are safe; no files or R2 objects removed.');
