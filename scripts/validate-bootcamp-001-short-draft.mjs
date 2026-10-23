#!/usr/bin/env node
// Draft-only guardrail: the 2026-10-23 Boot Camp reset must use genuinely new,
// brief beats, not redistribute an old long episode into three/five bins.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../content/bootcamp-001-short-stories.draft.md', import.meta.url), 'utf8');
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sections = source.split(/^## /m).slice(1);
const expected = new Map([
  ['English Vocal Camp 001', { units: 3, max: 12, count: text => text.split(/\s+/u).length }],
  ['English Story Camp 001', { units: 5, max: 24, count: text => text.split(/\s+/u).length }],
  ['Korean Vocal Camp 001', { units: 3, max: 40, count: text => [...text].length }],
  ['Korean Story Camp 001', { units: 5, max: 60, count: text => [...text].length }],
  ['Japanese Vocal Camp 001', { units: 3, max: 40, count: text => [...text].length }],
  ['Japanese Story Camp 001', { units: 5, max: 45, count: text => [...text].length }]
]);

for (const [name, rule] of expected) {
  const section = sections.find(part => part.startsWith(name));
  assert.ok(section, `Missing ${name}`);
  const rows = section.split('\n').filter(line => /^\| (A1|A2|B1|B2|C1|C2) \|/u.test(line));
  assert.equal(rows.length, levels.length, `${name}: exactly six level drafts required`);
  for (const [index, row] of rows.entries()) {
    const cells = row.split('|').slice(1, -1).map(text => text.trim());
    assert.equal(cells[0], levels[index], `${name}: levels must stay in CEFR order`);
    assert.equal(cells.length - 1, rule.units, `${name}/${cells[0]}: wrong number of beats`);
    cells.slice(1).forEach((unit, position) => {
      assert.ok(unit, `${name}/${cells[0]}/${position + 1}: empty beat`);
      assert.ok(rule.count(unit) <= rule.max,
        `${name}/${cells[0]}/${position + 1}: ${rule.count(unit)} exceeds brief-beat ceiling ${rule.max}`);
    });
  }
  console.log(`${name}: six levels × ${rule.units} brief beats`);
}
console.log('Source structure only; separate audio QC, translation, artwork and release checks are required.');
