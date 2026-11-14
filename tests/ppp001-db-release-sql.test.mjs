import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { buildPostLiveCleanupSql, buildReleaseSql, validateReleasePack } from '../scripts/build-ppp001-db-release-sql.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const areas = ['readable', 'guided-listen-repeat', 'mini-talks', 'vocal-camp', 'story-camp'];

function fixture() {
  const rows = [];
  const signoffSha = 'd'.repeat(64);
  for (const language of ['en', 'ko']) for (const level of levels) for (const area of areas) {
    if (level === 'A0' && !['readable', 'guided-listen-repeat'].includes(area)) continue;
    const id = `${language}-${area}-${level.toLowerCase()}-001-ppp-v2`;
    const variant = area === 'vocal-camp' ? 'clip_001' : 'main';
    const needsAudio = ['guided-listen-repeat', 'mini-talks', 'vocal-camp'].includes(area);
    const artwork = `/assets/ppp001-scenes/001-${level.toLowerCase()}.jpg`;
    rows.push({
      card: { card_id: id, language, area, level, ordinal: 1, published: false, catalog_visible: false },
      content: { card_id: id, payload: { id, title: "A neighbor's hello", artwork, artworkAlt: 'Two people meet.' } },
      artwork: { path: artwork, alt: 'Two people meet.', qcRecord: `${signoffSha}#${id}` },
      editorialProof: { sourceDraftSha256: 'e'.repeat(64), targetSourceSha256: 'f'.repeat(64),
        editorialQcRecord: `${signoffSha}#${id}`, rightsQcRecord: `${signoffSha}#${id}`,
        reviewType: 'Codex AI editorial; not human or native review' },
      requiredMediaVariants: needsAudio ? [variant] : [],
      media: needsAudio ? [{ card_id: id, variant, r2_key: `ppp001/${id}/${variant}.mp3`,
        mime_type: 'audio/mpeg', byte_length: 200, sha256: 'b'.repeat(64) }] : [],
      ...(area === 'readable' ? { readableReview: { reviewStatus: 'ai-editorial-approved',
        displayEligible: true, nativeReviewed: false, editorialQcRecord: 'private-ai-editorial-qc',
        sourceHash: '1'.repeat(64), translationHash: '2'.repeat(64),
        humanReviewPerformed: false, humanReviewDisposition: 'waived-by-user',
        waiverSha256: '3'.repeat(64) } } : {})
    });
  }
  return {
    pack: { release: 'PPP001-20261114', episode: '001', releaseReady: true, issues: [], rows,
      audioAssembly: { status: 'release-approved', qcSha256: 'c'.repeat(64) },
      editorialOverlay: { sourceSha256: signoffSha, cardCount: 64,
        reviewType: 'Codex AI editorial; not human or native review' },
      readableHumanReview: { status: 'waived-by-user', humanReviewPerformed: false,
        sourceSha256: '3'.repeat(64), evidence: 'User requested bypass of human review.' } },
    audit: { publicCatalogSha256: 'a'.repeat(64),
      oldCardIds: Array.from({ length: 67 }, (_, i) => `public-old-001-${i + 1}`),
      oldProtectedCardIds: Array.from({ length: 67 }, (_, i) => `db-old-001-${i + 1}`) }
  };
}

test('14 stage batches and activation select exact protected DB IDs, not public aliases or SR001', () => {
  const { pack, audit } = fixture();
  assert.equal(validateReleasePack(pack, audit).newIds.length, 64);
  const result = buildReleaseSql(pack, audit, 'c'.repeat(64));
  assert.equal(Object.keys(result.stages).length, 14);
  assert.match(result.stages['stage-en-a0.sql'], /true, false\)/);
  assert.match(result.stages['stage-en-a0.sql'], /A neighbor''s hello/);
  assert.match(result.activate, /set catalog_visible=false/);
  assert.match(result.rollback, /set catalog_visible=true/);
  assert(result.activate.includes('db-old-001-1'));
  assert(!result.activate.includes('public-old-001-1'));
  assert(!/\blike\b/i.test(result.activate));
  assert(!/'[^']*sr001[^']*'/i.test(result.activate));
});

test('a Readable AI sign-off does not imply human review or a user waiver', () => {
  const { pack, audit } = fixture();
  delete pack.readableHumanReview;
  assert.throws(() => validateReleasePack(pack, audit), /human review needs explicit user waiver/);
  pack.readableHumanReview = { status: 'waived-by-user', humanReviewPerformed: false,
    sourceSha256: '3'.repeat(64), evidence: 'User waiver' };
  const row = pack.rows.find(item => item.card.area === 'readable');
  row.readableReview.waiverSha256 = '4'.repeat(64);
  assert.throws(() => validateReleasePack(pack, audit), /AI review or user waiver is missing/);
});

test('technical media staging cannot be mistaken for release approved audio', () => {
  const { pack, audit } = fixture();
  pack.audioAssembly.status = 'technical-audio-passed-transcript-limited-not-publishable';
  assert.throws(() => validateReleasePack(pack, audit), /approved audio assembly QC/);
});

test('post-live deletion is unavailable without full live and unshared R2 audit evidence', () => {
  const { pack, audit } = fixture();
  const release = buildReleaseSql(pack, audit);
  assert.throws(() => buildPostLiveCleanupSql(release, {}), /audit evidence/);
  const proof = { schemaVersion: 1, release: 'PPP001-20261114', liveVerified: true,
    memberLearningRetentionVerified: true, dashboardTombstoneMigrationVerified: true,
    r2ReferenceAuditPassed: true,
    oldProtectedIdsSha256: hash(release.oldIds.join('\n')),
    newCardIdsSha256: hash(release.newIds.join('\n')),
    verifiedAt: '2026-11-15T01:00:00Z', oldR2Keys: ['old/one.mp3', 'old/two.mp3'],
    unsharedOldR2Keys: ['old/one.mp3'] };
  const cleanup = buildPostLiveCleanupSql(release, proof);
  assert.match(cleanup.sql, /insert into public\.talktag_retired_card_metadata/);
  assert.match(cleanup.sql, /Old 001 R2 inventory changed/);
  assert.match(cleanup.sql, /delete from public\.talktag_cards/);
  assert(!/delete from public\.(?:learning_progress|member_learning_history|member_learning_state)/.test(cleanup.sql));
  assert.deepEqual(cleanup.r2Candidates.map(item => item.r2Key), ['old/one.mp3']);
  proof.unsharedOldR2Keys.push(release.mediaKeys[0]);
  assert.throws(() => buildPostLiveCleanupSql(release, proof), /unshared-object subset/);
});

test('unready pack and missing audio cannot produce SQL', () => {
  const { pack, audit } = fixture();
  pack.releaseReady = false;
  assert.throws(() => buildReleaseSql(pack, audit), /release gates remain open/);
  pack.releaseReady = true;
  pack.rows.find(row => row.card.area === 'guided-listen-repeat').media = [];
  assert.throws(() => buildReleaseSql(pack, audit), /protected media variants incomplete/);
});
