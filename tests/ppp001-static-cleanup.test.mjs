import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { oldStaticAssets, verifyStaticCleanup } from '../scripts/cleanup-ppp001-static-assets.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const ids = Array.from({ length: 64 }, (_, i) => `new-${i}`);
  const oldIds = { oldCardIds: Array.from({ length: 67 }, (_, i) => `old-public-${i}`),
    oldProtectedCardIds: Array.from({ length: 67 }, (_, i) => `old-db-${i}`) };
  const pack = { release: 'PPP001-20261114', episode: '001', releaseReady: true,
    rows: ids.map(card_id => ({ card: { card_id } })) };
  const data = { sound: ids.map(id => ({ id })), readable: [], camps: {},
    titles: Object.fromEntries(ids.map(id => [id, { title: id }])),
    artwork: Object.fromEntries(ids.map(id => [id, { src: '/assets/ppp001-scenes/001-a1.jpg' }])) };
  const catalogSource = `(()=>{const d=${JSON.stringify(data)};window.TalkTagCardTitles=d.titles})();`;
  const now = Date.UTC(2026, 10, 15, 0);
  const audit = { schemaVersion: 1, release: pack.release, liveVerified: true,
    memberLearningRetentionVerified: true, staticAssetReferenceAuditPassed: true,
    oldProtectedIdsSha256: hash(oldIds.oldProtectedCardIds.join('\n')),
    newCardIdsSha256: hash(ids.join('\n')), publicCatalogSha256: hash(catalogSource),
    verifiedAt: new Date(now).toISOString() };
  return { audit, pack, oldIds, catalogSource, references: [], now };
}

test('cleanup inventory selects only unshared old English/Korean 001 art', () => {
  const assets = verifyStaticCleanup(fixture());
  assert.equal(assets.length, 21);
  assert.ok(assets.every(path => !path.includes('/ja/') && !path.includes('native-001')));
  assert.ok(assets.every(path => !path.includes('ppp001-scenes')));
  assert.equal(new Set(assets).size, assets.length);
  assert.deepEqual(assets, oldStaticAssets);
});

test('cleanup refuses missing live evidence or changed catalog', () => {
  const release = fixture();
  release.audit.liveVerified = false;
  assert.throws(() => verifyStaticCleanup(release), /Live release/);
  release.audit.liveVerified = true;
  release.catalogSource += 'changed';
  assert.throws(() => verifyStaticCleanup(release), /checksum changed/);
});

test('cleanup refuses old cards and referenced old art', () => {
  const release = fixture();
  release.references = [['another-page.html', '/assets/bootcamp-scenes/en/001-v3-vocal.jpg']];
  assert.throws(() => verifyStaticCleanup(release), /still referenced/);
  release.references = [];
  release.catalogSource = release.catalogSource.replace('"new-0"', '"old-public-0"');
  release.audit.publicCatalogSha256 = hash(release.catalogSource);
  assert.throws(() => verifyStaticCleanup(release), /old 001 card remains/);
});
