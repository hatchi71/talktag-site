#!/usr/bin/env node
// Export only technically QC-passed Level 0 pilot cards to the local preview catalog.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=process.env.TALKTAG_LEVEL0_WORKDIR||'/private/tmp/talktag-level0-001';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'final/manifest.json'),'utf8'));
const qc=JSON.parse(fs.readFileSync(path.join(root,'final/qc-report.json'),'utf8'));
if(qc.status!=='technical-pass'||qc.cards.length!==2||manifest.cards.length!==2)throw Error('Level 0 technical QC incomplete');
const cards=manifest.cards.map(card=>{
  if(!qc.cards.some(x=>x.id===card.id&&x.sha256===card.sha256))throw Error('QC hash mismatch '+card.id);
  const dest=path.join(repo,'audio/guided/level0-001',card.filename);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(card.localFile,dest);
  const seconds=card.training.durationSeconds;
  const label=`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const mediaPath=process.env.TALKTAG_LEVEL0_PUBLISH==='1'
    ? `https://audio.talktag.co.kr/${card.language==='ko'?'Korean':'English'}/guided/a0-001-20261025/${card.filename}`
    : `/audio/guided/level0-001/${card.filename}`;
  return {id:card.id,language:card.language,type:'guided',format:'level0',level:'A0',part:1,chapter:1,unit:1,
    title:card.language==='ko'?card.title:card.title,titleKo:card.titleKo,
    description:card.language==='ko'?'Greet someone politely in a Korean café.':'카페에서 마주친 사람에게 영어로 인사해요.',
    summary:card.language==='ko'?'One useful greeting. Listen, say it, then answer the café worker.':'한 가지 인사를 듣고 말한 뒤 카페 직원에게 직접 답해 보세요.',
    artwork:'/'+card.picture,artworkAlt:card.pictureAlt,
    durationLabel:label,durationLong:label,audio:mediaPath+'?v='+card.sha256.slice(0,12),
    sourceFilename:card.filename,audioRevision:card.sha256.slice(0,16),voiceName:card.language==='ko'?'Leejin':'Lauren',accentTag:card.language==='ko'?'KR':'US',
    available:true,expressions:card.expressions,meanings:card.meanings,englishMeanings:card.language==='ko'?card.meanings:undefined,
    tinyPrompt:card.tinyPrompt,expectedResponse:card.expectedResponse,scene:card.language==='ko'?'At a neighborhood café in Korea.':'동네 카페에서 마주친 직원과 인사합니다.',
    protocolVersion:0,contentRevision:'level0-001-20261025',training:card.training};
});
const output=`/* Generated from content/guided/a0-001-scripts.json and QC-approved pilot audio. */\n(function () {\n  var cards = ${JSON.stringify(cards)};\n  var lang = window.TalkTagNative?.language || 'en';\n  window.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(cards.filter(function(card){ return card.language === lang; }));\n}());\n`;
fs.writeFileSync(path.join(repo,'level0-glr001.js'),output);
console.log('Exported 2 QC-passed local Level 0 cards');
