#!/usr/bin/env node
// Safe R2 release runner for English GLR 001/002. Default: offline dry-run.
// Explicit --upload is required for all Cloudflare writes. Reruns skip only
// objects whose remotely downloaded bytes match the inventory SHA-256.
// Wrangler has no conditional-create flag, so a second public HEAD is checked
// immediately before each PUT; concurrent writers must be coordinated outside
// this script for an absolute no-overwrite guarantee.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const episode = process.env.GLR_EPISODE || '001';
if (!['001', '002'].includes(episode)) throw new Error(`Unsupported GLR episode: ${episode}`);
const root = path.join(repo, `audio/guided/segments-${episode}`);
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'upload-inventory.json'), 'utf8'));
const expectedBase = `https://audio.talktag.co.kr/English/guided/segments-${episode}/v1-20261016/`;
const expectedKeyPrefix = `English/guided/segments-${episode}/v1-20261016/`;
const args = process.argv.slice(2);
const mode = args.length === 0 || args[0] === '--dry-run' ? 'dry-run' :
  args[0] === '--upload' ? 'upload' : args[0] === '--verify-only' ? 'verify-only' :
    args[0] === '--version' ? 'version' : null;
if (!mode || args.length > 1) {
  console.error('Usage: node scripts/upload-guided-001-assets.mjs [--dry-run | --version | --upload | --verify-only]');
  process.exit(2);
}

function hash(file) {
  const digester = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(1024 * 1024);
  try {
    while (true) {
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!count) break;
      digester.update(chunk.subarray(0, count));
    }
  } finally { fs.closeSync(fd); }
  return digester.digest('hex');
}

function localPreflight() {
  if (inventory.version !== 1 || inventory.bucket !== 'talktag-audio' ||
      inventory.releaseBase !== expectedBase || inventory.objectCount !== 50 ||
      inventory.items.length !== 50) throw new Error('Unexpected inventory release, bucket, or object count');
  const keys = new Set();
  let total = 0;
  let variants = 0;
  for (const item of inventory.items) {
    if (!item.key.startsWith(expectedKeyPrefix) || !item.key.endsWith('.mp3') ||
        item.key.includes('..') || keys.has(item.key) ||
        item.file !== `audio/guided/segments-${episode}/${item.key.slice(expectedKeyPrefix.length)}` ||
        item.url !== `${expectedBase}${item.key.slice(expectedKeyPrefix.length)}?v=${item.sha256.slice(0, 12)}`) {
      throw new Error(`Invalid inventory key/path/URL: ${item.key}`);
    }
    keys.add(item.key);
    const absolute = path.resolve(repo, item.file);
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) ||
        !fs.statSync(absolute).isFile() || fs.realpathSync(absolute) !== absolute) {
      throw new Error(`Missing or unsafe local MP3: ${item.file}`);
    }
    const actualBytes = fs.statSync(absolute).size;
    const actualSha = hash(absolute);
    if (actualBytes !== item.bytes || actualSha !== item.sha256) {
      throw new Error(`Local size/SHA changed, rebuild and QC before upload: ${item.file}`);
    }
    if (item.key.includes('/variants/')) variants++;
    total += actualBytes;
  }
  if (variants !== 24 || total !== inventory.totalBytes) throw new Error('Variant count or inventory total size mismatch');
  return total;
}

function resolveWrangler() {
  // Absolute executable paths only. Do not invoke npx/npm or install packages.
  const override = process.env.TALKTAG_WRANGLER_BIN;
  if (override && !path.isAbsolute(override)) {
    throw new Error('TALKTAG_WRANGLER_BIN must be an absolute path to an installed Wrangler executable');
  }
  const candidates = override ? [override] : [
    path.join(repo, 'node_modules/.bin/wrangler'),
    path.resolve(repo, '../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler'),
    '/opt/homebrew/bin/wrangler',
    '/usr/local/bin/wrangler',
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const resolved = fs.realpathSync(candidate);
    const stat = fs.statSync(resolved);
    if (stat.isFile() && (stat.mode & 0o111)) return candidate;
  }
  throw new Error(`No installed Wrangler executable found${override ? ` at ${override}` : ' in approved local candidates'}`);
}

function wrangler(parts, timeout = 120000) {
  const executable = resolveWrangler();
  const result = spawnSync(executable, parts, {
    cwd: repo, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: path.join(os.tmpdir(), `talktag-glr${episode}-wrangler-${process.pid}.log`),
      WRANGLER_SEND_METRICS: 'false',
    },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Wrangler failed for ${parts.slice(0, 4).join(' ')}: ${result.error?.message || String(result.stderr || result.stdout).slice(-1000)}`);
  }
  return result.stdout;
}

async function publicHead(item, cacheBust = false) {
  const url = new URL(item.url);
  if (cacheBust) url.searchParams.set('tt_preflight', crypto.randomBytes(8).toString('hex'));
  const response = await fetch(url, {
    method: 'HEAD', redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200 && response.status !== 404) {
    throw new Error(`Public HEAD ${response.status} for ${item.key}; refusing an uncertain upload`);
  }
  return response;
}

async function remoteExistingHash(item) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-r2-check-'));
  const downloaded = path.join(scratch, 'remote.mp3');
  try {
    wrangler(['r2', 'object', 'get', `${inventory.bucket}/${item.key}`, '--remote', '--file', downloaded]);
    if (!fs.existsSync(downloaded)) throw new Error(`Wrangler did not download ${item.key}`);
    return { bytes: fs.statSync(downloaded).size, sha256: hash(downloaded) };
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}

async function verifyPublic(item) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    try {
      const response = await publicHead(item);
      const length = Number(response.headers.get('content-length'));
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (response.status !== 200 || length !== item.bytes || type !== 'audio/mpeg') {
        throw new Error(`HEAD ${response.status}, length ${length}, type ${type || '(missing)'}`);
      }
      if (item.key.includes('/variants/')) {
        const ranged = await fetch(item.url, {
          method: 'GET', redirect: 'manual', headers: { Range: 'bytes=0-1023' },
          signal: AbortSignal.timeout(15000),
        });
        const contentRange = ranged.headers.get('content-range');
        const body = await ranged.arrayBuffer();
        if (ranged.status !== 206 || contentRange !== `bytes 0-1023/${item.bytes}` || body.byteLength !== 1024) {
          throw new Error(`Range ${ranged.status}, ${contentRange}, ${body.byteLength} bytes`);
        }
      }
      return;
    } catch (error) { lastError = error; }
  }
  throw new Error(`Public verification failed for ${item.key}: ${lastError?.message}`);
}

const total = localPreflight();
console.log(`Local preflight OK: 50 MP3s, ${(total / 1024 / 1024).toFixed(2)} MiB, SHA-256 verified.`);
if (mode === 'dry-run') {
  console.log('DRY RUN: no network calls, no Cloudflare writes. Use --upload for release.');
  console.log(`Target: ${inventory.bucket}/${expectedKeyPrefix} (24 line clips, 2 dings, 24 variants)`);
  console.log(`Installed Wrangler: ${resolveWrangler()}`);
} else if (mode === 'version') {
  console.log(`Installed Wrangler: ${resolveWrangler()}`);
  console.log(wrangler(['--version'], 15000).trim());
} else if (mode === 'verify-only') {
  for (const item of inventory.items) {
    await verifyPublic(item);
    console.log(`VERIFIED ${item.key}`);
  }
  console.log('VERIFIED all 50 public objects; variants support HTTP Range.');
} else {
  wrangler(['--version'], 15000);
  // Finish collision audit for every key before doing the first write.
  const existing = new Set();
  for (const item of inventory.items) {
    const head = await publicHead(item, true);
    if (head.status === 200) {
      const remote = await remoteExistingHash(item);
      if (remote.bytes !== item.bytes || remote.sha256 !== item.sha256) {
        throw new Error(`Unexpected existing R2 object; no upload started: ${item.key}`);
      }
      existing.add(item.key);
    }
  }
  console.log(`Remote collision preflight OK: ${existing.size} identical objects, ${50 - existing.size} new.`);
  let uploaded = 0;
  for (const item of inventory.items) {
    if (!existing.has(item.key)) {
      const repeat = await publicHead(item, true);
      if (repeat.status !== 404) throw new Error(`Object appeared before PUT; refusing overwrite: ${item.key}`);
      wrangler(['r2', 'object', 'put', `${inventory.bucket}/${item.key}`,
        '--remote', '--file', path.resolve(repo, item.file),
        '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=31536000, immutable']);
      uploaded++;
    }
    await verifyPublic(item);
    console.log(`${existing.has(item.key) ? 'SKIPPED identical' : 'UPLOADED'} + VERIFIED ${item.key}`);
  }
  console.log(`SUCCESS: ${uploaded} new, ${existing.size} identical skipped, 50 public HEAD checks and 24 Range checks passed.`);
}
