#!/usr/bin/env node
// Offline SQL generator. No database connection, upload, or publication occurs here.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const areas = ['readable', 'guided-listen-repeat', 'mini-talks', 'vocal-camp', 'story-camp'];
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const quote = value => {
  if (typeof value !== 'string' || value.includes('\0')) fail('Invalid SQL text');
  return `'${value.replaceAll("'", "''")}'`;
};
const sqlArray = values => `array[${values.map(quote).join(', ')}]::text[]`;

export function validateReleasePack(pack, audit) {
  if (pack.release !== 'PPP001-20261114' || pack.episode !== '001'
    || pack.releaseReady !== true || pack.issues?.length) fail('PPP001 release gates remain open');
  if (pack.audioAssembly?.status !== 'release-approved'
    || !/^[a-f0-9]{64}$/.test(pack.audioAssembly.qcSha256 || ''))
    fail('PPP001 release needs source-bound approved audio assembly QC');
  const proof = pack.editorialOverlay;
  if (proof?.reviewType !== 'Codex AI editorial; not human or native review'
    || proof.cardCount !== 64 || !/^[a-f0-9]{64}$/.test(proof.sourceSha256 || ''))
    fail('PPP001 pack needs a full checksum-bound AI editorial sign-off');
  const readableWaiver = pack.readableHumanReview;
  if (readableWaiver?.status !== 'waived-by-user'
    || readableWaiver.humanReviewPerformed !== false
    || !/^[a-f0-9]{64}$/.test(readableWaiver.sourceSha256 || '')
    || !readableWaiver.evidence)
    fail('PPP001 Readable human review needs explicit user waiver evidence');
  const oldIds = audit.oldProtectedCardIds;
  if (!Array.isArray(oldIds) || oldIds.length !== 67 || new Set(oldIds).size !== 67
    || !/^[a-f0-9]{64}$/.test(audit.publicCatalogSha256 || ''))
    fail('Expected 67 audited protected old-card IDs and catalog hash');
  if (!Array.isArray(pack.rows) || pack.rows.length < 64) fail('PPP001 pack is incomplete');
  const groups = new Map(), newIds = new Set(), mediaKeys = new Set();
  for (const row of pack.rows) {
    const card = row.card, content = row.content, payload = content?.payload;
    if (!card || !payload || !/^(?:en-|ko-|mt-en-|mt-ko-)[a-z0-9-]+-ppp-v2(?:-part\d+)?$/.test(card.card_id)
      || !['en', 'ko'].includes(card.language) || !levels.includes(card.level)
      || !areas.includes(card.area) || card.ordinal !== 1 || card.published !== false
      || card.catalog_visible !== false || content.card_id !== card.card_id
      || payload.id !== card.card_id || !payload.title || !payload.artworkAlt
      || row.artwork?.path !== payload.artwork || !row.artwork?.qcRecord)
      fail(`Malformed or unapproved PPP001 row ${card?.card_id || ''}`);
    const baseId = card.card_id.replace(/-part\d+$/, '');
    const evidence = `${proof.sourceSha256}#${baseId}`;
    if (!/^[a-f0-9]{64}$/.test(row.editorialProof?.sourceDraftSha256 || '')
      || !/^[a-f0-9]{64}$/.test(row.editorialProof?.targetSourceSha256 || '')
      || row.editorialProof.reviewType !== proof.reviewType
      || !row.editorialProof.editorialQcRecord?.includes(evidence)
      || !row.editorialProof.rightsQcRecord?.includes(evidence)
      || !row.artwork.qcRecord.includes(evidence))
      fail(`${card.card_id}: per-card checksum-bound AI sign-off missing`);
    if (oldIds.includes(card.card_id) || newIds.has(card.card_id))
      fail(`Duplicate or legacy card ID ${card.card_id}`);
    newIds.add(card.card_id);
    const key = `${card.language}:${card.level}:${card.area}`;
    groups.set(key, (groups.get(key) || 0) + 1);
    const required = new Set(row.requiredMediaVariants || []);
    const actual = new Set((row.media || []).map(media => media.variant));
    if (required.size !== actual.size || [...required].some(variant => !actual.has(variant)))
      fail(`${card.card_id}: protected media variants incomplete`);
    if (['guided-listen-repeat', 'mini-talks'].includes(card.area) && !required.has('main'))
      fail(`${card.card_id}: main audio missing`);
    if (card.area === 'vocal-camp' && !required.size)
      fail(`${card.card_id}: cumulative Vocal audio missing`);
    for (const media of row.media || []) {
      if (media.card_id !== card.card_id || !/^[a-f0-9]{64}$/.test(media.sha256 || '')
        || !Number.isSafeInteger(media.byte_length) || media.byte_length <= 0
        || !media.r2_key || mediaKeys.has(media.r2_key))
        fail(`${card.card_id}: invalid or duplicate R2 media record`);
      mediaKeys.add(media.r2_key);
    }
    if (card.area === 'readable') {
      const review = row.readableReview;
      if (review?.displayEligible !== true || review.reviewStatus !== 'ai-editorial-approved'
        || !review.editorialQcRecord || review.nativeReviewed !== false
        || review.humanReviewPerformed !== false
        || review.humanReviewDisposition !== 'waived-by-user'
        || review.waiverSha256 !== readableWaiver.sourceSha256
        || !/^[a-f0-9]{64}$/.test(review.sourceHash || '')
        || !/^[a-f0-9]{64}$/.test(review.translationHash || ''))
        fail(`${card.card_id}: bilingual Readable AI review or user waiver is missing`);
    }
  }
  for (const language of ['en', 'ko']) for (const level of levels) for (const area of areas) {
    if (level === 'A0' && !['readable', 'guided-listen-repeat'].includes(area)) continue;
    const count = groups.get(`${language}:${level}:${area}`) || 0;
    if (!count || (area !== 'guided-listen-repeat' && count !== 1))
      fail(`Missing or duplicate PPP001 group ${language}:${level}:${area}`);
  }
  return { oldIds, newIds: [...newIds], mediaKeys: [...mediaKeys] };
}

const header = (packHash, label) => `-- PPP001-20261114 ${label}; approved pack SHA-256 ${packHash}\n`
  + '-- Generated offline. Review before use. SR001 and member learning records are outside every update.\n';

function stageSql(rows, oldIds, packHash, language, level) {
  const ids = rows.map(row => row.card.card_id);
  const cards = rows.map(({ card }) => `  (${[card.card_id, card.language, card.area, card.level].map(quote).join(', ')}, 1, true, false)`).join(',\n');
  const content = rows.map(({ content }) => `  (${quote(content.card_id)}, ${quote(JSON.stringify(content.payload))}::jsonb)`).join(',\n');
  const media = rows.flatMap(row => row.media || []);
  const mediaRows = media.map(item => `  (${[item.card_id, item.variant, item.r2_key, item.mime_type].map(quote).join(', ')}, ${item.byte_length}, ${quote(item.sha256)})`).join(',\n');
  return header(packHash, `stage ${language} ${level}`)
    + `begin;\nset local lock_timeout = '5s';\n`
    + `select pg_advisory_xact_lock(hashtext('PPP001-20261114'));\n`
    + `do $ppp$ begin\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(oldIds)}) and published and catalog_visible) <> 67 then\n`
    + `    raise exception 'Old protected 001 inventory changed; re-audit';\n  end if;\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(ids)})) <> 0 then\n`
    + `    raise exception 'New PPP001 stage IDs already exist; reconcile before retry';\n  end if;\nend $ppp$;\n`
    + `insert into public.talktag_cards (card_id, language, area, level, ordinal, published, catalog_visible) values\n${cards};\n`
    + `insert into public.talktag_card_content (card_id, payload) values\n${content};\n`
    + (media.length ? `insert into public.talktag_card_media (card_id, variant, r2_key, mime_type, byte_length, sha256) values\n${mediaRows};\n` : '')
    + `commit;\n-- ${rows.length} new protected rows staged; directly accessible for entitled-member QC, absent from lists.\n`;
}

function activateSql(rows, oldIds, packHash) {
  const newIds = rows.map(row => row.card.card_id);
  const mediaCounts = rows.map(row => `  (${quote(row.card.card_id)}, ${(row.media || []).length})`).join(',\n');
  return header(packHash, 'activate') + `begin;\nset local lock_timeout = '5s';\n`
    + `select pg_advisory_xact_lock(hashtext('PPP001-20261114'));\n`
    + `do $ppp$ begin\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(oldIds)}) and published and catalog_visible) <> 67 then\n`
    + `    raise exception 'Old 001 catalog changed; activation aborted';\n  end if;\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(newIds)}) and published and not catalog_visible) <> ${rows.length} then\n`
    + `    raise exception 'New PPP001 stage incomplete';\n  end if;\n`
    + `  if (select count(*) from public.talktag_card_content where card_id = any(${sqlArray(newIds)})) <> ${rows.length} then\n`
    + `    raise exception 'New PPP001 protected content incomplete';\n  end if;\n`
    + `  if exists (select 1 from (values\n${mediaCounts}\n) as expected(card_id, media_count)\n`
    + `    where (select count(*) from public.talktag_card_media m where m.card_id = expected.card_id) <> expected.media_count) then\n`
    + `    raise exception 'New PPP001 media inventory incomplete';\n  end if;\nend $ppp$;\n`
    + `update public.talktag_cards set catalog_visible=false, updated_at=now() where card_id = any(${sqlArray(oldIds)});\n`
    + `update public.talktag_cards set catalog_visible=true, updated_at=now() where card_id = any(${sqlArray(newIds)});\n`
    + `commit;\n-- Exactly 67 old protected IDs hidden and ${rows.length} new IDs active.\n`;
}

function rollbackSql(rows, oldIds, packHash) {
  const newIds = rows.map(row => row.card.card_id);
  return header(packHash, 'rollback before post-live cleanup') + `begin;\nset local lock_timeout = '5s';\n`
    + `select pg_advisory_xact_lock(hashtext('PPP001-20261114'));\n`
    + `update public.talktag_cards set catalog_visible=false, updated_at=now() where card_id = any(${sqlArray(newIds)});\n`
    + `update public.talktag_cards set catalog_visible=true, updated_at=now() where card_id = any(${sqlArray(oldIds)}) and published;\n`
    + `commit;\n-- Protected rows and media remain intact for rollback and learner history.\n`;
}

export function buildReleaseSql(pack, audit, packHash = 'unrecorded') {
  const { oldIds, newIds, mediaKeys } = validateReleasePack(pack, audit);
  const stages = {};
  for (const language of ['en', 'ko']) for (const level of levels) {
    const rows = pack.rows.filter(row => row.card.language === language && row.card.level === level);
    stages[`stage-${language}-${level.toLowerCase()}.sql`] = stageSql(rows, oldIds, packHash, language, level);
  }
  return { stages, activate: activateSql(pack.rows, oldIds, packHash),
    rollback: rollbackSql(pack.rows, oldIds, packHash), oldIds, newIds, mediaKeys };
}

// This optional second phase is never emitted from a pre-release pack alone.
// The audit comes from *after* new PPP001 has passed live learner checks.
export function buildPostLiveCleanupSql(release, auditEvidence) {
  const oldHash = sha(release.oldIds.join('\n'));
  const newHash = sha(release.newIds.join('\n'));
  if (auditEvidence?.schemaVersion !== 1 || auditEvidence.release !== 'PPP001-20261114'
    || auditEvidence.liveVerified !== true || auditEvidence.memberLearningRetentionVerified !== true
    || auditEvidence.dashboardTombstoneMigrationVerified !== true
    || auditEvidence.r2ReferenceAuditPassed !== true
    || auditEvidence.oldProtectedIdsSha256 !== oldHash
    || auditEvidence.newCardIdsSha256 !== newHash
    || !Number.isFinite(Date.parse(auditEvidence.verifiedAt || '')))
    fail('Post-live deletion needs dated live, dashboard/member-record and R2 reference audit evidence');
  const oldR2 = auditEvidence.oldR2Keys;
  const unshared = auditEvidence.unsharedOldR2Keys;
  if (!Array.isArray(oldR2) || !oldR2.length || new Set(oldR2).size !== oldR2.length
    || !Array.isArray(unshared) || new Set(unshared).size !== unshared.length
    || unshared.some(key => !oldR2.includes(key) || release.mediaKeys.includes(key)))
    fail('Old R2 inventory or unshared-object subset is invalid');
  const sql = `-- Post-live cleanup of 67 *protected* old 001 rows only; approved ${auditEvidence.verifiedAt}.\n`
    + '-- Only catalog metadata is retained for member history. Child content/media rows cascade.\n'
    + '-- Member-owned progress, resume and history records are not updated or deleted.\n'
    + `begin;\nset local lock_timeout = '5s';\nselect pg_advisory_xact_lock(hashtext('PPP001-20261114'));\n`
    + `do $ppp$ begin\n`
    + `  if to_regclass('public.talktag_retired_card_metadata') is null then\n`
    + `    raise exception 'Apply retired-learning metadata migration before deletion';\n  end if;\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(release.oldIds)}) and published and not catalog_visible) <> 67 then\n`
    + `    raise exception 'Old 001 archive inventory changed; deletion aborted';\n  end if;\n`
    + `  if (select count(*) from public.talktag_retired_card_metadata where card_id = any(${sqlArray(release.oldIds)})) <> 0 then\n`
    + `    raise exception 'Old 001 tombstones already exist; reconcile before deletion';\n  end if;\n`
    + `  if (select coalesce(array_agg(r2_key order by r2_key),array[]::text[]) from public.talktag_card_media\n`
    + `      where card_id = any(${sqlArray(release.oldIds)})) is distinct from ${sqlArray([...oldR2].sort())} then\n`
    + `    raise exception 'Old 001 R2 inventory changed; re-audit before deletion';\n  end if;\n`
    + `  if (select count(*) from public.talktag_cards where card_id = any(${sqlArray(release.newIds)}) and published and catalog_visible) <> ${release.newIds.length} then\n`
    + `    raise exception 'New PPP001 not fully live; deletion aborted';\n  end if;\nend $ppp$;\n`
    + `insert into public.talktag_retired_card_metadata\n`
    + `  (card_id,language,area,level,ordinal,title,release,retired_at)\n`
    + `select c.card_id,c.language,c.area,c.level,c.ordinal,coalesce(cc.payload->>'title',''),\n`
    + `  'PPP001-20261114',now() from public.talktag_cards c\n`
    + `left join public.talktag_card_content cc on cc.card_id=c.card_id\n`
    + `where c.card_id = any(${sqlArray(release.oldIds)});\n`
    + `delete from public.talktag_cards where card_id = any(${sqlArray(release.oldIds)});\ncommit;\n`
    + `-- Delete only the audited unshared R2 keys in the separate object-store step.\n`;
  return { sql, r2Candidates: unshared.map(key => ({ r2Key: key, status: 'verified-unshared-candidate' })) };
}

function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--pack') options.pack = resolve(argv[++i] || fail('--pack needs a file'));
    else if (arg === '--old-ids') options.oldIds = resolve(argv[++i] || fail('--old-ids needs a file'));
    else if (arg === '--out-dir') options.out = resolve(argv[++i] || fail('--out-dir needs a directory'));
    else if (arg === '--post-live-audit') options.postLiveAudit = resolve(argv[++i] || fail('--post-live-audit needs a file'));
    else fail(`Unknown argument ${arg}`);
  }
  if (!options.pack || !options.out) fail('Use --pack and --out-dir');
  options.oldIds ||= resolve(repository, 'docs/releases/ppp001-old-ids.json');
  if (options.out === repository || options.out.startsWith(`${repository}/`))
    fail('Private SQL output must remain outside the site repository');
  const packBytes = readFileSync(options.pack);
  const release = buildReleaseSql(JSON.parse(packBytes), JSON.parse(readFileSync(options.oldIds, 'utf8')), sha(packBytes));
  mkdirSync(options.out, { recursive: true });
  for (const [name, sql] of Object.entries(release.stages)) writeFileSync(resolve(options.out, name), sql);
  writeFileSync(resolve(options.out, 'activate-ppp001.sql'), release.activate);
  writeFileSync(resolve(options.out, 'rollback-ppp001.sql'), release.rollback);
  if (options.postLiveAudit) {
    const cleanup = buildPostLiveCleanupSql(release, JSON.parse(readFileSync(options.postLiveAudit, 'utf8')));
    writeFileSync(resolve(options.out, 'delete-old-001-after-live-verification.sql'), cleanup.sql);
    writeFileSync(resolve(options.out, 'unshared-old-r2-delete-candidates.json'), `${JSON.stringify(cleanup.r2Candidates, null, 2)}\n`);
  }
  console.log(`Private PPP001 SQL prepared: 14 stage files, ${release.newIds.length} new IDs, 67 audited protected old IDs.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`PPP001 SQL build failed: ${error.message}`); process.exitCode = 1; }
}
