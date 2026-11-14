import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateDeletionInputs, validateRemoteInventory } from '../scripts/delete-ppp001-old-r2.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');

function fixture() {
  const oldMedia = Array.from({ length: 120 }, (_, i) => ({
    key: `legacy/001/${String(i).padStart(3, '0')}.mp3`, bytes: i + 100, other_refs: 0
  }));
  const oldIds = { oldProtectedCardIds: Array.from({ length: 67 }, (_, i) => `old-${i}`) };
  const rows = Array.from({ length: 70 }, (_, i) => ({
    card: { card_id: `new-${i}` },
    media: Array.from({ length: i < 68 ? 3 : 2 }, (_, j) => ({
      r2_key: `ppp001/new-${i}/${j}.mp3`, byte_length: 1000 + i + j
    }))
  }));
  const pack = { release: 'PPP001-20261114', episode: '001', releaseReady: true, rows };
  const catalogSource = 'approved catalog';
  const keys = oldMedia.map(item => item.key);
  const audit = {
    schemaVersion: 1, release: pack.release, verifiedAt: new Date().toISOString(),
    liveVerified: true, memberLearningRetentionVerified: true,
    dashboardTombstoneMigrationVerified: true, r2ReferenceAuditPassed: true,
    oldProtectedIdsSha256: sha(oldIds.oldProtectedCardIds.join('\n')),
    newCardIdsSha256: sha(rows.map(row => row.card.card_id).join('\n')),
    publicCatalogSha256: sha(catalogSource),
    oldR2Keys: keys, unsharedOldR2Keys: keys,
    evidence: { oldR2KeyListSha256: sha(keys.join('\n')),
      oldR2Bytes: oldMedia.reduce((sum, item) => sum + item.bytes, 0) }
  };
  return { audit, oldMedia, pack, oldIds, catalogSource };
}

test('exact audited old keys and all replacement keys pass the dry-run guard', () => {
  const inputs = fixture();
  const release = validateDeletionInputs(inputs);
  assert.equal(release.old.length, 120);
  assert.equal(release.replacement.length, 208);
  const objects = [
    ...release.old.map(item => ({ key: item.key, bytes: item.bytes })),
    ...release.replacement.map(item => ({ key: item.r2_key, bytes: item.byte_length }))
  ];
  assert.equal(validateRemoteInventory({ objects, ...release }).size, 328);
  assert.throws(() => validateRemoteInventory({ objects: objects.slice(1), ...release }), /Old R2 object missing/);
  assert.throws(() => validateRemoteInventory({ objects: objects.slice(0, -1), ...release }), /Replacement R2 object missing/);
});

test('shared, collided, or changed inventories cannot be deleted', () => {
  const shared = fixture();
  shared.oldMedia[0].other_refs = 1;
  assert.throws(() => validateDeletionInputs(shared), /incomplete or shared/);
  const collided = fixture();
  collided.pack.rows[0].media[0].r2_key = collided.oldMedia[0].key;
  assert.throws(() => validateDeletionInputs(collided), /collide/);
  const changed = fixture();
  changed.audit.publicCatalogSha256 = sha('wrong catalog');
  assert.throws(() => validateDeletionInputs(changed), /catalog changed/);
});
