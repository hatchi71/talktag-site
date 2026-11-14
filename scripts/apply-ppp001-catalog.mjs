#!/usr/bin/env node
// Replace the public 001 listings only after the protected PPP release pack passes QC.
// Existing protected card rows and assets remain available by their archived IDs.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const catalogFile = resolve(root, 'public/catalog-metadata.js');
const oldIdsFile = resolve(root, 'docs/releases/ppp001-old-ids.json');
const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const areas = ['readable', 'guided-listen-repeat', 'mini-talks', 'vocal-camp', 'story-camp'];
const key = row => `${row.card.language}:${row.card.level}:${row.card.area}`;
const digest = data => createHash('sha256').update(data).digest('hex');

function parseCatalog(source) {
  const begin = source.indexOf('const d=');
  const end = source.indexOf(';window.TalkTagCardTitles', begin);
  if (begin < 0 || end < 0) throw new Error('Unexpected catalog wrapper');
  return { prefix: source.slice(0, begin + 8), data: JSON.parse(source.slice(begin + 8, end)), suffix: source.slice(end) };
}
const slug = id => /^[a-z0-9-]+$/.test(id);
const duration = seconds => {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
};
const firstMeaning = payload => String(payload.meanings?.[0] || '').trim();
const soundArea = lesson => lesson.type === 'guided' ? 'guided-listen-repeat' : lesson.format === 'mini-talks' ? 'mini-talks' : null;

export function applyPpp001Catalog(source, pack, oldIdsRecord) {
  if (pack.releaseReady !== true || pack.episode !== '001' || pack.release !== 'PPP001-20261114')
    throw new Error('PPP001 private release pack is not QC approved');
  if (digest(source) !== oldIdsRecord.publicCatalogSha256)
    throw new Error('Public catalog changed since the old 001 identity audit; reconcile it first');
  const old = new Set(oldIdsRecord.oldCardIds);
  if (old.size !== 67) throw new Error('Expected the 67 audited old 001 cards');
  const rows = pack.rows;
  if (!Array.isArray(rows) || rows.length < 64) throw new Error('Incomplete PPP001 pack');
  const grouped = new Map();
  for (const row of rows) {
    const { card, content, artwork } = row;
    if (!slug(card.card_id) || !['en', 'ko'].includes(card.language) || !levels.includes(card.level)
      || card.ordinal !== 1 || !areas.includes(card.area) || content?.card_id !== card.card_id
      || !content.payload?.title || !artwork?.path || !artwork?.alt)
      throw new Error(`Invalid PPP001 catalog row: ${card.card_id}`);
    const group = key(row);
    grouped.set(group, [...(grouped.get(group) || []), row]);
  }
  for (const language of ['en', 'ko']) for (const level of levels) for (const area of areas) {
    if (level === 'A0' && !['readable', 'guided-listen-repeat'].includes(area)) continue;
    const group = grouped.get(`${language}:${level}:${area}`);
    if (!group?.length || (area !== 'guided-listen-repeat' && group.length !== 1))
      throw new Error(`Incomplete or duplicate ${language} ${level} ${area} catalog group`);
  }
  const { prefix, data: catalog, suffix } = parseCatalog(source);
  const incomingSound = new Map();
  const incomingReadable = new Map();
  for (const [group, entries] of grouped) {
    const [language, level, area] = group.split(':');
    if (area === 'guided-listen-repeat' || area === 'mini-talks') {
      incomingSound.set(group, entries.map(({ card, content, artwork, media }) => {
        const payload = content.payload;
        const main = media.find(file => file.variant === 'main');
        if (!main || !Number.isFinite(payload.durationSeconds))
          throw new Error(`${card.card_id} has no duration-verified main audio`);
        const part = /-part(\d+)$/.exec(card.card_id);
        return {
          id: card.card_id, type: area === 'guided-listen-repeat' ? 'guided' : 'plain',
          format: area === 'mini-talks' ? 'mini-talks' : level === 'A0' ? 'level0' : 'miniskit',
          level, title: payload.title, description: firstMeaning(payload),
          durationLabel: duration(payload.durationSeconds), artwork: artwork.path,
          artworkAlt: artwork.alt, unit: 1, ...(part ? { partIndex: Number(part[1]) } : {}),
          language, available: true,
          ...(area === 'guided-listen-repeat' ? { training: { defaultReps: payload.training?.defaultReps } } : {})
        };
      }));
    } else if (area === 'readable') {
      const row = entries[0];
      const paired = grouped.get(`${language === 'en' ? 'ko' : 'en'}:${level}:readable`)?.[0];
      const paragraphCount = row.content.payload.paragraphs?.length || 0;
      if (!paragraphCount || !paired) throw new Error(`${row.card.card_id} has no paired Readable`);
      const label = {
        id: row.card.card_id, cardId: row.card.card_id, level,
        title: language === 'ko' ? paired.content.payload.title : row.content.payload.title,
        number: '001', unit: 1, language, status: 'published', catalogOnly: true,
        artwork: row.artwork.path, artworkAlt: row.artwork.alt,
        preview: language === 'ko' ? 'Read, recall, and retell this connected story.' : '이야기를 읽고 기억한 뒤 내 말로 다시 이야기해 보세요.'
      };
      if (language === 'ko') {
        label.nativeTitle = row.content.payload.title;
        label.situation = 'A connected story in the PPP 001 sequence.';
        label.readingMinutes = String(Math.max(1, Math.ceil(row.content.payload.paragraphs
          .map(part => part.ko || '').join(' ').length / 420)));
      } else label.genre = level === 'A0' ? 'Picture story' : 'Everyday story';
      incomingReadable.set(group, label);
    }
  }
  const soundSeen = new Set();
  const sound = [];
  for (const lesson of catalog.sound) {
    if (old.has(lesson.id)) {
      const group = `${lesson.language}:${lesson.level}:${soundArea(lesson)}`;
      if (!soundSeen.has(group)) {
        sound.push(...(incomingSound.get(group) || [])); soundSeen.add(group);
      }
    } else sound.push(lesson);
  }
  for (const [group, entries] of incomingSound) if (!soundSeen.has(group)) sound.unshift(...entries);
  const readSeen = new Set();
  const readable = [];
  for (const entry of catalog.readable) {
    if (old.has(entry.id) || old.has(entry.cardId)) {
      const group = `${entry.language}:${entry.level}:readable`;
      if (!readSeen.has(group)) {
        readable.push(incomingReadable.get(group)); readSeen.add(group);
      }
    } else readable.push(entry);
  }
  for (const [group, entry] of incomingReadable) if (!readSeen.has(group)) readable.unshift(entry);
  catalog.sound = sound;
  catalog.readable = readable;
  for (const language of ['en', 'ko']) for (const camp of ['story', 'vocal']) {
    const family = catalog.camps[`${language}-${camp}-camp`]?.find(item => item.number === '001');
    if (!family) throw new Error(`No existing ${language} ${camp} 001 family`);
    const area = `${camp}-camp`;
    family.title = grouped.get(`${language}:A1:${area}`)[0].content.payload.title;
    family.theme = language === 'ko'
      ? 'Read the story first, then make the same situation your own.'
      : '리더블 이야기와 연결된 장면을 내 말로 연습하세요.';
    family.cardIds = Object.fromEntries(levels.slice(1).map(level =>
      [level, grouped.get(`${language}:${level}:${area}`)[0].card.card_id]));
    family.status = 'published';
    family.audioStatus = 'ready';
  }
  for (const row of rows) {
    const { card, content, artwork } = row;
    const main = row.media.find(file => file.variant === 'main');
    catalog.titles[card.card_id] = {
      title: content.payload.title, language: card.language, area: card.area,
      level: card.level, ordinal: 1,
      ...(main ? { durationLabel: duration(content.payload.durationSeconds) } : {})
    };
    catalog.artwork[card.card_id] = { src: artwork.path, alt: artwork.alt };
  }
  for (const id of new Set([...old, ...(oldIdsRecord.oldProtectedCardIds || [])])) {
    delete catalog.titles[id];
    delete catalog.artwork[id];
  }
  const activeIds = [...catalog.sound.map(item => item.id), ...catalog.readable.map(item => item.cardId)];
  if (activeIds.some(id => old.has(id))) throw new Error('Archived 001 card remains in active catalog');
  return `${prefix}${JSON.stringify(catalog)}${suffix}`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const packFile = process.argv[2];
  if (!packFile) throw new Error('Usage: node scripts/apply-ppp001-catalog.mjs /absolute/private/approved-pack.json --write');
  const pack = JSON.parse(readFileSync(resolve(packFile), 'utf8'));
  const oldIds = JSON.parse(readFileSync(oldIdsFile, 'utf8'));
  const before = readFileSync(catalogFile, 'utf8');
  const after = applyPpp001Catalog(before, pack, oldIds);
  if (process.argv.includes('--write')) {
    writeFileSync(catalogFile, after);
    console.log(`Published catalog staged: ${pack.rows.length} PPP001 rows`);
  } else console.log(`Catalog QC dry run passed: ${pack.rows.length} PPP001 rows`);
}
