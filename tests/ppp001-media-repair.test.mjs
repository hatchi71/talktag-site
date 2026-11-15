import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareMediaRepair } from '../scripts/prepare-ppp001-media-repair.mjs';
import { verifyRepairUploadInventory } from '../scripts/upload-ppp001-media-repair.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const speech = () => ({ speechLufs: -17, speechRmsDbfs: -18,
  weakestUtteranceRmsDbfs: -19, cueRmsDbfs: [-21, -21], cueAdvantageDb: -3,
  utterances: [{ key: '0', index: 0, start: .1, end: .5, rmsDbfs: -19, distinct: true }] });
const gates = { minimumSpeechLufs: -19, minimumUtteranceRmsDbfs: -25,
  maximumCueAdvantageDb: 3 };

function fixture() {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-media-repair-'));
  const cardId = 'en-vocal-camp-a1-001-ppp-v2';
  const media = [], before = [], after = [], baseline = [], finalQc = [];
  let replacement;
  for (let i = 0; i < 208; i++) {
    const stage = Math.floor(i / 4) + 1, ratio = [2, 2.5, 3, 3.5][i % 4];
    const variant = `clip_${String(stage).padStart(3, '0')}`
      + (ratio === 2.5 ? '' : `_${ratio.toFixed(1).replace('.', '_')}`);
    const bytes = Buffer.from(`original-voice-${i}`), oldSha = sha(bytes);
    const oldPath = join(folder, `old-${i}.mp3`);
    writeFileSync(oldPath, bytes);
    const oldKey = `ppp001/${cardId}/${variant}/${oldSha}.mp3`;
    media.push({ card_id: cardId, variant, r2_key: oldKey,
      sha256: oldSha, byte_length: bytes.length, mime_type: 'audio/mpeg' });
    const item = { id: 'ppp001-en-a1-vocal-camp', language: 'en', level: 'A1',
      track: 'vocal-camp', stage, ratio, audioPath: oldPath, sha256: oldSha,
      bytes: bytes.length, durationSeconds: 1.5, lines: [{ id: 'v1', text: 'Hello.', meaning: '안녕.' }],
      training: { cues: [{ s: .1, voiceStart: .1, voiceEnd: .5, e: 1.1 }] } };
    before.push(item);
    const checked = { id: item.id, language: 'en', level: 'A1', track: item.track,
      stage, ratio, status: i === 0 ? 'fail' : 'pass', durationSeconds: 1.5,
      sha256: oldSha, bytes: bytes.length,
      problems: i === 0 ? ['speech-loudness'] : [], speechQc: speech() };
    baseline.push(checked);
    if (i === 0) {
      const newBytes = Buffer.from('repaired-voice-0'), newSha = sha(newBytes);
      const newPath = join(folder, 'new-0.mp3');
      writeFileSync(newPath, newBytes);
      after.push({ ...item, audioPath: newPath, sha256: newSha, bytes: newBytes.length });
      finalQc.push({ ...checked, status: 'pass', problems: [], sha256: newSha,
        bytes: newBytes.length, speechQc: speech() });
      replacement = { id: item.id, card_id: cardId, variant,
        old_sha256: oldSha, new_sha256: newSha, old_path: oldPath,
        new_path: newPath, old_r2_key: oldKey, bytes: newBytes.length };
      replacement.duration_seconds = 1.5;
    } else {
      after.push(item);
      finalQc.push({ ...checked, status: 'pass', problems: [], speechQc: speech() });
    }
  }
  return { pack: { release: 'PPP001-20261114', episode: '001',
      rows: [{ media }] },
    repair: { schemaVersion: 1, episode: '001', replacementCount: 1,
      unchangedCount: 207, replacements: [replacement] },
    original: { schemaVersion: 1, episode: '001', status: 'release-approved', audio: before },
    baselineQc: { schemaVersion: 2, gates, counts: { pass: 207, fail: 1 }, records: baseline },
    final: { schemaVersion: 1, episode: '001', status: 'private-loudness-repair-not-published', audio: after },
    finalQc: { schemaVersion: 2, gates, counts: { pass: 208, fail: 0 }, records: finalQc } };
}

test('prepares only failed PPP001 audio as immutable upload and guarded media-row update', () => {
  const f = fixture();
  const result = prepareMediaRepair(f.pack, f.repair, f.original, f.baselineQc,
    f.final, f.finalQc);
  assert.equal(result.inventory.changedCount, 1);
  assert.equal(result.inventory.unchangedCount, 207);
  assert.equal(result.inventory.objects[0].sha256, f.repair.replacements[0].new_sha256);
  assert.match(result.inventory.objects[0].r2_key,
    new RegExp(`/${f.repair.replacements[0].new_sha256}\\.mp3$`));
  assert.match(result.applySql, /update public\.talktag_card_media/);
  assert.match(result.rollbackSql, /update public\.talktag_card_media/);
  assert(!/update public\.talktag_card_content|delete from public\.talktag_cards/i.test(result.applySql));
  assert(!/member_learning|learning_progress/i.test(result.applySql));
  assert(result.applySql.includes(f.repair.replacements[0].old_sha256));
  assert(result.rollbackSql.includes(f.repair.replacements[0].new_sha256));
  assert.equal(verifyRepairUploadInventory(result.inventory, result.inventory).length, 1);
  const altered = structuredClone(result.inventory);
  altered.objects[0].r2_key = altered.objects[0].previous_r2_key;
  assert.throws(() => verifyRepairUploadInventory(result.inventory, altered), /differs from checksum-bound/);
});

test('rejects a change to previously passing audio and a missing repair identity', () => {
  const f = fixture();
  const altered = Buffer.from('unapproved-change'), path = join(tmpdir(), `ppp001-unapproved-${Date.now()}.mp3`);
  writeFileSync(path, altered);
  f.final.audio[1] = { ...f.final.audio[1], audioPath: path,
    sha256: sha(altered), bytes: altered.length };
  f.finalQc.records[1].sha256 = sha(altered);
  f.finalQc.records[1].bytes = altered.length;
  assert.throws(() => prepareMediaRepair(f.pack, f.repair, f.original,
    f.baselineQc, f.final, f.finalQc), /baseline-passing media object was changed/);
  f.final.audio[1] = f.original.audio[1];
  f.finalQc.records[1].sha256 = f.original.audio[1].sha256;
  f.finalQc.records[1].bytes = f.original.audio[1].bytes;
  f.repair.replacements = [];
  assert.throws(() => prepareMediaRepair(f.pack, f.repair, f.original,
    f.baselineQc, f.final, f.finalQc), /Repair manifest replacement count differs/);
});
