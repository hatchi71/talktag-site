#!/usr/bin/env node
// Upload only immutable, locally validated TalkTag native-audio releases.
// Existing R2 objects are never overwritten: their full hashes must match.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releases = {
  'ko-glr': {
    root: 'audio/korean/guided/segments-001-002',
    manifest: 'manifest.json',
    base: 'https://audio.talktag.co.kr/Korean/guided/segments-001-002/v1-20261016/',
    cards: 23,
  },
  'ko-vocal': {
    root: 'audio/korean/vocalcamp/segments-001-002',
    manifest: 'manifest.json',
    base: 'https://audio.talktag.co.kr/Korean/boot-camp/vocal-camp/segments-001-002/v1-20261016/',
    cards: 12,
  },
  'ja-glr': {
    root: 'audio/japanese/guided/segments-001',
    manifest: 'variants/manifest.json',
    base: 'https://audio.talktag.co.kr/Japanese/guided/segments-001/v1-20261016/',
    cards: 8,
  },
  'ja-vocal': {
    root: 'audio/japanese/vocalcamp/segments-001',
    manifest: 'manifest.json',
    base: 'https://audio.talktag.co.kr/Japanese/boot-camp/vocal-camp/segments-001/v1-20261016/',
    cards: 6,
  },
};
const [releaseName, mode = '--dry-run'] = process.argv.slice(2);
if (!releases[releaseName] || !['--dry-run', '--upload', '--verify-only'].includes(mode) || process.argv.length > 4) {
  throw new Error('Usage: node scripts/upload-native-multilang-assets.mjs <ko-glr|ko-vocal|ja-glr|ja-vocal> [--dry-run|--upload|--verify-only]');
}
const config = releases[releaseName];
const root = path.join(repo, config.root);
const manifest = JSON.parse(fs.readFileSync(path.join(root, config.manifest), 'utf8'));
if (manifest.version !== 1 || manifest.releaseBase !== config.base || manifest.cards?.length !== config.cards) {
  throw new Error(`${releaseName}: unexpected release manifest or card count`);
}
const expectedRatios = JSON.stringify([2, 2.5, 3, 3.5]);
if (JSON.stringify(manifest.pauseRatios || manifest.ratios) !== expectedRatios) {
  throw new Error(`${releaseName}: wrong pause ratios`);
}
if (manifest.minimumPauseSeconds !== 3) throw new Error(`${releaseName}: minimum pause must be 3 seconds`);

const audioRecords = [];
for (const ding of Object.values(manifest.dings || {})) audioRecords.push(ding);
for (const card of manifest.cards) {
  if (!card.id || !Array.isArray(card.lines) || !card.lines.length) throw new Error('Invalid card');
  audioRecords.push(...card.lines);
  if (Array.isArray(card.variants)) audioRecords.push(...card.variants);
  if (Array.isArray(card.steps)) {
    if (card.steps.length !== card.lines.length) throw new Error(`${card.id}: cumulative step count differs from line count`);
    for (const step of card.steps) audioRecords.push(...step.variants);
  }
}
const prefix = new URL(config.base).pathname.slice(1);
const shaFile = file => {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const bytes = Buffer.alloc(1024 * 1024);
  try {
    for (;;) {
      const n = fs.readSync(fd, bytes, 0, bytes.length, null);
      if (!n) break;
      hash.update(bytes.subarray(0, n));
    }
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
};
const records = new Map();
for (const item of audioRecords) {
  if (!item?.audio?.startsWith(config.base) || !/^[a-f0-9]{64}$/.test(item.sha256) ||
      !Number.isSafeInteger(item.bytes) || item.bytes <= 0) throw new Error('Incomplete audio record');
  const url = new URL(item.audio);
  if (url.origin !== 'https://audio.talktag.co.kr' ||
      url.searchParams.size !== 1 || url.searchParams.get('v') !== item.sha256.slice(0, 12)) {
    throw new Error(`Unexpected audio URL: ${item.audio}`);
  }
  const name = url.pathname.slice(prefix.length + 1);
  if (!/^[a-z0-9][a-z0-9_\/-]*\.mp3$/i.test(name) || name.includes('//') || name.split('/').includes('..')) {
    throw new Error(`Unexpected R2 key: ${name}`);
  }
  const file = path.resolve(root, name);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || fs.realpathSync(file) !== file ||
      fs.statSync(file).size !== item.bytes || shaFile(file) !== item.sha256) {
    throw new Error(`Local size/hash verification failed: ${name}`);
  }
  const record = { key: prefix + name, file, url: item.audio, bytes: item.bytes, sha256: item.sha256 };
  const prior = records.get(record.key);
  if (prior && prior.sha256 !== record.sha256) throw new Error(`Conflicting content for ${record.key}`);
  records.set(record.key, record);
}
if (!records.size) throw new Error('No audio files in manifest');
const inventory = [...records.values()];
console.log(`${releaseName}: ${inventory.length} verified local MP3s, ${(inventory.reduce((n, r) => n + r.bytes, 0) / 1048576).toFixed(2)} MiB.`);
if (mode === '--dry-run') {
  console.log(`DRY RUN: no R2 writes. Target talktag-audio/${prefix}`);
  process.exit(0);
}

const wrangler = process.env.TALKTAG_WRANGLER_BIN ||
  path.resolve(repo, '../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler');
if (!path.isAbsolute(wrangler) || !fs.existsSync(wrangler)) throw new Error('Approved Wrangler installation not found');
function run(args, logNumber) {
  return new Promise((resolve, reject) => {
    const child = spawn(wrangler, args, {
      cwd: repo,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false',
        WRANGLER_LOG_PATH: path.join(os.tmpdir(), `talktag-native-upload-${process.pid}-${logNumber}.log`) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = chunk => { output = (output + chunk.toString()).slice(-3000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => child.kill('SIGTERM'), 120000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Wrangler exited ${code}: ${output.slice(-900)}`)); });
  });
}
async function head(record, fresh = false) {
  const url = new URL(record.url);
  if (fresh) url.searchParams.set('tt_check', crypto.randomBytes(6).toString('hex'));
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'manual',
        headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
      if (![200, 404].includes(response.status)) throw new Error(`Uncertain public HEAD ${response.status}: ${record.key}`);
      return response;
    } catch (error) { last = error; }
  }
  throw last;
}
async function verify(record) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    try {
      const response = await head(record, true);
      if (response.status !== 200 || Number(response.headers.get('content-length')) !== record.bytes ||
          (response.headers.get('content-type') || '').split(';')[0] !== 'audio/mpeg') {
        throw new Error(`Public size/type verification failed: ${record.key}`);
      }
      const ranged = await fetch(record.url, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(20000) });
      if (ranged.status !== 206 || ranged.headers.get('content-range') !== `bytes 0-1023/${record.bytes}` ||
          (await ranged.arrayBuffer()).byteLength !== 1024) throw new Error(`Public Range verification failed: ${record.key}`);
      return;
    } catch (error) { last = error; }
  }
  throw last;
}
let complete = 0;
const concurrency = 3;
let nextIndex = 0;
async function worker() {
  for (;;) {
    const index = nextIndex++;
    if (index >= inventory.length) return;
    const record = inventory[index];
    if (mode === '--upload') {
      const existing = await head(record, true);
      if (existing.status === 200) {
        const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-native-existing-'));
        try {
          const remote = path.join(scratch, 'object.mp3');
          await run(['r2', 'object', 'get', `talktag-audio/${record.key}`, '--remote', '--file', remote], index);
          if (fs.statSync(remote).size !== record.bytes || shaFile(remote) !== record.sha256) {
            throw new Error(`Refusing to overwrite different existing object: ${record.key}`);
          }
        } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
      } else {
        await run(['r2', 'object', 'put', `talktag-audio/${record.key}`, '--remote', '--file', record.file,
          '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=31536000, immutable'], index);
      }
    }
    await verify(record);
    complete++;
    if (complete % 10 === 0 || complete === inventory.length) console.log(`${releaseName}: ${complete}/${inventory.length} public objects verified`);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, inventory.length) }, () => worker()));
console.log(`${releaseName}: SUCCESS — all ${inventory.length} public MP3s verified.`);
