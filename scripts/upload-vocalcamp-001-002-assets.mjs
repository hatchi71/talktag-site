#!/usr/bin/env node
// Safe, resumable release of the English Vocal Camp 001/002 pause variants.
// No R2 writes without --upload. Existing keys are skipped only after byte hash verification.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/vocalcamp/segments-001-002');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const base = 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/segments-001-002/v2-20261017/';
const prefix = 'English/boot-camp/vocal-camp/segments-001-002/v2-20261017/';
const mode = process.argv[2] || '--dry-run';
if (!['--dry-run', '--upload', '--verify-only'].includes(mode) || process.argv.length > 3) {
  throw new Error('Usage: node scripts/upload-vocalcamp-001-002-assets.mjs [--dry-run|--upload|--verify-only]');
}
if (manifest.version !== 1 || manifest.releaseBase !== base || manifest.cards.length !== 12) {
  throw new Error('Unexpected Vocal Camp manifest');
}

function sha(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    for (;;) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!count) break;
      hash.update(buffer.subarray(0, count));
    }
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

const items = [];
for (const card of manifest.cards) {
  if (!['001', '002'].includes(card.episode) || !/^(A1|A2|B1|B2|C1|C2)$/.test(card.level) ||
      card.id !== `family-${card.episode}-${card.level}` || card.steps.length !== card.lines.length) {
    throw new Error(`Unexpected card: ${card.id}`);
  }
  for (const line of card.lines) items.push(line);
  for (const step of card.steps) {
    if (step.variants.length !== 4) throw new Error(`Missing variants: ${card.id} step ${step.step}`);
    for (const variant of step.variants) items.push(variant);
  }
}
if (items.length !== 390) throw new Error(`Expected 390 MP3s, found ${items.length}`);
const records = items.map(item => {
  if (!item.audio.startsWith(base) || !item.audio.includes(`?v=${item.sha256.slice(0, 12)}`)) {
    throw new Error(`Unexpected audio URL: ${item.audio}`);
  }
  const name = item.audio.slice(base.length).split('?')[0];
  if (!/^(001|002)\/(a1|a2|b1|b2|c1|c2)\/(line-\d\d|pause-[23]_[05]\/step-\d\d)\.mp3$/.test(name) || name.includes('..')) {
    throw new Error(`Unexpected R2 key: ${name}`);
  }
  const file = path.resolve(root, name);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || fs.realpathSync(file) !== file ||
      fs.statSync(file).size !== item.bytes || sha(file) !== item.sha256) {
    throw new Error(`Local audio failed size/SHA check: ${name}`);
  }
  return { key: prefix + name, file, url: item.audio, bytes: item.bytes, sha256: item.sha256, variant: name.includes('/pause-') };
});
if (new Set(records.map(item => item.key)).size !== 390) throw new Error('Duplicate R2 key');
const wrangler = process.env.TALKTAG_WRANGLER_BIN ||
  path.resolve(repo, '../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler');
if (!path.isAbsolute(wrangler) || !fs.existsSync(wrangler)) throw new Error('Approved installed Wrangler not found');
function run(parts) {
  const result = spawnSync(wrangler, parts, {
    cwd: repo, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: path.join(os.tmpdir(), `talktag-vocalcamp-wrangler-${process.pid}.log`) },
  });
  if (result.error || result.status !== 0) throw new Error(`Wrangler ${parts[0]} failed for ${parts[2] || ''}: ${result.error?.message || String(result.stderr || result.stdout).slice(-600)}`);
}
async function head(item, bust = false) {
  const url = new URL(item.url);
  if (bust) url.searchParams.set('tt_check', crypto.randomBytes(6).toString('hex'));
  const response = await fetch(url, { method: 'HEAD', redirect: 'manual', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
  if (![200, 404].includes(response.status)) throw new Error(`Uncertain public HEAD ${response.status}: ${item.key}`);
  return response;
}
async function verify(item) {
  let error;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    try {
      const response = await head(item);
      if (response.status !== 200 || Number(response.headers.get('content-length')) !== item.bytes ||
          (response.headers.get('content-type') || '').split(';')[0] !== 'audio/mpeg') {
        throw new Error(`Unexpected public HEAD for ${item.key}`);
      }
      if (item.variant) {
        const ranged = await fetch(item.url, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(15000) });
        if (ranged.status !== 206 || ranged.headers.get('content-range') !== `bytes 0-1023/${item.bytes}` ||
            (await ranged.arrayBuffer()).byteLength !== 1024) throw new Error(`Range check failed: ${item.key}`);
      }
      return;
    } catch (caught) { error = caught; }
  }
  throw error;
}
console.log(`Local SHA/size preflight OK: ${records.length} MP3s (${(records.reduce((n, item) => n + item.bytes, 0) / 1024 / 1024).toFixed(2)} MiB).`);
if (mode === '--dry-run') {
  console.log(`DRY RUN: no uploads. Target talktag-audio/${prefix}`);
} else if (mode === '--verify-only') {
  for (const item of records) await verify(item);
  console.log('VERIFIED all 390 public objects and variant Range responses.');
} else {
  run(['--version']);
  const existing = new Set();
  for (const item of records) {
    if ((await head(item, true)).status !== 200) continue;
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-vc-check-'));
    const downloaded = path.join(scratch, 'remote.mp3');
    try {
      run(['r2', 'object', 'get', `talktag-audio/${item.key}`, '--remote', '--file', downloaded]);
      if (!fs.existsSync(downloaded) || fs.statSync(downloaded).size !== item.bytes || sha(downloaded) !== item.sha256) {
        throw new Error(`Existing object is not identical; refusing overwrite: ${item.key}`);
      }
      existing.add(item.key);
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  }
  console.log(`Remote preflight: ${existing.size} identical, ${390 - existing.size} new.`);
  let uploaded = 0;
  for (const item of records) {
    if (!existing.has(item.key)) {
      if ((await head(item, true)).status !== 404) throw new Error(`Object appeared before PUT: ${item.key}`);
      run(['r2', 'object', 'put', `talktag-audio/${item.key}`, '--remote', '--file', item.file,
        '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=31536000, immutable']);
      uploaded++;
    }
    await verify(item);
    console.log(`${uploaded + existing.size}/390 VERIFIED ${item.key}`);
  }
  console.log(`SUCCESS: ${uploaded} uploaded, ${existing.size} identical skipped, all public checks passed.`);
}
