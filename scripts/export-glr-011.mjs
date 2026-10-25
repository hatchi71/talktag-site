#!/usr/bin/env node
// Export QC-assembled GLR 011 cards into the published learner catalog module.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=process.env.TALKTAG_GLR011_WORKDIR||'/private/tmp/talktag-glr011';
const manifest=JSON.parse(fs.readFileSync(`${root}/final/manifest.json`,'utf8'));
const scripts=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/glr-011-scripts.json'),'utf8'));
const qc=JSON.parse(fs.readFileSync(`${root}/final/qc-report.json`,'utf8'));
if(qc.status!=='technical-pass'||qc.cards.length!==manifest.cards.length)throw Error('GLR 011 QC incomplete');
const all=manifest.cards.map(card=>{
  if(!qc.cards.some(x=>x.id===card.id&&x.sha256===card.sha256))throw Error('QC mismatch '+card.id);
  const {localFile,bytes,sha256,sourceFiles,situation,filename,...rest}=card;
  const seconds=card.training.durationSeconds;
  const label=`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  return {...rest,
    type:'guided',part:11,chapter:card.partIndex||1,
    art:'011-station',artwork:'/assets/glr-scenes/en/011-station-v1.jpg',
    description:scripts.levels[card.level].descriptionKo,summary:'Listen to each line, then say it in the response gap.',
    durationLabel:label,durationLong:label,
    audio:`https://audio.talktag.co.kr/English/guided/glr-011-20261025/${filename}?v=${sha256.slice(0,12)}`,
    accentTag:'US',accentTags:['US'],voiceName:'Roger / Lauren',sourceFilename:filename,
    protocolVersion:/^C/.test(card.level)?3:2,contentRevision:'glr-011-20261025',format:'miniskit',
    scene:situation,briefing:scripts.levels[card.level].descriptionKo,releaseDurationSeconds:seconds
  };
});
const js=`/* Generated from content/guided/glr-011-scripts.json and QC-approved audio. Do not hand-edit. */\n(function () {\n  const cards = ${JSON.stringify(all)};\n  window.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(cards);\n}());\n`;
fs.writeFileSync(path.join(repo,'guided-glr011.js'),js);
console.log('Exported '+all.length+' GLR 011 cards');
