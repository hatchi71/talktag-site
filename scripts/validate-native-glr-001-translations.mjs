import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
for (const file of ['native-guided-data.js', 'native-guided-ko-splits.js', 'native-glr-001-translations.js']) {
  vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}

const cards = context.window.TalkTagNativeCatalogs.ko.filter(card =>
  card.type === 'guided' && Number(card.unit) === 1 && card.available !== false);
const translations = context.window.TalkTagKoreanGlr001Translations;
assert.deepEqual(Object.keys(translations).sort(), Array.from(cards, card => card.id).sort());

for (const card of cards) {
  assert.equal(card.expressions.length, card.meanings.length, `${card.id}: English meanings`);
  for (const code of ['vi', 'ne', 'km', 'my', 'th']) {
    const lines = translations[card.id][code];
    assert.equal(lines?.length, card.expressions.length, `${card.id}: ${code} line count`);
    assert.ok(lines.every(line => typeof line === 'string' && line.trim()), `${card.id}: ${code} empty line`);
  }
}

console.log(`Korean GLR 001 translations: ${cards.length} cards, ${cards.reduce((sum, card) => sum + card.expressions.length, 0)} sentences, six support languages passed.`);
