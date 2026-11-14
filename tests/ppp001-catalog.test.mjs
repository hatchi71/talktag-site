import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyPpp001Catalog } from '../scripts/apply-ppp001-catalog.mjs';

const root = resolve(import.meta.dirname, '..');
const published = readFileSync(resolve(root, 'public/catalog-metadata.js'), 'utf8');
const previous = JSON.parse(readFileSync(resolve(root, 'docs/releases/ppp001-old-ids.json'), 'utf8'));
const readCatalog = source => JSON.parse(source.slice(source.indexOf('const d=') + 8,
  source.indexOf(';window.TalkTagCardTitles')));
const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const areas = ['readable', 'guided-listen-repeat', 'mini-talks', 'vocal-camp', 'story-camp'];
const names = { readable: 'readable', 'guided-listen-repeat': 'guided',
  'mini-talks': 'mt', 'vocal-camp': 'vocal-camp', 'story-camp': 'story-camp' };
const rows = [];
for (const language of ['en', 'ko']) for (const level of levels) for (const area of areas) {
  if (level === 'A0' && !['readable', 'guided-listen-repeat'].includes(area)) continue;
  const id = area === 'mini-talks' ? `mt-${language}-${level.toLowerCase()}-001-ppp-v2`
    : `${language}-${names[area]}-${level.toLowerCase()}-001-ppp-v2`;
  const payload = { id, title: `${language} ${level} ${area}`, durationSeconds: 65,
    paragraphs: [{ en: 'Hello.', ko: '안녕하세요.' }], meanings: ['At the art room.'],
    training: { defaultReps: level === 'A0' ? 5 : 10 } };
  rows.push({ card: { card_id: id, language, level, area, ordinal: 1 },
    content: { card_id: id, payload },
    media: ['guided-listen-repeat', 'mini-talks'].includes(area) ? [{ variant: 'main' }] : [],
    artwork: { path: '/assets/ppp001-scenes/001-a0.jpg', alt: 'People meet at an art room.' } });
}
const pack = { releaseReady: true, episode: '001', release: 'PPP001-20261114', rows };

test('PPP001 replaces all audited public 001 listings and keeps other content', () => {
  const after = readCatalog(published);
  const old = new Set(previous.oldCardIds);
  assert.equal(after.sound.filter(item => old.has(item.id)).length, 0);
  assert.equal(after.readable.filter(item => old.has(item.id) || old.has(item.cardId)).length, 0);
  assert.equal(after.readable.filter(item => item.cardId?.includes('-001-ppp-v2')).length, 14);
  assert.equal(after.sound.filter(item => item.id.includes('-001-ppp-v2')).length, 32);
  assert.equal(Object.keys(after.titles).filter(id => id.includes('-001-ppp-v2')).length, 70);
  assert.equal(Object.keys(after.artwork).filter(id => id.includes('-001-ppp-v2')).length, 70);
  assert.equal(after.camps['ja-story-camp'][0].number, '001');
  assert.equal(after.camps['en-story-camp'][0].cardIds.C2, 'en-story-camp-c2-001-ppp-v2');
  assert.equal(after.titles['guided-a0-001'], undefined);
  assert.equal(after.artwork['en-readable-001-a1'], undefined);
});

test('catalog update fails closed on an unapproved pack or changed baseline', () => {
  assert.throws(() => applyPpp001Catalog(published, { ...pack, releaseReady: false }, previous), /not QC approved/);
  assert.throws(() => applyPpp001Catalog(published, pack, previous), /changed since/);
});
