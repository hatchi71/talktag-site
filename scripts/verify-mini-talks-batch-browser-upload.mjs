#!/usr/bin/env node
// Verify browser-uploaded Mini Talks through the bucket's active R2 custom domain.
// No credentials, writes to R2, or site deployment are performed here.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { defaultWork, expectedIds, option } from './mini-talks-batch-lib.mjs';

const work = option('--work', defaultWork);
const evidencePath = option('--dashboard-evidence', undefined);
if (!evidencePath) throw Error('Provide --dashboard-evidence from a signed-in R2 bucket inspection');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const release = path.join(work, 'release');
const inventoryBytes = await fs.readFile(path.join(release, 'inventory.json'));
const inventory = JSON.parse(inventoryBytes.toString('utf8'));
const evidence = JSON.parse(await fs.readFile(evidencePath, 'utf8'));
const entries = inventory.entries;
if (inventory.schema !== 'mini-talks-batch-local-inventory-v1' ||
    inventory.status !== 'local-qc-approved' || !Array.isArray(entries) || entries.length !== 18 ||
    new Set(entries.map(entry => entry.id)).size !== 18 ||
    new Set(entries.map(entry => entry.key)).size !== 18 ||
    entries.some(entry => !expectedIds.has(entry.id))) {
  throw Error('Expected the exact 18-card local QC-approved inventory');
}
if (evidence.schema !== 'mini-talks-batch-r2-dashboard-evidence-v1' ||
    evidence.source !== 'signed-in Cloudflare R2 dashboard' ||
    evidence.bucket !== 'talktag-audio' ||
    evidence.inventorySha256 !== sha256(inventoryBytes) ||
    evidence.listing?.confirmed !== true ||
    evidence.listing?.confirmedCount !== 18 ||
    !Array.isArray(evidence.listing.confirmedIds) ||
    evidence.listing.confirmedIds.length !== 18 ||
    new Set(evidence.listing.confirmedIds).size !== 18 ||
    evidence.listing.confirmedIds.some(id => !expectedIds.has(id)) ||
    evidence.customDomain?.hostname !== 'audio.talktag.co.kr' ||
    evidence.customDomain?.status !== 'Active' ||
    evidence.customDomain?.access !== 'Enabled' ||
    !Number.isFinite(Date.parse(evidence.reportedAt))) {
  throw Error('Signed-in R2 dashboard evidence is incomplete or does not match this inventory');
}

for (const entry of entries) {
  const unit = entry.id.slice(-3);
  if (!/^English\/mini-talks\/(00[2-9]|010)\/mt-en-a[12]-(00[2-9]|010)-[a-f0-9]{12}\.mp3$/.test(entry.key) ||
      entry.key !== `English/mini-talks/${unit}/${entry.id}-${entry.sha256?.slice(0, 12)}.mp3` ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.bytes) || entry.bytes < 1000 ||
      entry.url !== `https://audio.talktag.co.kr/${entry.key}`) {
    throw Error(`${entry.id}: invalid content-addressed bucket key or public URL`);
  }
}

// The dashboard identifies this hostname as an active custom domain on this
// bucket. Thus one HTTPS GET is both the direct R2-domain object readback and
// the learner-facing URL check; these are not claimed as independent probes.
const verifiedAt = new Date().toISOString();
const verified = [];
for (let start = 0; start < entries.length; start += 6) {
  const batch = await Promise.all(entries.slice(start, start + 6).map(async entry => {
    const url = `${entry.url}?v=${entry.sha256.slice(0, 12)}`;
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error(`${entry.id}: public R2 custom-domain GET returned HTTP ${response.status}`);
    if (response.headers.get('content-type')?.split(';')[0] !== 'audio/mpeg') {
      throw Error(`${entry.id}: public object was not served as audio/mpeg`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      throw Error(`${entry.id}: public R2 custom-domain bytes/SHA-256 mismatch`);
    }
    return {...entry, url, verification: {
      r2Sha256Verified: true,
      publicSha256Verified: true,
      verifiedAt,
      method: 'single HTTPS GET through active direct Cloudflare R2 custom domain',
      dashboardListingConfirmed: true,
    }};
  }));
  verified.push(...batch);
}

const output = {
  schema: 'mini-talks-batch-verified-inventory-v1',
  status: 'public-verified',
  scope: inventory.scope,
  verificationMethod: 'browser-upload; R2 custom-domain public GET for readback and CDN',
  dashboardEvidence: evidence,
  entries: verified,
};
const outputPath = path.join(release, 'verified-inventory.json');
await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(`PASS ${verified.length} public R2 custom-domain files; exact byte lengths and SHA-256; wrote ${outputPath}`);
