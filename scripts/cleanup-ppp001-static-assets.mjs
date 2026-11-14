#!/usr/bin/env node
// Post-live removal of unshared English/Korean 001 artwork. Dry-run by default.
// This never touches private audio, learning records, Japanese art, or new PPP art.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };

// Exact inventory from the current repository. Keep Japanese native-001 art and
// every new ppp001-scenes file. Do not use a filename-only glob here.
export const oldStaticAssets = Object.freeze([
  ...['en', 'ko'].flatMap(language => ['story', 'vocal']
    .map(area => `assets/bootcamp-scenes/${language}/001-v3-${area}.jpg`)),
  ...levels.map(level => `assets/essay-scenes/en/001-${level}.jpg`),
  'assets/glr-scenes/en/a0-001-greeting-v1.jpg',
  'assets/glr-scenes/ko-a0-001-greeting-v1.jpg',
  ...levels.map(level => `assets/glr-scenes/guided-${level}-01.webp`),
  'assets/illustrations/ko-a0-20261101/ko-guided-a0-001.png',
  'assets/readable-scenes/en/001-garden-v1.jpg',
  'assets/readable-scenes/ko/001-a1-bus-v2.jpg'
]);

function parseCatalog(source) {
  const begin = source.indexOf('const d=');
  const end = source.indexOf(';window.TalkTagCardTitles', begin);
  if (begin < 0 || end < 0) fail('Unexpected catalog wrapper');
  return JSON.parse(source.slice(begin + 8, end));
}

function publicTextFiles(root) {
  const result = [];
  const visit = directory => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if (directory === root && item.name === 'assets') continue;
      const path = join(directory, item.name);
      if (item.isDirectory()) visit(path);
      else if (item.isFile() && ['.html', '.js', '.css', '.json', '.mjs'].includes(extname(path))) result.push(path);
    }
  };
  visit(root);
  return result;
}

export function verifyStaticCleanup({ audit, pack, oldIds, catalogSource, references, now = Date.now() }) {
  if (audit?.schemaVersion !== 1 || audit.release !== 'PPP001-20261114'
    || audit.liveVerified !== true || audit.staticAssetReferenceAuditPassed !== true
    || audit.memberLearningRetentionVerified !== true || pack?.releaseReady !== true
    || pack.release !== audit.release || pack.episode !== '001')
    fail('Live release, member retention, and static reference audit must be verified');
  const verifiedAt = Date.parse(audit.verifiedAt || '');
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 300000 || now - verifiedAt > 7 * 86400000)
    fail('Static cleanup requires a recent, dated live audit');
  if (!Array.isArray(oldIds.oldCardIds) || oldIds.oldCardIds.length !== 67
    || !Array.isArray(oldIds.oldProtectedCardIds) || oldIds.oldProtectedCardIds.length !== 67
    || !Array.isArray(pack.rows) || pack.rows.length < 64
    || audit.oldProtectedIdsSha256 !== hash(oldIds.oldProtectedCardIds.join('\n'))
    || audit.newCardIdsSha256 !== hash(pack.rows.map(row => row.card.card_id).join('\n'))
    || audit.publicCatalogSha256 !== hash(catalogSource))
    fail('Private release identities or deployed catalog checksum changed');
  const catalog = parseCatalog(catalogSource);
  const active = new Set([
    ...catalog.sound.map(item => item.id),
    ...catalog.readable.flatMap(item => [item.id, item.cardId].filter(Boolean)),
    ...Object.values(catalog.camps).flatMap(families => families.flatMap(family =>
      Object.values(family.cardIds || {})))
  ]);
  const old = new Set([...oldIds.oldCardIds, ...oldIds.oldProtectedCardIds]);
  if ([...active, ...Object.keys(catalog.titles), ...Object.keys(catalog.artwork)]
    .some(id => old.has(id))) fail('An old 001 card remains in the current public catalog');
  if (pack.rows.some(row => !active.has(row.card.card_id)
    || !catalog.titles[row.card.card_id] || !catalog.artwork[row.card.card_id]))
    fail('A new PPP001 card is absent from the current public catalog');
  for (const [file, source] of references) for (const asset of oldStaticAssets) {
    if (source.includes(`/${asset}`) || source.includes(asset))
      fail(`Old asset is still referenced: ${asset} in ${file}`);
  }
  return oldStaticAssets;
}

function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--audit') options.audit = resolve(argv[++i] || fail('--audit needs a file'));
    else if (arg === '--pack') options.pack = resolve(argv[++i] || fail('--pack needs a file'));
    else if (arg === '--delete') options.delete = true;
    else fail(`Unknown argument ${arg}`);
  }
  if (!options.audit || !options.pack) fail('Use --audit and --pack; add --delete only after reviewing dry run');
  const publicRoot = resolve(repository, 'public');
  const paths = verifyStaticCleanup({
    audit: JSON.parse(readFileSync(options.audit, 'utf8')),
    pack: JSON.parse(readFileSync(options.pack, 'utf8')),
    oldIds: JSON.parse(readFileSync(resolve(repository, 'docs/releases/ppp001-old-ids.json'), 'utf8')),
    catalogSource: readFileSync(resolve(publicRoot, 'catalog-metadata.js'), 'utf8'),
    references: publicTextFiles(publicRoot).map(path => [path, readFileSync(path, 'utf8')])
  });
  for (const asset of paths) {
    const path = resolve(publicRoot, asset);
    if (!path.startsWith(`${publicRoot}/`)) fail('Asset path escaped public root');
    if (!existsSync(path)) fail(`Expected old asset is missing; reconcile inventory: ${asset}`);
    console.log(`${options.delete ? 'DELETE' : 'candidate'} ${asset}`);
  }
  if (options.delete) {
    for (const asset of paths) unlinkSync(resolve(publicRoot, asset));
    console.log(`Removed ${paths.length} unshared old 001 images from the current site tree.`);
  } else console.log(`Dry run: ${paths.length} unshared old 001 images; no files changed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`PPP001 static cleanup refused: ${error.message}`); process.exitCode = 1; }
}
