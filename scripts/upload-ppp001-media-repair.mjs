#!/usr/bin/env node
// Upload only the checksum-bound PPP001 loudness replacements to private R2.
// Default mode is local validation; no network call occurs without an explicit mode.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { prepareMediaRepairFromFiles } from './prepare-ppp001-media-repair.mjs';

const bucket = 'talktag-private-audio-preview';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

export function verifyRepairUploadInventory(expected, supplied) {
  if (supplied?.schemaVersion !== 1 || supplied.release !== expected.release
    || supplied.changedCount !== expected.changedCount
    || supplied.unchangedCount !== expected.unchangedCount
    || supplied.originalPackSha256 !== expected.originalPackSha256
    || supplied.repairManifestSha256 !== expected.repairManifestSha256
    || supplied.finalSpeechQcSha256 !== expected.finalSpeechQcSha256
    || JSON.stringify(supplied.objects) !== JSON.stringify(expected.objects))
    fail('Repair upload inventory differs from checksum-bound pack, repair manifest, or passing speech QC');
  const seen = new Set();
  for (const item of supplied.objects) {
    if (!/^ppp001\/[a-z0-9/_-]+\/[a-f0-9]{64}\.mp3$/.test(item.r2_key)
      || !item.r2_key.endsWith(`/${item.sha256}.mp3`)
      || seen.has(item.r2_key) || item.mime_type !== 'audio/mpeg')
      fail(`Invalid or duplicate immutable R2 repair key for ${item.card_id}:${item.variant}`);
    const bytes = readFileSync(item.local_path);
    if (bytes.length !== item.byte_length || sha(bytes) !== item.sha256)
      fail(`Local repair file checksum changed for ${item.card_id}:${item.variant}`);
    seen.add(item.r2_key);
  }
  return supplied.objects;
}

async function main() {
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--pack') options.pack = resolve(process.argv[++i] || fail('--pack needs a path'));
  else if (arg === '--repair') options.repair = resolve(process.argv[++i] || fail('--repair needs a path'));
  else if (arg === '--qc') options.qc = resolve(process.argv[++i] || fail('--qc needs a path'));
  else if (arg === '--inventory') options.inventory = resolve(process.argv[++i] || fail('--inventory needs a path'));
  else if (arg === '--credential') options.credential = resolve(process.argv[++i] || fail('--credential needs a path'));
  else if (arg === '--receipt') options.receipt = resolve(process.argv[++i] || fail('--receipt needs a path'));
  else if (['--dry-run', '--upload', '--verify-only'].includes(arg)) options.mode = arg;
  else fail(`Unknown argument ${arg}`);
}
options.mode ||= '--dry-run';
if (!options.pack || !options.repair || !options.qc || !options.inventory
  || (options.mode !== '--dry-run' && !options.credential))
  fail('Use --pack, --repair, --qc, --inventory, and for R2 modes --credential; choose --dry-run, --upload, or --verify-only');
const prepared = prepareMediaRepairFromFiles(options.pack, options.repair, options.qc);
const supplied = JSON.parse(readFileSync(options.inventory, 'utf8'));
const objects = verifyRepairUploadInventory(prepared.inventory, supplied);
console.log(`Verified ${objects.length} local PPP001 repair MP3s (${(objects.reduce((n, x) => n + x.byte_length, 0) / 1048576).toFixed(1)} MiB).`);
if (options.mode === '--dry-run') return;

if ((statSync(options.credential).mode & 0o077) !== 0)
  fail('Temporary credential file must be private (mode 0600)');
const auth = JSON.parse(readFileSync(options.credential, 'utf8'));
if (!/^[A-Za-z0-9]{32}$/.test(auth.access || '')
  || !/^[A-Za-z0-9]{64}$/.test(auth.secret || '')
  || !/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(auth.endpoint || ''))
  fail('Temporary bucket-scoped credential has an unexpected shape');
const client = new S3Client({ region: 'auto', endpoint: auth.endpoint,
  credentials: { accessKeyId: auth.access, secretAccessKey: auth.secret },
  maxAttempts: 3, forcePathStyle: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
async function readBack(item) {
  try { await client.send(new HeadObjectCommand({ Bucket: bucket, Key: item.r2_key })); }
  catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') return null;
    throw new Error(`R2 HEAD failed for ${item.card_id}:${item.variant}: ${error.name || error.$metadata?.httpStatusCode}`);
  }
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.r2_key }));
  const bytes = Buffer.from(await result.Body.transformToByteArray());
  return { bytes: bytes.length, sha256: sha(bytes) };
}
let next = 0, completed = 0, uploaded = 0;
const verified = [];
async function worker() {
  for (;;) {
    const index = next++;
    if (index >= objects.length) return;
    const item = objects[index];
    let remote = await readBack(item);
    if (remote) {
      if (remote.bytes !== item.byte_length || remote.sha256 !== item.sha256)
        fail(`Different object already exists at immutable key ${item.card_id}:${item.variant}`);
    } else {
      if (options.mode === '--verify-only')
        fail(`Missing R2 repair object ${item.card_id}:${item.variant}`);
      const body = readFileSync(item.local_path);
      if (body.length !== item.byte_length || sha(body) !== item.sha256)
        fail(`Local repair file changed during upload ${item.card_id}:${item.variant}`);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: item.r2_key,
        Body: body, ContentType: 'audio/mpeg', CacheControl: 'private, max-age=31536000, immutable',
        Metadata: { sha256: item.sha256 } }));
      uploaded++;
      for (let attempt = 0; attempt < 4; attempt++) {
        remote = await readBack(item);
        if (remote?.bytes === item.byte_length && remote.sha256 === item.sha256) break;
        await pause(500 * 2 ** attempt);
      }
      if (remote?.bytes !== item.byte_length || remote.sha256 !== item.sha256)
        fail(`R2 GET read-back checksum failed for ${item.card_id}:${item.variant}`);
    }
    verified.push(item.sha256);
    if (++completed % 25 === 0 || completed === objects.length)
      console.log(`${completed}/${objects.length} private objects independently read back; ${uploaded} new uploads.`);
  }
}
try {
  await Promise.all(Array.from({ length: 4 }, worker));
  if (verified.length !== objects.length) fail('Incomplete R2 verification');
  if (options.receipt) {
    const receipt = { schemaVersion: 1, release: supplied.release,
      mode: options.mode.slice(2), verifiedAt: new Date().toISOString(),
      objectCount: objects.length, uploadedCount: uploaded,
      inventorySha256: sha(readFileSync(options.inventory)),
      verifiedObjectSha256: sha(Buffer.from([...verified].sort().join('\n'))) };
    writeFileSync(options.receipt, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(`SUCCESS: ${objects.length} PPP001 repair objects match independent R2 GET checksums.`);
} finally { client.destroy(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (error) { console.error(`PPP001 repair upload failed: ${error.message}`); process.exitCode = 1; }
}
