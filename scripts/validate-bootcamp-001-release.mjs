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
  'content/vocalcamp-japanese-001.js','content/storycamp-japanese-001.js','content/bootcamp-001-v3-meanings.js',
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
  for (const language of ['en','ko','ja']) {
    const family=language==='en'?c.window.TALKTAG_STORYCAMP.families[0]:
      language==='ko'?c.window.TALKTAG_STORYCAMP_KOREAN.families[0]:c.window.TALKTAG_STORYCAMP_JAPANESE.families[0];
    const lines=family.levels[level].lines;
    assert.equal(lines.length,5,`${language}/${level}: Story needs five authored beats`);
    assert.deepEqual(Array.from(rule.units(lines,5)),Array.from(lines));
    assert.equal(meanings[`${language}Story`][level].length,5);
    if(language==='ja') {
      assert.equal(family.levels[level].readings.length,5);
      assert.equal(family.levels[level].meanings.length,5);
    }
    const art=c.window.TalkTagBootCampArtwork.get('story','001',level,language);
    assert.ok(art && fs.existsSync(new URL('.'+art.src,root)),`${language}/${level}: missing story illustration`);
    checked++;
  }
}
const storyHtml=fs.readFileSync(new URL('storycamp-reader.html',root),'utf8');
assert.match(storyHtml,/story-\$\{familyNumber\}-v3-\$\{L\}/,'New Korean 001 must not offer retired-story translations');
assert.doesNotMatch(storyHtml,/korean-support-manual-story-\$\{familyNumber\}/);
const vocalPlayer=fs.readFileSync(new URL('vocalcamp-player.js',root),'utf8');
const japaneseVocalPlayer=fs.readFileSync(new URL('japanese/J-vocalcamp-player.js',root),'utf8');
const japaneseStoryPlayer=fs.readFileSync(new URL('japanese/J-storycamp-reader.js',root),'utf8');
assert.doesNotMatch(vocalPlayer,/cards\.length\s*=\s*1/,'Vocal follow-up cards must remain available');
assert.match(vocalPlayer,/shareLabel:'4 · SHARE'/,'English and Korean Vocal Camp must retain the Share card');
assert.match(japaneseVocalPlayer,/\['SOUND','SAY & WRITE','MY STORY','SHARE'\]/,'Japanese Vocal Camp must retain four cards');
assert.match(storyHtml,/9 · SHARE/,'English and Korean Story Camp must retain nine stages');
assert.match(japaneseStoryPlayer,/index < 9/,'Japanese Story Camp must retain nine stages');
assert.match(vocalPlayer,/const cuePlayer = audioPlayer/,'Vocal dings and speech must share the same media element');
assert.match(japaneseVocalPlayer,/const cuePlayer = player/,'Japanese Vocal dings and speech must share the same media element');
assert.doesNotMatch(japaneseVocalPlayer,/if \(nextPhase === phase\) return/,'Japanese speaking-pause countdown must update within a phase');
assert.match(japaneseVocalPlayer,/player\.ontimeupdate = \(\) => \{\s*if \(token !== runToken\) return;\s*recoverStall\(\)/,'Japanese playback must detect a stalled clock without relying on waiting events');
assert.match(fs.readFileSync(new URL('vocalcamp-player.html',root),'utf8'),/vocalcamp-player-loader\.js\?v=20261024-playback-resume-v1/,'Published Vocal page must request the repaired player loader');
const japaneseVocalCss=fs.readFileSync(new URL('japanese/J-vocalcamp-player.css',root),'utf8');
assert.match(japaneseVocalCss,/\.j-vocal-script-list li\{display:block/,'Japanese reference lines must use the full card width');
assert.match(fs.readFileSync(new URL('japanese/J-vocalcamp-player.html',root),'utf8'),/J-vocalcamp-player\.css\?v=20261024-reference-wrap-v1/,'Japanese Vocal page must refresh its reference CSS');
assert.match(fs.readFileSync(new URL('japanese/J-vocalcamp-player.html',root),'utf8'),/J-vocalcamp-player\.js\?v=20261024-(?:countdown-watchdog|ja-korean-titles)-v1/,'Japanese Vocal page must load the countdown repair or a later revision');
console.log(`Boot Camp 001 release structure: ${checked} level-language cards, five new scenes, aligned meanings, 3/5 authored beats and v3 audio manifests.`);
