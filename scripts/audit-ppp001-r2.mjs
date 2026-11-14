#!/usr/bin/env node
// Read-only, bucket-scoped inventory for the PPP001 replacement audit.
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  if (!['--credential', '--out'].includes(process.argv[i]) || !process.argv[i + 1])
    throw new Error('Use --credential PRIVATE.json --out PRIVATE.json');
  args[process.argv[i].slice(2)] = process.argv[i + 1];
}
if (!args.credential || !args.out) throw new Error('Credential and private output are required');
const authPath = resolve(args.credential);
if ((statSync(authPath).mode & 0o077) !== 0) throw new Error('Credential file must be mode 0600');
const auth = JSON.parse(readFileSync(authPath, 'utf8'));
if (!/^[A-Za-z0-9]{32}$/.test(auth.access || '')
  || !/^[A-Za-z0-9]{64}$/.test(auth.secret || '')
  || !/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(auth.endpoint || ''))
  throw new Error('Unexpected scoped credential shape');
const bucket = 'talktag-private-audio-preview';
const client = new S3Client({ region: 'auto', endpoint: auth.endpoint,
  credentials: { accessKeyId: auth.access, secretAccessKey: auth.secret },
  forcePathStyle: true, maxAttempts: 3 });
const objects = [];
let continuationToken;
try {
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, MaxKeys: 1000, ...(continuationToken ? { ContinuationToken: continuationToken } : {})
    }));
    for (const item of page.Contents || []) {
      if (!item.Key || !Number.isSafeInteger(item.Size) || item.Size < 0)
        throw new Error('Invalid R2 list item');
      objects.push({ key: item.Key, bytes: item.Size,
        modified: item.LastModified?.toISOString() || null });
    }
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);
} finally { client.destroy(); }
objects.sort((a, b) => a.key.localeCompare(b.key));
const prefixes = {};
for (const item of objects) {
  const prefix = item.key.split('/')[0];
  const group = prefixes[prefix] ||= { count: 0, bytes: 0 };
  group.count++;
  group.bytes += item.bytes;
}
const out = resolve(args.out);
writeFileSync(out, `${JSON.stringify({ schemaVersion: 1, bucket,
  capturedAt: new Date().toISOString(), objectCount: objects.length,
  totalBytes: objects.reduce((n, item) => n + item.bytes, 0), prefixes, objects }, null, 2)}\n`,
{ mode: 0o600 });
console.log(JSON.stringify({ objectCount: objects.length,
  totalBytes: objects.reduce((n, item) => n + item.bytes, 0),
  ppp001: prefixes.ppp001 || { count: 0, bytes: 0 },
  rootObjects: objects.filter(item => !item.key.includes('/')).length }));
