#!/usr/bin/env node
// Exact PPP001 media release to the private R2 bucket. Default is local QC only.
// A temporary bucket-scoped credential is read from a private file, never logged.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const bucket = 'talktag-private-audio-preview';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--pack') options.pack = process.argv[++i];
  else if (arg === '--pipeline') options.pipeline = process.argv[++i];
  else if (arg === '--credential') options.credential = process.argv[++i];
  else if (['--dry-run', '--stage-upload', '--upload', '--verify-only'].includes(arg)) options.mode = arg;
  else throw new Error(`Unknown argument ${arg}`);
}
options.mode ||= '--dry-run';
if (!options.pack || !options.pipeline || (options.mode !== '--dry-run' && !options.credential))
  throw new Error('Use --pack PACK.json --pipeline ASSEMBLED.json [--credential TEMPORARY.json] [--dry-run|--stage-upload|--upload|--verify-only]');
const pack = JSON.parse(readFileSync(resolve(options.pack), 'utf8'));
const pipeline = JSON.parse(readFileSync(resolve(options.pipeline), 'utf8'));
const stageOnlyStatus = 'technical-audio-passed-transcript-limited-not-publishable';
if (pack.release !== 'PPP001-20261114' || pack.episode !== '001'
  || !Array.isArray(pack.rows) || pack.rows.length < 64 || !Array.isArray(pipeline.cards)
  || !['assembled-not-uploaded', 'release-approved', stageOnlyStatus].includes(pipeline.status)
  || !pack.audioAssembly?.qcSha256 || pack.audioAssembly.qcSha256 !== pipeline.qcSha256)
  throw new Error('Checksum-bound PPP001 pack and technically approved assembly required');
if (options.mode === '--upload' && (pack.releaseReady !== true || pipeline.status === stageOnlyStatus))
  throw new Error('Release upload requires a fully approved pack; use --stage-upload for private media staging');
const source = new Map();
for (const item of pipeline.cards) {
  if (item.technicalQcPass !== true || !item.qcRecord || !item.sourceHash)
    throw new Error(`Missing technical audio QC for ${item.id || 'unknown card'}`);
  const effectiveId = Number(item.partCount || 1) > 1
    ? `${item.id}-part${Number(item.partIndex || 1)}` : item.id;
  const stage = Number(item.stage || item.step || 0);
  const ratio = Number(item.ratio || 2.5);
  const variant = item.variant || (stage > 0
    ? `clip_${String(stage).padStart(3, '0')}${ratio === 2.5 ? '' : `_${ratio.toFixed(1).replace('.', '_')}`}`
    : 'main');
  const k = `${effectiveId}:${variant}`;
  if (source.has(k)) throw new Error(`Duplicate local assembly ${k}`);
  source.set(k, item);
}
const inventory = [];
const keys = new Set();
for (const row of pack.rows) for (const media of row.media) {
  const id = row.card.card_id;
  const match = source.get(`${id}:${media.variant}`);
  if (!match || match.sha256 !== media.sha256 || match.bytes !== media.byte_length
    || (match.r2Key && match.r2Key !== media.r2_key) || media.mime_type !== 'audio/mpeg'
    || !/^ppp001\/[a-z0-9/_-]+\/[a-f0-9]{64}\.mp3$/.test(media.r2_key)
    || keys.has(media.r2_key) || !isAbsolute(match.audioPath))
    throw new Error(`Assembly inventory does not match protected media ${id}:${media.variant}`);
  const local = realpathSync(match.audioPath);
  if (!local.includes('/audio-pipeline/') || !local.endsWith('.mp3'))
    throw new Error(`Unexpected local audio path for ${id}:${media.variant}`);
  const bytes = readFileSync(local);
  if (bytes.length !== media.byte_length || sha(bytes) !== media.sha256
    || statSync(local).size !== media.byte_length)
    throw new Error(`Local media checksum failed for ${id}:${media.variant}`);
  keys.add(media.r2_key);
  inventory.push({ id, variant: media.variant, key: media.r2_key,
    sha256: media.sha256, bytes: media.byte_length, body: bytes });
}
const expected = pack.rows.reduce((sum, row) => sum + row.requiredMediaVariants.length, 0);
if (inventory.length !== expected) throw new Error(`Expected ${expected} media variants, got ${inventory.length}`);
console.log(`Verified ${inventory.length} local PPP001 MP3s (${(inventory.reduce((n, item) => n + item.bytes, 0) / 1048576).toFixed(1)} MiB).`);
if (options.mode === '--dry-run') process.exit(0);

const authFile = resolve(options.credential);
if ((statSync(authFile).mode & 0o077) !== 0) throw new Error('Temporary credential file must be private (mode 0600)');
const auth = JSON.parse(readFileSync(authFile, 'utf8'));
if (!/^[A-Za-z0-9]{32}$/.test(auth.access || '') || !/^[A-Za-z0-9]{64}$/.test(auth.secret || '')
  || !/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(auth.endpoint || ''))
  throw new Error('Temporary bucket credential has an unexpected shape');
const client = new S3Client({ region: 'auto', endpoint: auth.endpoint,
  credentials: { accessKeyId: auth.access, secretAccessKey: auth.secret },
  maxAttempts: 3, forcePathStyle: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
async function remote(item) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: item.key }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') return null;
    throw new Error(`R2 HEAD failed for ${item.key}: ${error.name || error.$metadata?.httpStatusCode}`);
  }
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.key }));
  const bytes = Buffer.from(await result.Body.transformToByteArray());
  return { bytes: bytes.length, sha256: sha(bytes) };
}
let next = 0, completed = 0, uploaded = 0;
async function worker() {
  for (;;) {
    const index = next++;
    if (index >= inventory.length) return;
    const item = inventory[index];
    let existing = await remote(item);
    if (existing) {
      if (existing.bytes !== item.bytes || existing.sha256 !== item.sha256)
        throw new Error(`Different object already exists at immutable key ${item.key}`);
    } else {
      if (options.mode === '--verify-only') throw new Error(`Missing R2 object ${item.key}`);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: item.key,
        Body: item.body, ContentType: 'audio/mpeg', CacheControl: 'private, max-age=31536000, immutable',
        Metadata: { sha256: item.sha256 } }));
      uploaded++;
      for (let attempt = 0; attempt < 4; attempt++) {
        existing = await remote(item);
        if (existing?.bytes === item.bytes && existing.sha256 === item.sha256) break;
        await pause(500 * 2 ** attempt);
      }
      if (existing?.bytes !== item.bytes || existing.sha256 !== item.sha256)
        throw new Error(`R2 read-back checksum failed for ${item.key}`);
    }
    if (++completed % 25 === 0 || completed === inventory.length)
      console.log(`${completed}/${inventory.length} private objects independently read back; ${uploaded} new uploads.`);
  }
}
try {
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`SUCCESS: ${inventory.length} private objects match the exact checksum-bound ${options.mode === '--stage-upload' ? 'staging' : 'release'} inventory.`);
} finally { client.destroy(); }
