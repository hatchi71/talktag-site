#!/usr/bin/env node
/* Release guardrail for the newly authored short 001 Boot Camp stories. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const levels = ['A1','A2','B1','B2','C1','C2'];
const c = {window:{}};
vm.createContext(c);
const load = file => vm.runInContext(fs.readFileSync(new URL(file,root),'utf8'),c,{timeout:1000});
for (const file of [
  'bootcamp-stage-rules.js','vocalcamp-manifest.js','storycamp-manifest.js',
  'content/vocalcamp/001.js','content/storycamp/001.js',
  'content/vocalcamp-korean-001.js','content/storycamp-korean/001.js',
  'content/vocalcamp-japanese-001.js','content/bootcamp-001-v3-meanings.js',
  'content/bootcamp-001-v3-story-ko.js','bootcamp-artwork.js',
  'audio/vocalcamp/short-001-v3/manifest.js',
  'audio/korean/vocalcamp/short-001-v3/manifest.js',
  'audio/japanese/vocalcamp/short-001-v3/manifest.js'
]) load(file);

const rule = c.window.TalkTagBootCampStages;
const meanings = c.window.TalkTagBootCamp001Meanings;
const manifests = {en:c.window.TalkTagVocal001ShortVariants,ko:c.window.TalkTagKoreanVocal001ShortVariants,ja:c.window.TalkTagJapaneseVocal001ShortVariants};
for (const [track,manifest] of [['vocal',c.window.TALKTAG_VOCALCAMP_MANIFEST],['story',c.window.TALKTAG_STORYCAMP_MANIFEST]]) {
  assert.deepEqual(Array.from(manifest.families.map(f=>f.number)),['001'],`${track}: only new 001 may be published`);
}
let checked=0;
for (const level of levels) {
  for (const language of ['en','ko','ja']) {
    const card=manifests[language].cards.find(item=>item.level===level);
    assert.ok(card,`${language}/${level}: missing audio card`);
    const lines=language==='en'?c.window.TALKTAG_VOCALCAMP.families[0].levels[level].lines:
      language==='ko'?c.window.TALKTAG_VOCALCAMP_KOREAN.families[0].levelsData[level].lines:
      card.lines.map(item=>item.text);
    assert.equal(lines.length,3);
    assert.deepEqual(Array.from(card.lines.map(item=>item.text)),Array.from(lines));
    assert.equal(card.steps.length,3);
    assert.equal(meanings[`${language}Vocal`][level].length,3);
    if(language==='ja')assert.equal(meanings.jaReadings[level].length,3);
    for (const [index,step] of card.steps.entries()) {
      assert.equal(step.step,index+1);
      assert.deepEqual(Array.from(step.variants.map(v=>v.ratio)),[2,2.5,3,3.5]);
      assert.ok(step.variants.every(v=>v.cues.length===index+1 && v.audio.startsWith(manifests[language].releaseBase)));
    }
    const art=c.window.TalkTagBootCampArtwork.get('vocal','001',level,language);
    assert.ok(art && fs.existsSync(new URL('.'+art.src,root)),`${language}/${level}: missing vocal illustration`);
    checked++;
  }
  for (const language of ['en','ko']) {
    const family=language==='en'?c.window.TALKTAG_STORYCAMP.families[0]:c.window.TALKTAG_STORYCAMP_KOREAN.families[0];
    const lines=family.levels[level].lines;
    assert.equal(lines.length,5,`${language}/${level}: Story needs five authored beats`);
    assert.deepEqual(Array.from(rule.units(lines,5)),Array.from(lines));
    assert.equal(meanings[`${language}Story`][level].length,5);
    const art=c.window.TalkTagBootCampArtwork.get('story','001',level,language);
    assert.ok(art && fs.existsSync(new URL('.'+art.src,root)),`${language}/${level}: missing story illustration`);
    checked++;
  }
}
const storyHtml=fs.readFileSync(new URL('storycamp-reader.html',root),'utf8');
assert.match(storyHtml,/story-\$\{familyNumber\}-v3-\$\{L\}/,'New Korean 001 must not offer retired-story translations');
assert.doesNotMatch(storyHtml,/korean-support-manual-story-\$\{familyNumber\}/);
console.log(`Boot Camp 001 release structure: ${checked} level-language cards, five new scenes, aligned meanings, 3/5 authored beats and v3 audio manifests.`);
