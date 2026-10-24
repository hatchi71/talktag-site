#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/bootcamp-002-source.json'),'utf8'));
const audio=JSON.parse(fs.readFileSync('/private/tmp/talktag-english-bootcamp-002-audio/rendered/manifest.json','utf8'));
const levels=['A1','A2','B1','B2','C1','C2'];
const write=(relative,value)=>fs.writeFileSync(path.join(root,relative),value);
const vocalLevels=Object.fromEntries(levels.map(level=>{
  const data=source.vocal[level],card=audio.cards.find(card=>card.level===level);
  if(!card||card.lines.length!==data.lines.length||card.lines.some((line,i)=>line.text!==data.lines[i]))throw Error(level+' audio/script mismatch');
  return [level,{status:'ready',lines:data.lines,translation:data.translation,audioSteps:card.steps.map(step=>{const variant=step.variants.find(v=>v.ratio===2.5);return {step:step.step,url:variant.audio,duration:variant.durationSeconds}})}];
}));
const vocal={version:'2026-10-25-short-002-v1',families:[{number:'002',title:source.title,slug:source.slug,theme:source.theme,audioStatus:'ready',status:'published',levels:vocalLevels}]};
const story={version:'2026-10-25-short-002-v1',families:[{number:'002',title:source.title,slug:source.slug,theme:source.theme,status:'published',levels:Object.fromEntries(levels.map(level=>[level,{lines:source.story[level].lines}]))}]};
write('content/vocalcamp/002.js','/* Generated from content/bootcamp-002-source.json. */\nwindow.TALKTAG_VOCALCAMP = '+JSON.stringify(vocal,null,2)+';\n');
write('content/storycamp/002.js','/* Generated from content/bootcamp-002-source.json. */\nwindow.TALKTAG_STORYCAMP = '+JSON.stringify(story,null,2)+';\n');
write('content/bootcamp-002-story-ko.js','window.TalkTagBootCampKorean = window.TalkTagBootCampKorean || {};\nwindow.TalkTagBootCampKorean.storycamp = window.TalkTagBootCampKorean.storycamp || {};\nwindow.TalkTagBootCampKorean.storycamp["002"] = '+JSON.stringify(Object.fromEntries(levels.map(level=>[level,source.story[level].translation])),null,2)+';\n');
console.log('Built English Boot Camp 002 web content.');
