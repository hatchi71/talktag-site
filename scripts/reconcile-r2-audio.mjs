// Read-only reconciliation of a complete R2 listing against the deployed audio catalog.
// This writes a deletion PLAN, never deletes bucket objects.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
if (!args.includes('--inventory') || !args.includes('--output')) {
  throw new Error('Usage: node scripts/reconcile-r2-audio.mjs --inventory FILE --output FILE [--revision origin/main]');
}
const revision = args.includes('--revision') ? value('--revision') : 'origin/main';
const inventoryPath = path.resolve(value('--inventory'));
const outputPath = path.resolve(value('--output'));
const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
const source = (file) => git('show', `${revision}:${file}`);
const revisionSha = git('rev-parse', revision).trim();
const catalogFiles = git('grep', '-l', 'audio.talktag.co.kr', revision, '--', '*.js', '*.html')
  .trim().split('\n').map((file) => file.slice(revision.length + 1))
  .filter((file) => !/^(?:scripts|docs|preview|design-previews)\//.test(file));
const references = new Map();
const urlPattern = /https:\/\/audio\.talktag\.co\.kr\/[A-Za-z0-9_./%-]+\.mp3(?:\?[A-Za-z0-9_=&%-]+)?/g;
function addReference(url, file) {
  const key = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!references.has(key)) references.set(key, new Set());
  references.get(key).add(file);
}
for (const file of catalogFiles) {
  for (const match of source(file).matchAll(urlPattern)) addReference(match[0], file);
}

// The JLPT page builds ten audio URLs from one base path and a filename array.
const jlptFile = 'japanese/n4-audio-lessons.js';
const jlptSource = source(jlptFile);
const jlptBase = jlptSource.match(/var base = "([^"]+)";/)?.[1];
const jlptFiles = jlptSource.match(/var files = (\[[\s\S]*?\]);/)?.[1];
if (!jlptBase || !jlptFiles) throw new Error('Cannot resolve dynamically constructed JLPT audio URLs');
for (const filename of JSON.parse(jlptFiles)) addReference(jlptBase + encodeURIComponent(filename), jlptFile);

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
if (inventory.bucket !== 'talktag-audio' || inventory.count !== inventory.objects.length) {
  throw new Error('Inventory does not match the expected complete talktag-audio bucket listing');
}
const objects = new Map(inventory.objects.map((item) => [item.key, item]));
if (objects.size !== inventory.count) throw new Error('Duplicate object keys in inventory');
const missing = [...references].filter(([key]) => !objects.has(key))
  .map(([key, files]) => ({ key, files: [...files] }));
if (missing.length) throw new Error(`${missing.length} published references are missing from R2: ${missing[0].key}`);

// Every entry is a superseded release namespace confirmed absent from the deployed catalog.
// A new, unrecognized prefix fails closed rather than becoming an automatic deletion candidate.
const retiredPrefixes = [
  'English/guided/20261009-card-dings/',
  'English/guided/20261009-short-cards/',
  'English/guided/20261009-qc15/',
  'English/guided/20261009-qc12/',
  'English/guided/20261010-replacement001002/',
  'English/guided/20261010-lauren004/',
  'English/guided/20261010-c21/',
  'English/guided/20261011-max006/',
  'English/guided/20261009-lauren003/',
  'English/guided/20261011-roger007/',
  'English/guided/20261010-jarnathan005/',
  'English/guided/segments-001/v1-20261016/',
  'English/guided/segments-002/v1-20261016/',
  'English/boot-camp/vocal-camp/001/20261008/',
  'English/boot-camp/vocal-camp/004/20261022-alex-american-qc1/',
  'English/boot-camp/vocal-camp/005/20261022-bella-american-qc1/',
  'English/boot-camp/vocal-camp/segments-001-002/v1-20261016/',
  'Korean/guided/20261010-001/',
  'Korean/boot-camp/vocal-camp/segments-001-002/v1-20261016/',
  'Japanese/guided/20261010-001/',
  'Japanese/boot-camp/vocal-camp/segments-001/v1-20261016/',
];
const unreferencedAudio = inventory.objects.filter(({ key, bytes }) => bytes > 0 && /\.mp3$/i.test(key) && !references.has(key));
const uncategorized = unreferencedAudio.filter(({ key }) => !retiredPrefixes.some((prefix) => key.startsWith(prefix)));
if (uncategorized.length) throw new Error(`${uncategorized.length} unreferenced MP3s do not belong to a reviewed retired prefix: ${uncategorized[0].key}`);
const deletionCandidates = unreferencedAudio.map(({ key, bytes, etag, modified }) => ({ key, bytes, etag, modified }));
const candidateKeys = new Set(deletionCandidates.map(({ key }) => key));
const keptObjects = inventory.objects.filter(({ key }) => !candidateKeys.has(key));
const groups = retiredPrefixes.map((prefix) => {
  const matched = deletionCandidates.filter(({ key }) => key.startsWith(prefix));
  return { prefix, count: matched.length, bytes: matched.reduce((sum, item) => sum + item.bytes, 0) };
}).filter(({ count }) => count);
const plan = {
  bucket: inventory.bucket,
  revision: revisionSha,
  inventoryRetrievedAt: inventory.retrievedAt,
  plannedAt: new Date().toISOString(),
  safeguards: 'Read-only plan. Unrecognized prefixes, missing non-pilot references and live-key overlap fail closed. Refresh inventory and compare ETags before deletion.',
  catalogFiles,
  referencedObjects: references.size,
  missingReferences: missing,
  inventory: { count: inventory.count, bytes: inventory.bytes },
  deletion: {
    count: deletionCandidates.length,
    bytes: deletionCandidates.reduce((sum, item) => sum + item.bytes, 0),
    groups,
    objects: deletionCandidates,
  },
  remaining: { count: keptObjects.length, bytes: keptObjects.reduce((sum, item) => sum + item.bytes, 0) },
};
fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify({ outputPath, revision: revisionSha, catalogFiles: catalogFiles.length,
  referencedObjects: references.size, missingReferences: missing.length,
  deletionCount: plan.deletion.count, deletionBytes: plan.deletion.bytes,
  remainingCount: plan.remaining.count, remainingBytes: plan.remaining.bytes, groups }, null, 2));
