#!/usr/bin/env node
// Offline preparation only: immutable R2 upload list and compare-and-swap SQL
// for the approved PPP001 loudness repair. No network or database calls.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bridgeReleaseMedia } from './bridge-ppp001-release-media.mjs';
import { finalCardId } from './build-ppp001-payloads.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const quote = value => {
  if (typeof value !== 'string' || value.includes('\0')) fail('Unsafe SQL value');
  return `'${value.replaceAll("'", "''")}'`;
};
const identity = item => [item.id, item.language, item.level, item.track,
  item.partIndex || 1, item.stage || 0, item.ratio || 0].join('|');
const pair = item => `${item.card_id}|${item.variant}`;
const isHash = value => /^[a-f0-9]{64}$/.test(value || '');
const gatesPass = qc => qc?.schemaVersion === 2 && qc.gates?.minimumSpeechLufs >= -19
  && qc.gates?.minimumUtteranceRmsDbfs >= -25 && qc.gates?.maximumCueAdvantageDb <= 3;

function cardIdFor(item) {
  const area = { glr: 'guided', 'mini-talks': 'miniTalks', 'vocal-camp': 'vocalCamp' }[item.track];
  if (!area) fail(`Unknown audio area ${item.track}`);
  const base = finalCardId(item.language, item.level, area);
  return item.track === 'glr' && Number(item.partCount || 1) > 1
    ? `${base}-part${item.partIndex}` : base;
}

function variantFor(item) {
  if (item.track !== 'vocal-camp') return 'main';
  const stage = Number(item.stage), ratio = Number(item.ratio);
  if (!Number.isSafeInteger(stage) || stage < 1 || ![2, 2.5, 3, 3.5].includes(ratio))
    fail(`Invalid Vocal variant identity ${identity(item)}`);
  const stem = `clip_${String(stage).padStart(3, '0')}`;
  return ratio === 2.5 ? stem : `${stem}_${ratio.toFixed(1).replace('.', '_')}`;
}

function verifyFile(path, digest, bytes) {
  if (!existsSync(path) || statSync(path).size !== bytes || sha(readFileSync(path)) !== digest)
    fail(`Audio checksum or size changed: ${path}`);
}

function uniqueMap(items, key, label) {
  const result = new Map();
  for (const item of items) {
    const k = key(item);
    if (result.has(k)) fail(`Duplicate ${label}: ${k}`);
    result.set(k, item);
  }
  return result;
}

function assertUnchangedFields(oldItem, newItem) {
  const altered = new Set(['audioPath', 'sha256', 'bytes', 'durationSeconds', 'lufs', 'truePeak']);
  for (const [name, value] of Object.entries(oldItem)) {
    if (!altered.has(name) && JSON.stringify(newItem[name]) !== JSON.stringify(value))
      fail(`${identity(oldItem)}: media-only repair changed ${name}`);
  }
  if (Math.abs(newItem.durationSeconds - oldItem.durationSeconds) > .03)
    fail(`${identity(oldItem)}: audio duration changed beyond codec tolerance`);
}

function sqlFor(replacements, hashes, rollback = false) {
  const label = rollback ? 'ROLLBACK' : 'APPLY';
  const values = replacements.map(item => {
    const old = rollback ? item.next : item.old;
    const next = rollback ? item.old : item.next;
    return `  (${[item.card_id, item.variant, old.r2_key, old.sha256,
      next.r2_key, next.sha256].map(quote).join(', ')}, ${old.byte_length}, ${next.byte_length})`;
  }).join(',\n');
  const expected = replacements.length;
  return `-- PPP001 media-only ${label}; pack ${hashes.pack}, repair ${hashes.repair}, speech QC ${hashes.qc}.\n`
    + '-- Upload and checksum-verify every new immutable R2 object before APPLY.\n'
    + '-- Keep old R2 objects until live playback and rollback checks pass.\n'
    + 'begin;\nset local lock_timeout = \'5s\';\n'
    + "select pg_advisory_xact_lock(hashtext('PPP001-20261114-media-repair'));\n"
    + `create temporary table ppp001_media_swap on commit drop as\n`
    + `select * from (values\n${values}\n) as v(card_id,variant,old_r2_key,old_sha256,new_r2_key,new_sha256,old_bytes,new_bytes);\n`
    + `do $repair$ begin\n`
    + `  if (select count(*) from ppp001_media_swap) <> ${expected}\n`
    + `    or (select count(*) from public.talktag_card_media m join ppp001_media_swap v\n`
    + `      on m.card_id=v.card_id and m.variant=v.variant and m.r2_key=v.old_r2_key\n`
    + `      and m.sha256=v.old_sha256 and m.byte_length=v.old_bytes\n`
    + `      join public.talktag_cards c on c.card_id=m.card_id\n`
    + `      where c.published and c.catalog_visible) <> ${expected} then\n`
    + `    raise exception 'PPP001 media inventory changed; no rows updated';\n`
    + `  end if;\nend $repair$;\n`
    + `update public.talktag_card_media m\n`
    + `set r2_key=v.new_r2_key, sha256=v.new_sha256, byte_length=v.new_bytes\n`
    + `from ppp001_media_swap v where m.card_id=v.card_id and m.variant=v.variant\n`
    + `  and m.r2_key=v.old_r2_key and m.sha256=v.old_sha256 and m.byte_length=v.old_bytes;\n`
    + `do $repair$ begin\n`
    + `  if (select count(*) from public.talktag_card_media m join ppp001_media_swap v\n`
    + `      on m.card_id=v.card_id and m.variant=v.variant and m.r2_key=v.new_r2_key\n`
    + `      and m.sha256=v.new_sha256 and m.byte_length=v.new_bytes) <> ${expected} then\n`
    + `    raise exception 'PPP001 media update incomplete; transaction rolled back';\n`
    + `  end if;\nend $repair$;\ncommit;\n`
    + `-- ${expected} media rows changed; cards, content, and member progress untouched.\n`;
}

function preflightSql(replacements, hashes) {
  const values = replacements.map(item =>
    `  (${[item.card_id, item.variant, item.old.r2_key,
      item.old.sha256].map(quote).join(', ')}, ${item.old.byte_length})`).join(',\n');
  return `-- Read-only PPP001 media preflight; pack ${hashes.pack}, repair ${hashes.repair}.\n`
    + `-- exact_live_rows must equal ${replacements.length}; joined_rows must also equal ${replacements.length}.\n`
    + `with expected(card_id,variant,r2_key,sha256,byte_length) as (values\n${values}\n),\n`
    + `checked as (select e.*, m.card_id as found_media, m.r2_key as actual_key,\n`
    + `  m.sha256 as actual_sha, m.byte_length as actual_bytes,\n`
    + `  c.published as actual_published, c.catalog_visible as actual_visible\n`
    + `  from expected e left join public.talktag_card_media m\n`
    + `    on m.card_id=e.card_id and m.variant=e.variant\n`
    + `  left join public.talktag_cards c on c.card_id=e.card_id)\n`
    + `select count(*) as joined_rows,\n`
    + `  count(*) filter (where found_media is not null and actual_key=r2_key\n`
    + `    and actual_sha=sha256 and actual_bytes=byte_length\n`
    + `    and actual_published and actual_visible) as exact_live_rows\n`
    + `from checked;\n`;
}

export function prepareMediaRepair(pack, repair, original, baselineQc, final, finalQc,
  hashes = { pack: 'fixture', repair: 'fixture', qc: 'fixture' }) {
  if (pack.release !== 'PPP001-20261114' || pack.episode !== '001'
    || repair.schemaVersion !== 1 || repair.episode !== '001'
    || original.schemaVersion !== 1 || final.schemaVersion !== 1
    || !gatesPass(baselineQc) || !gatesPass(finalQc))
    fail('Expected PPP001 pack, repair manifest and speech QC v2 evidence');
  const packMedia = pack.rows.flatMap(row => row.media || []);
  if (packMedia.length !== 208 || original.audio?.length !== 208 || final.audio?.length !== 208
    || baselineQc.records?.length !== 208 || finalQc.records?.length !== 208)
    fail('PPP001 requires the exact 208-object media inventory');
  const byPair = uniqueMap(packMedia, pair, 'pack media pair');
  const bySha = uniqueMap(packMedia, item => item.sha256, 'pack media SHA');
  const originalMap = uniqueMap(original.audio, identity, 'original audio identity');
  const finalMap = uniqueMap(final.audio, identity, 'repaired audio identity');
  const baselineMap = uniqueMap(baselineQc.records, identity, 'baseline speech QC identity');
  const finalQcMap = uniqueMap(finalQc.records, identity, 'final speech QC identity');
  const changed = [];
  for (const [k, before] of originalMap) {
    const after = finalMap.get(k), oldQc = baselineMap.get(k), newQc = finalQcMap.get(k);
    if (!after || !oldQc || !newQc) fail(`${k}: incomplete audio or QC identity`);
    assertUnchangedFields(before, after);
    if (oldQc.sha256 !== before.sha256 || oldQc.bytes !== before.bytes
      || newQc.sha256 !== after.sha256 || newQc.bytes !== after.bytes)
      fail(`${k}: speech QC checksum or bytes differ from audio assembly`);
    const known = bySha.get(before.sha256);
    if (!known || known.card_id !== cardIdFor(before) || known.variant !== variantFor(before))
      fail(`${k}: original audio does not match the published pack identity`);
    verifyFile(before.audioPath, before.sha256, before.bytes);
    verifyFile(after.audioPath, after.sha256, after.bytes);
    if (oldQc.status === 'fail') changed.push({ card_id: known.card_id, variant: known.variant,
      old: { r2_key: known.r2_key, sha256: before.sha256, byte_length: before.bytes },
      next: { r2_key: known.r2_key.replace(`/${before.sha256}.mp3`, `/${after.sha256}.mp3`),
        sha256: after.sha256, byte_length: after.bytes }, local_path: after.audioPath,
      old_path: before.audioPath, duration_seconds: after.durationSeconds,
      speech_lufs: newQc.speechQc?.speechLufs });
    else if (oldQc.status !== 'pass' || after.sha256 !== before.sha256
      || after.audioPath !== before.audioPath || after.bytes !== before.bytes)
      fail(`${k}: a baseline-passing media object was changed`);
    if (oldQc.status === 'fail' && after.sha256 === before.sha256)
      fail(`${k}: failed speech audio was not repaired`);
    if (!known.r2_key.endsWith(`/${before.sha256}.mp3`))
      fail(`${k}: published R2 key does not end in the content digest`);
  }
  if (finalMap.size !== originalMap.size || baselineMap.size !== originalMap.size
    || finalQcMap.size !== originalMap.size || baselineQc.counts?.fail !== changed.length
    || repair.replacementCount !== changed.length
    || repair.unchangedCount !== 208 - changed.length)
    fail('Replacement set differs from exactly the baseline QC failures');
  const repairs = uniqueMap(repair.replacements || [], pair, 'repair identity');
  if (repairs.size !== changed.length) fail('Repair manifest replacement count differs');
  for (const item of changed) {
    const listed = repairs.get(pair(item));
    if (!listed || listed.old_sha256 !== item.old.sha256
      || listed.new_sha256 !== item.next.sha256
      || listed.old_r2_key !== item.old.r2_key
      || listed.old_path !== item.old_path || listed.new_path !== item.local_path
      || listed.bytes !== item.next.byte_length
      || listed.duration_seconds !== item.duration_seconds)
      fail(`${pair(item)}: repair manifest differs from exact media replacement`);
    if (!isHash(item.next.sha256) || item.next.r2_key === item.old.r2_key
      || byPair.get(pair(item))?.sha256 !== item.old.sha256)
      fail(`${pair(item)}: new immutable media key is invalid`);
  }
  if (finalQc.counts?.pass !== 208 || (finalQc.counts?.fail || 0) !== 0)
    fail('Every repaired audio object must pass final speech QC v2');
  bridgeReleaseMedia(final, finalQc, hashes.qc);
  changed.sort((a, b) => pair(a).localeCompare(pair(b)));
  const uploads = changed.map(item => ({ card_id: item.card_id, variant: item.variant,
    local_path: item.local_path, r2_key: item.next.r2_key,
    sha256: item.next.sha256, byte_length: item.next.byte_length,
    mime_type: 'audio/mpeg', previous_r2_key: item.old.r2_key,
    previous_sha256: item.old.sha256, speech_lufs: item.speech_lufs }));
  return { inventory: { schemaVersion: 1, release: 'PPP001-20261114-media-repair',
    changedCount: changed.length, unchangedCount: 208 - changed.length,
    originalPackSha256: hashes.pack, repairManifestSha256: hashes.repair,
    finalSpeechQcSha256: hashes.qc, objects: uploads },
  preflightSql: preflightSql(changed, hashes),
  applySql: sqlFor(changed, hashes), rollbackSql: sqlFor(changed, hashes, true) };
}

export function prepareMediaRepairFromFiles(packPath, repairPath, qcPath) {
  if (!packPath || !repairPath || !qcPath) fail('Pack, repair manifest, and speech QC paths are required');
  const read = path => readFileSync(path);
  const repairBytes = read(resolve(repairPath)), repair = JSON.parse(repairBytes);
  const baselinePath = resolve(repair.sourceQc || fail('Repair manifest has no baseline QC'));
  const baselineBytes = read(baselinePath);
  const finalPath = resolve(repair.releaseMediaPath || fail('Repair manifest has no final audio manifest'));
  const finalBytes = read(finalPath), finalQcBytes = read(resolve(qcPath));
  if (sha(baselineBytes) !== repair.sourceQcSha256
    || sha(finalBytes) !== repair.releaseMediaSha256
    || resolve(repair.sourceManifest || '') !== resolve(JSON.parse(baselineBytes).sourceManifest || '')
    || resolve(JSON.parse(finalQcBytes).sourceManifest || '') !== finalPath)
    fail('Repair and QC source manifest checksum binding failed');
  const packBytes = read(resolve(packPath));
  return prepareMediaRepair(JSON.parse(packBytes), repair,
    JSON.parse(read(resolve(repair.sourceManifest))), JSON.parse(baselineBytes),
    JSON.parse(finalBytes), JSON.parse(finalQcBytes),
    { pack: sha(packBytes), repair: sha(repairBytes), qc: sha(finalQcBytes) });
}

function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pack') options.pack = resolve(args[++i] || fail('--pack needs a path'));
    else if (args[i] === '--repair') options.repair = resolve(args[++i] || fail('--repair needs a path'));
    else if (args[i] === '--qc') options.qc = resolve(args[++i] || fail('--qc needs a path'));
    else if (args[i] === '--out-dir') options.out = resolve(args[++i] || fail('--out-dir needs a path'));
    else fail(`Unknown argument ${args[i]}`);
  }
  if (!options.pack || !options.repair || !options.qc || !options.out
    || options.out === repository || options.out.startsWith(`${repository}/`))
    fail('Use --pack, --repair, --qc, and private --out-dir outside the site repository');
  const result = prepareMediaRepairFromFiles(options.pack, options.repair, options.qc);
  mkdirSync(options.out, { recursive: true });
  writeFileSync(resolve(options.out, 'upload-inventory.json'), JSON.stringify(result.inventory, null, 2) + '\n');
  writeFileSync(resolve(options.out, 'preflight-media-status.sql'), result.preflightSql);
  writeFileSync(resolve(options.out, 'apply-media-update.sql'), result.applySql);
  writeFileSync(resolve(options.out, 'rollback-media-update.sql'), result.rollbackSql);
  console.log(`Prepared ${result.inventory.changedCount} immutable uploads and media-only SQL; no upload or database update performed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`PPP001 media repair preparation failed: ${error.message}`); process.exitCode = 1; }
}
