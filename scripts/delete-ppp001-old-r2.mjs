#!/usr/bin/env node
// Permanently remove only audited, unshared PPP001 predecessor audio.
// Default is a fresh remote inventory check; --delete is the only mutating mode.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bucket = 'talktag-private-audio-preview';
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const same = (left, right) => left.length === right.length && left.every((item, i) => item === right[i]);

export function validateDeletionInputs({ audit, oldMedia, pack, oldIds, catalogSource, now = Date.now() }) {
  if (audit?.schemaVersion !== 1 || audit.release !== 'PPP001-20261114'
    || audit.liveVerified !== true || audit.memberLearningRetentionVerified !== true
    || audit.dashboardTombstoneMigrationVerified !== true || audit.r2ReferenceAuditPassed !== true
    || pack?.release !== audit.release || pack.episode !== '001' || pack.releaseReady !== true
    || !Array.isArray(pack.rows) || pack.rows.length !== 70
    || !Array.isArray(oldIds?.oldProtectedCardIds) || oldIds.oldProtectedCardIds.length !== 67)
    fail('The approved live release and history safeguards are required');
  const verifiedAt = Date.parse(audit.verifiedAt || '');
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 300000 || now - verifiedAt > 7 * 86400000)
    fail('The post-live audit must be recent');
  if (audit.oldProtectedIdsSha256 !== sha(oldIds.oldProtectedCardIds.join('\n'))
    || audit.newCardIdsSha256 !== sha(pack.rows.map(row => row.card.card_id).join('\n'))
    || audit.publicCatalogSha256 !== sha(catalogSource))
    fail('Release identities or the deployed catalog changed');
  if (!Array.isArray(oldMedia) || oldMedia.length !== 120
    || oldMedia.some(item => typeof item.key !== 'string' || !Number.isSafeInteger(item.bytes)
      || item.bytes <= 0 || item.other_refs !== 0))
    fail('The old protected-media database inventory is incomplete or shared');
  const sortedMedia = [...oldMedia].sort((a, b) => a.key.localeCompare(b.key));
  const keys = sortedMedia.map(item => item.key);
  if (!Array.isArray(audit.oldR2Keys) || !Array.isArray(audit.unsharedOldR2Keys)
    || new Set(keys).size !== 120 || !same(keys, [...audit.oldR2Keys].sort())
    || !same(keys, [...audit.unsharedOldR2Keys].sort())
    || audit.evidence?.oldR2KeyListSha256 !== sha(keys.join('\n')))
    fail('The 120 exact old R2 keys do not match the post-live audit');
  const totalBytes = sortedMedia.reduce((sum, item) => sum + item.bytes, 0);
  if (audit.evidence?.oldR2Bytes !== totalBytes) fail('Old R2 byte total changed');
  const newMedia = pack.rows.flatMap(row => row.media || []);
  const newKeys = new Set(newMedia.map(item => item.r2_key));
  if (newMedia.length !== 208 || newKeys.size !== 208 || keys.some(key => newKeys.has(key)))
    fail('Old R2 keys collide with the replacement audio');
  return { old: sortedMedia, replacement: newMedia, totalBytes };
}

export function validateRemoteInventory({ objects, old, replacement }) {
  const remote = new Map();
  for (const item of objects) {
    if (!item.key || !Number.isSafeInteger(item.bytes) || item.bytes < 0 || remote.has(item.key))
      fail('The fresh R2 listing is malformed or contains duplicate keys');
    remote.set(item.key, item.bytes);
  }
  for (const item of old) if (remote.get(item.key) !== item.bytes)
    fail(`Old R2 object missing or changed: ${item.key}`);
  for (const item of replacement) if (remote.get(item.r2_key) !== item.byte_length)
    fail(`Replacement R2 object missing or changed: ${item.r2_key}`);
  return remote;
}

function parseOptions(args) {
  const options = { delete: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--audit', '--old-media', '--pack', '--credential'].includes(arg))
      options[arg.slice(2).replaceAll('-', '')] = args[++i] || fail(`${arg} needs a file`);
    else if (arg === '--delete') options.delete = true;
    else fail(`Unknown argument ${arg}`);
  }
  if (!options.audit || !options.oldmedia || !options.pack || !options.credential)
    fail('Use --audit PRIVATE.json --old-media PRIVATE.json --pack PRIVATE.json --credential PRIVATE.json [--delete]');
  return options;
}

async function listAll(client) {
  const objects = [];
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, MaxKeys: 1000, ...(token ? { ContinuationToken: token } : {})
    }));
    for (const item of page.Contents || []) objects.push({ key: item.Key, bytes: item.Size });
    token = page.NextContinuationToken;
  } while (token);
  return objects;
}

async function main(args) {
  const options = parseOptions(args);
  const authPath = resolve(options.credential);
  if ((statSync(authPath).mode & 0o077) !== 0)
    fail('Temporary bucket credential must be private (mode 0600)');
  const auth = JSON.parse(readFileSync(authPath, 'utf8'));
  if (!/^[A-Za-z0-9]{32}$/.test(auth.access || '')
    || !/^[A-Za-z0-9]{64}$/.test(auth.secret || '')
    || !/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(auth.endpoint || ''))
    fail('Unexpected bucket credential shape');
  const release = validateDeletionInputs({
    audit: JSON.parse(readFileSync(resolve(options.audit), 'utf8')),
    oldMedia: JSON.parse(readFileSync(resolve(options.oldmedia), 'utf8')),
    pack: JSON.parse(readFileSync(resolve(options.pack), 'utf8')),
    oldIds: JSON.parse(readFileSync(resolve(repository, 'docs/releases/ppp001-old-ids.json'), 'utf8')),
    catalogSource: readFileSync(resolve(repository, 'public/catalog-metadata.js'))
  });
  const client = new S3Client({ region: 'auto', endpoint: auth.endpoint,
    credentials: { accessKeyId: auth.access, secretAccessKey: auth.secret },
    forcePathStyle: true, maxAttempts: 3 });
  try {
    const before = await listAll(client);
    validateRemoteInventory({ objects: before, ...release });
    console.log(`Verified ${release.old.length} exact unshared old R2 objects `
      + `(${(release.totalBytes / 1048576).toFixed(1)} MiB) and ${release.replacement.length} replacement objects in ${bucket}.`);
    if (!options.delete) {
      console.log('Dry run only; no R2 objects were deleted.');
      return;
    }
    for (let i = 0; i < release.old.length; i += 30) {
      const batch = release.old.slice(i, i + 30);
      const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket,
        Delete: { Objects: batch.map(item => ({ Key: item.key })), Quiet: false } }));
      if (result.Errors?.length) fail(`R2 rejected ${result.Errors.length} objects; stop and re-audit`);
      console.log(`Delete request accepted for ${Math.min(i + batch.length, release.old.length)}/${release.old.length} old objects.`);
    }
    const after = new Map((await listAll(client)).map(item => [item.key, item.bytes]));
    if (release.old.some(item => after.has(item.key))) fail('Some old R2 keys still exist; reconcile before completion');
    if (release.replacement.some(item => after.get(item.r2_key) !== item.byte_length))
      fail('A replacement R2 object changed during deletion');
    console.log(`SUCCESS: all ${release.old.length} old objects removed; all ${release.replacement.length} replacement objects retained.`);
  } finally { client.destroy(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(`PPP001 R2 cleanup stopped: ${error.message}`); process.exitCode = 1; });
}
