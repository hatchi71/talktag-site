#!/usr/bin/env node
// Upload only the 18 QC-approved English Mini Talks A1/A2 002–010 MP3s.
// Requires a short-lived, bucket-scoped R2 credential; never logs its values.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { defaultWork, expectedIds, option } from './mini-talks-batch-lib.mjs';

const work = option('--work', defaultWork);
const credentialFile = process.env.R2_CREDENTIAL_FILE;
if (!credentialFile) throw Error('R2_CREDENTIAL_FILE is required');
const mode = (await fs.stat(credentialFile)).mode;
if (mode & 0o077) throw Error('Credential file must be owner-only');
const credential = JSON.parse(await fs.readFile(credentialFile, 'utf8'));
if (!credential || typeof credential !== 'object' || Array.isArray(credential)) {
  throw Error('Invalid R2 credential file');
}
function credentialField(longName, shortName) {
  const longValue = credential[longName];
  const shortValue = credential[shortName];
  if (longValue != null && shortValue != null && longValue !== shortValue) {
    throw Error(`Conflicting R2 credential fields: ${longName} and ${shortName}`);
  }
  const value = longValue ?? shortValue;
  return typeof value === 'string' && value.length > 0 ? value : null;
}
const accessKeyId = credentialField('accessKeyId', 'access');
const secretAccessKey = credentialField('secretAccessKey', 'secret');
const endpoint = credential.endpoint;
if (!accessKeyId || !secretAccessKey || typeof endpoint !== 'string' || !endpoint) {
  throw Error('Incomplete R2 credentials');
}
const endpointUrl = new URL(endpoint);
if (endpointUrl.protocol !== 'https:' ||
    !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(endpointUrl.hostname) ||
    endpointUrl.pathname !== '/' || endpointUrl.search || endpointUrl.hash) {
  throw Error('Expected the account-scoped HTTPS Cloudflare R2 S3 endpoint');
}
const host = endpointUrl.host;
const release = path.join(work, 'release');
const inventory = JSON.parse(await fs.readFile(path.join(release, 'inventory.json'), 'utf8'));
if (inventory.schema !== 'mini-talks-batch-local-inventory-v1' ||
    inventory.status !== 'local-qc-approved' || inventory.entries?.length !== 18 ||
    new Set(inventory.entries.map(entry => entry.id)).size !== 18 ||
    inventory.entries.some(entry => !expectedIds.has(entry.id))) {
  throw Error('Release inventory is not the exact 18-card QC-approved batch');
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();

async function r2(method, key, body) {
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const date = stamp.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const uri = '/talktag-audio/' + key.split('/').map(encodeURIComponent).join('/');
  const payloadHash = digest(body || Buffer.alloc(0));
  const headers = {host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': stamp};
  if (method === 'PUT') headers['content-type'] = 'audio/mpeg';
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonical = `${method}\n${uri}\n\n${names.map(name => `${name}:${headers[name]}\n`).join('')}\n${signedHeaders}\n${payloadHash}`;
  const toSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${digest(Buffer.from(canonical))}`;
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, date), 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(toSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${uri}`, {method, headers, body});
  if (!response.ok) throw Error(`${method} ${key}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  return Buffer.from(await response.arrayBuffer());
}

// Verify every local source before changing the bucket.  There is no rollback
// deletion: content-hashed keys are safe to leave unreferenced if a later check fails.
const local = [];
for (const entry of inventory.entries) {
  if (!/^English\/mini-talks\/(00[2-9]|010)\/mt-en-a[12]-(00[2-9]|010)-[a-f0-9]{12}\.mp3$/.test(entry.key) ||
      !entry.url.endsWith(entry.key) || entry.key.split('/')[2] !== entry.id.slice(-3)) {
    throw Error(`${entry.id}: unexpected R2 key`);
  }
  const bytes = await fs.readFile(entry.source);
  if (digest(bytes) !== entry.sha256 || bytes.length !== entry.bytes) throw Error(`${entry.id}: local file changed`);
  local.push({entry, bytes});
}

const verified = [];
for (const {entry, bytes} of local) {
  await r2('PUT', entry.key, bytes);
  if (digest(await r2('GET', entry.key)) !== entry.sha256) throw Error(`${entry.id}: R2 readback checksum mismatch`);
  const publicUrl = `${entry.url}?v=${entry.sha256.slice(0, 12)}`;
  let publicMatch = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(publicUrl, {cache: 'no-store'});
    publicMatch = response.ok && digest(Buffer.from(await response.arrayBuffer())) === entry.sha256;
    if (publicMatch) break;
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  if (!publicMatch) throw Error(`${entry.id}: public URL checksum mismatch`);
  verified.push({...entry, url: publicUrl, verification: {
    r2Sha256Verified: true, publicSha256Verified: true, verifiedAt: new Date().toISOString()
  }});
  console.log(`PASS ${entry.id}: R2 and public SHA-256 ${entry.sha256.slice(0, 16)}`);
}
await fs.writeFile(path.join(release, 'verified-inventory.json'),
  JSON.stringify({schema: 'mini-talks-batch-verified-inventory-v1', status: 'public-verified',
    scope: inventory.scope, entries: verified}, null, 2) + '\n');
console.log('All 18 MP3s verified publicly. Revoke the temporary R2 credential after live-site checks.');
