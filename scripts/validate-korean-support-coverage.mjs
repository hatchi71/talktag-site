import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const window = {};
function load(path) {
  runInNewContext(readFileSync(resolve(root, path), 'utf8'), {window, console}, {filename:path});
}
const cards=[];
const nativeScript={vi:/[À-ỹ]/u,ne:/[\u0900-\u097F]/u,km:/[\u1780-\u17FF]/u,my:/[\u1000-\u109F]/u,th:/[\u0E00-\u0E7F]/u};
function add(track, id, source, english, translations={}) {
  if (!Array.isArray(source) || !Array.isArray(english) || source.length !== english.length ||
      !source.length || source.some(line=>!String(line).trim()) || english.some(line=>!String(line).trim())) {
    throw Error(`${track} ${id}: source/English line alignment failed`);
  }
  const record=window.TalkTagKoreanTranslations?.[id];
  if (record && (!Array.isArray(record.source) || record.source.length!==source.length ||
      record.source.some((line,index)=>line!==source[index]))) {
    throw Error(`${track} ${id}: published Korean source changed; translation invalid`);
  }
  if (record && createHash('sha256').update(source.map(line=>line.trim()).join('\n')).digest('hex')!==record.sourceHash) {
    throw Error(`${track} ${id}: Korean source hash invalid`);
  }
  const ready=[];
  for (const code of ['vi','ne','km','my','th']) {
    const list=record?.translations?.[code] || translations[code];
    if (!list) continue;
    if (!Array.isArray(list) || list.length !== source.length || list.some(line=>!String(line).trim())) {
      throw Error(`${track} ${id}: ${code} line alignment failed`);
    }
    for(const [index,line] of list.entries()) {
      if(!nativeScript[code].test(line)) throw Error(`${track} ${id}: ${code} line ${index+1} has no target-language script`);
      if(source[index].includes('___') && !line.includes('___')) throw Error(`${track} ${id}: ${code} line ${index+1} lost practice placeholder`);
    }
    if (record && !['reviewed','ai-reviewed'].includes(record.review?.[code]?.status)) {
      throw Error(`${track} ${id}: ${code} has no valid review status`);
    }
    ready.push(code);
  }
  cards.push({track,id,lines:source.length,ready});
}

load('native-guided-data.js');
load('native-guided-ko-002.js');
load('native-guided-ko-003.js');
load('native-guided-ko-splits.js');
load('native-audio-korean-aea-001.js');
load('native-glr-001-translations.js');
load('korean-support-essays-001.js');
load('korean-support-manual-starter-001.js');
load('korean-support-manual-starter-002.js');
load('korean-support-manual-starter-003-004.js');
load('korean-support-manual-starter-005-006.js');
load('korean-support-manual-glr-002-a1-a2.js');
load('korean-support-manual-glr-002-b1-b2.js');
load('korean-support-manual-glr-002-c1-c2.js');
load('korean-support-manual-glr-003-ab.js');
load('korean-support-manual-glr-003-c.js');
load('korean-support-manual-vocal-001-ab.js');
load('korean-support-manual-vocal-001-c.js');
load('korean-support-manual-vocal-002-ab.js');
load('korean-support-manual-vocal-002-c.js');
load('korean-support-manual-vocal-003-ab.js');
load('korean-support-manual-vocal-003-c.js');
for (const lesson of window.TalkTagNativeCatalogs.ko.filter(item=>item.available!==false)) {
  add(lesson.type==='guided'?'GLR':'Essays',lesson.id,lesson.expressions,lesson.meanings,window.TalkTagKoreanGlr001Translations?.[lesson.id]);
}
for (const file of ['001','002','003']) load(`content/vocalcamp-korean-${file}.js`);
for (const family of window.TALKTAG_VOCALCAMP_KOREAN.families.filter(item=>item.status==='published')) {
  for (const [level,data] of Object.entries(family.levelsData)) add('Vocal',`family-${family.number}-${level}`,data.lines,data.translation);
}
for (const file of ['001','002','003']) load(`content/storycamp-korean/${file}.js`);
for (const file of ['001','002','003']) load(`korean-support-manual-story-${file}.js`);
for (const family of window.TALKTAG_STORYCAMP_KOREAN.families.filter(item=>item.status==='published')) {
  for (const [level,data] of Object.entries(family.levels)) add('Story',`story-${family.number}-${level}`,data.lines,data.meanings);
}
load('korean-starter-data.js');
for (const lesson of window.TalkTagKoreanStarters.filter(item=>item.published)) {
  add('Starter',`${lesson.id}:step-0`,lesson.lines.map(line=>line[0]),lesson.lines.map(line=>line[1]));
  for (const [index,source,meaning] of [[1,lesson.pattern[0],lesson.pattern[1]],[2,lesson.story,lesson.meaning],[3,lesson.partner,lesson.partnerEn]]) {
    add('Starter',`${lesson.id}:step-${index}`,[source],[meaning]);
  }
}
const tracks=[...new Set(cards.map(card=>card.track))];
for (const track of tracks) {
  const subset=cards.filter(card=>card.track===track);
  console.log(`${track}: ${subset.length} cards, ${subset.reduce((sum,card)=>sum+card.lines,0)} source lines, ${subset.filter(card=>card.ready.length===5).length} with all five added languages`);
}
console.log(`Total: ${cards.length} card units; ${cards.filter(card=>card.ready.length<5).length} still need complete non-English translation.`);
