#!/usr/bin/env node
// Deterministic, read-only-to-media inventory for the 50 English GLR 001 R2 objects.
// This script never connects to Cloudflare or uploads files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/guided/segments-001');
const segments = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const variants = JSON.parse(fs.readFileSync(path.join(root, 'variants/manifest.json'), 'utf8'));
const releaseBase = 'https://audio.talktag.co.kr/English/guided/segments-001/v1-20261016/';
if (segments.releaseBase !== releaseBase || variants.releaseBase !== releaseBase) {
  throw new Error('Segment/variant manifest release URL mismatch');
}
const records = [segments.dings.start, segments.dings.end,
  ...segments.cards.flatMap(card => card.lines),
  ...variants.cards.flatMap(card => card.variants)];
if (records.length !== 50) throw new Error(`Expected exactly 50 MP3 assets, got ${records.length}`);
const keys = new Set();
const items = records.map(record => {
  const url = new URL(record.audio);
  if (url.origin !== 'https://audio.talktag.co.kr' || !url.href.startsWith(releaseBase)) {
    throw new Error(`Wrong release media URL: ${record.audio}`);
  }
  const relative = url.pathname.slice(new URL(releaseBase).pathname.length);
  if (!relative || relative.includes('..') || !relative.endsWith('.mp3')) {
    throw new Error(`Invalid asset path: ${record.audio}`);
  }
  const file = `audio/guided/segments-001/${relative}`;
  const absolute = path.join(repo, file);
  if (!fs.existsSync(absolute)) throw new Error(`Missing local QC file: ${absolute}`);
  const bytes = fs.statSync(absolute).size;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  if (sha256 !== record.sha256 || (record.bytes && record.bytes !== bytes) ||
      url.search !== `?v=${sha256.slice(0, 12)}`) {
    throw new Error(`Hash, bytes, or version query mismatch: ${file}`);
  }
  const key = `English/guided/segments-001/v1-20261016/${relative}`;
  if (keys.has(key)) throw new Error(`Duplicate R2 key: ${key}`);
  keys.add(key);
  return { key, file, bytes, sha256, url: record.audio };
}).sort((a, b) => a.key.localeCompare(b.key, 'en'));

const inventory = {
  version: 1, bucket: 'talktag-audio', releaseBase,
  objectCount: items.length, totalBytes: items.reduce((total, item) => total + item.bytes, 0),
  items,
};
const output = path.join(root, 'upload-inventory.json');
fs.writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`${items.length} R2 objects inventoried; ${(inventory.totalBytes / 1024 / 1024).toFixed(2)} MiB; no upload performed.`);
console.log(output);
