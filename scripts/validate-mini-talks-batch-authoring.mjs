import assert from 'node:assert/strict';
import { loadBatch } from './mini-talks-batch-lib.mjs';

const {documents, cards} = loadBatch();
assert.equal(new Set(cards.map(card => card.title.toLocaleLowerCase())).size, 18,
  'Each new Mini Talk needs a distinct title');
for (const document of documents) {
  assert.ok(document.reference?.file?.endsWith('.md'), 'Use a private Markdown reference, not a PDF');
  assert.ok(document.reference.sections?.trim() && document.reference.rights?.trim(),
    'Record exact source section and rights status');
  assert.equal(document.practice?.playthroughs, 1);
  assert.equal(document.practice?.forcedRepetitions, 0);
}
for (const card of cards) {
  assert.ok(card.speakers.every(speaker => /american/i.test(speaker.accent)),
    `${card.id}: A1/A2 English uses natural American voices`);
  assert.equal(new Set(card.lines.map(line => line.id)).size, card.lines.length);
  assert.ok(new Set(card.lines.map(line => line.speaker)).size >= 2,
    `${card.id}: both characters must participate`);
  assert.ok(card.artworkBrief?.trim() || card.visualBrief?.trim(),
    `${card.id}: a distinct scene illustration needs an artwork brief`);
  console.log(`${card.id}\t${card.lines.length} turns\t${card.speakers.length} voices\t${card.title}`);
}
console.log(`Mini Talks authoring: ${cards.length} A1/A2 002–010 cards, ${cards.reduce((n, card) => n + card.lines.length, 0)} aligned turns PASS`);
