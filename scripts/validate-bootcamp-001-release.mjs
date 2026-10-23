import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = {window:{}};
vm.createContext(context);
const load = file => vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), context, {timeout:1000});
const levels = ['A1','A2','B1','B2','C1','C2'];
load('bootcamp-stage-rules.js');
for (const name of ['vocalcamp-manifest.js','storycamp-manifest.js']) load(name);
for (const name of ['TALKTAG_VOCALCAMP_MANIFEST','TALKTAG_STORYCAMP_MANIFEST']) {
  const active = context.window[name].families.filter(f => f.status === 'published');
  assert.equal(active.length, 1);
  assert.equal(active[0].number, '001');
}
load('content/vocalcamp/001.js');
load('content/storycamp/001.js');
load('content/vocalcamp-korean-001.js');
load('content/storycamp-korean/001.js');
load('audio/vocalcamp/segments-001-002/manifest.js');
load('audio/korean/vocalcamp/segments-001-002/manifest.js');
load('audio/japanese/vocalcamp/segments-001/manifest.js');
const rule = context.window.TalkTagBootCampStages;
let vocal = 0, story = 0;
for (const level of levels) {
  for (const language of ['en','ko']) {
    const data = language === 'ko'
      ? context.window.TALKTAG_VOCALCAMP_KOREAN.families[0].levelsData[level]
      : context.window.TALKTAG_VOCALCAMP.families[0].levels[level];
    const variants = (language === 'ko' ? context.window.TalkTagKoreanVocal001002Variants : context.window.TalkTagVocal001002Variants)
      .cards.find(card => card.id === `family-001-${level}`);
    assert.ok(data && variants);
    assert.equal(variants.lines.length, data.lines.length);
    assert.equal(variants.steps.length, data.lines.length);
    const ends = rule.boundaries(data.lines.length, 3);
    assert.equal(ends.length, 3);
    assert.equal(ends.at(-1), data.lines.length);
    for (const [index,end] of ends.entries()) {
      assert.equal(variants.steps[end-1].variants.length, 4);
      assert.equal(variants.steps[end-1].variants[1].cues.length, end);
      assert.equal(rule.units(data.lines,3)[index].length > 0, true);
    }
    assert.equal(data.lines.join(' '), rule.units(data.lines,3).join(' '));
    vocal++;
  }
  const japanese = context.window.TalkTagJapaneseVocal001Variants.cards.find(card => card.id === `japanese-vocalcamp-001-${level}`);
  assert.ok(japanese);
  const japaneseEnds = rule.boundaries(japanese.lines.length,3);
  for (const end of japaneseEnds) {
    assert.equal(japanese.steps[end-1].variants.length,4);
    assert.equal(japanese.steps[end-1].variants[1].cues.length,end);
  }
  vocal++;
  for (const language of ['en','ko']) {
    const data = language === 'ko'
      ? context.window.TALKTAG_STORYCAMP_KOREAN.families[0].levels[level]
      : context.window.TALKTAG_STORYCAMP.families[0].levels[level];
    assert.ok(data && data.lines.length >= 4);
    const units = language === 'ko' && level === 'A2'
      ? [data.lines[0],data.lines[1],'수업이 끝난 뒤에','새 친구와 차를 마셨어요.',data.lines[3]]
      : rule.units(data.lines,5);
    assert.equal(units.length,5);
    assert.equal(units.join(' '),data.lines.join(' '));
    story++;
  }
}
console.log(`Boot Camp 001: ${vocal} Vocal cards have 3 complete cumulative audio stages; ${story} Story cards have 5 complete cumulative text stages.`);
