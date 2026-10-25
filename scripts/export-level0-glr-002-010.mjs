#!/usr/bin/env node
// Export only the 18 technically QC-passed A0 002–010 cards to a local catalog.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=process.env.TALKTAG_LEVEL0_WORKDIR||'/private/tmp/talktag-level0-002-010';
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/a0-002-010-scripts.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'final/manifest.json'),'utf8'));
const qc=JSON.parse(fs.readFileSync(path.join(root,'final/qc-report.json'),'utf8'));
if(qc.status!=='technical-pass'||qc.cards.length!==18||manifest.cards.length!==18)throw Error('Level 0 technical QC incomplete');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cards=manifest.cards.map(card=>{
  if(!qc.cards.some(x=>x.id===card.id&&x.sha256===card.sha256))throw Error('QC hash mismatch '+card.id);
  if(hash(card.localFile)!==card.sha256)throw Error('Audio file changed after QC '+card.id);
  const pair=source.episodePairs.find(x=>Number(x.unit)===card.unit);
  if(!pair||pair[card.language].id!==card.id)throw Error('Script mismatch '+card.id);
  const dest=path.join(repo,'audio/guided/level0-002-010',card.filename);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(card.localFile,dest);
  const seconds=card.training.durationSeconds;
  const label=`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const englishPrefix=card.voiceLevel?'English/guided/a0-002-010-qc2-20261025/':'English/guided/a0-002-010-20261025/';
  const mediaPath=process.env.TALKTAG_LEVEL0_PUBLISH==='1'
    ? `https://audio.talktag.co.kr/${card.language==='ko'?'Korean/guided/a0-002-010-20261025/':englishPrefix}${card.filename}`
    : `/audio/guided/level0-002-010/${card.filename}`;
  return {id:card.id,language:card.language,type:'guided',format:'level0',level:'A0',part:card.unit,chapter:1,unit:card.unit,
    title:card.title,titleKo:card.titleKo,
    description:card.language==='ko'?pair.ko.prompt:pair.en.prompt,
    summary:card.language==='ko'?'One useful Korean expression. Listen five times, then say it in the pictured situation.':'한 가지 영어 표현을 다섯 번 듣고 따라한 뒤, 그림 속 상황에서 직접 말해 보세요.',
    artwork:'/'+card.picture,artworkAlt:card.pictureAlt,
    durationLabel:label,durationLong:label,audio:mediaPath+'?v='+card.sha256.slice(0,12),
    sourceFilename:card.filename,audioRevision:card.sha256.slice(0,16),
    voiceName:card.language==='ko'?'Leejin':'Lauren',accentTag:card.language==='ko'?'KR':'US',
    available:true,expressions:card.expressions,meanings:card.meanings,
    englishMeanings:card.language==='ko'?card.meanings:undefined,
    tinyPrompt:card.tinyPrompt,expectedResponse:card.expectedResponse,pronunciation:card.pronunciation,
    scene:card.scene,protocolVersion:0,contentRevision:'level0-002-010-20261025',training:card.training};
});
const output=`/* Generated from content/guided/a0-002-010-scripts.json and QC-passed local audio. */\n(function () {\n  var cards = ${JSON.stringify(cards)};\n  var lang = window.TalkTagNative?.language || 'en';\n  window.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(cards.filter(function(card){ return card.language === lang; }));\n}());\n`;
fs.writeFileSync(path.join(repo,'level0-glr002-010.js'),output);
console.log('Exported 18 QC-passed local Level 0 cards');
