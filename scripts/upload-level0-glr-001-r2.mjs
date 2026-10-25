#!/usr/bin/env node
// Upload only the two technically QC-passed A0 001 files, then verify R2 and CDN bytes.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const credentialFile = process.env.R2_CREDENTIAL_FILE;
if (!credentialFile) throw Error('Temporary credential file path is required');
const credentialStat = await fs.stat(credentialFile);
if (credentialStat.mode & 0o077) throw Error('Temporary credential file must be owner-only');
const {accessKeyId, secretAccessKey, accountId} = JSON.parse(await fs.readFile(credentialFile, 'utf8'));
if (!accessKeyId || !secretAccessKey || !accountId) throw Error('Temporary R2 credentials are required');
const manifest = JSON.parse(await fs.readFile('/private/tmp/talktag-level0-001/final/manifest.json', 'utf8'));
const qc = JSON.parse(await fs.readFile('/private/tmp/talktag-level0-001/final/qc-report.json', 'utf8'));
if (qc.status !== 'technical-pass' || manifest.cards.length !== 2 || qc.cards.length !== 2)
  throw Error('Two-card technical QC is incomplete');
const host = `${accountId}.r2.cloudflarestorage.com`;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();
const paths = {en: 'English/guided/a0-001-20261025/', ko: 'Korean/guided/a0-001-20261025/'};

async function request(method, key, body) {
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const date = stamp.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const uri = '/talktag-audio/' + key.split('/').map(encodeURIComponent).join('/');
  const payloadHash = digest(body || Buffer.alloc(0));
  const headers = {'content-type': 'audio/mpeg', host,
    'x-amz-content-sha256': payloadHash, 'x-amz-date': stamp};
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonical = `${method}\n${uri}\n\n${names.map(name => `${name}:${headers[name]}\n`).join('')}\n${signedHeaders}\n${payloadHash}`;
  const toSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${digest(Buffer.from(canonical))}`;
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, date), 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(toSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${uri}`, {method, headers, body});
  if (!response.ok) throw Error(`${method} ${key}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  return Buffer.from(await response.arrayBuffer());
}

for (const card of manifest.cards) {
  if (!paths[card.language] || !qc.cards.some(item => item.id === card.id && item.sha256 === card.sha256))
    throw Error(`Unexpected or unverified card ${card.id}`);
  const local = await fs.readFile(card.localFile);
  if (digest(local) !== card.sha256) throw Error(`Local SHA-256 mismatch: ${card.id}`);
  const key = paths[card.language] + card.filename;
  await request('PUT', key, local);
  if (digest(await request('GET', key)) !== card.sha256) throw Error(`R2 readback mismatch: ${key}`);
  const publicUrl = `https://audio.talktag.co.kr/${key}?v=${card.sha256.slice(0, 12)}`;
  const publicResponse = await fetch(publicUrl);
  if (!publicResponse.ok || digest(Buffer.from(await publicResponse.arrayBuffer())) !== card.sha256)
    throw Error(`Public CDN mismatch: ${key}, HTTP ${publicResponse.status}`);
  console.log(`PASS ${card.id} ${local.length} bytes · R2 and public SHA-256 ${card.sha256.slice(0, 16)}`);
}
