#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-a1-005-010');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/native-glr-ko-a1-005-010.source.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(work,'manifest.json'),'utf8'));
const inventory=JSON.parse(fs.readFileSync(path.join(work,'upload-inventory.json'),'utf8'));
const qc=JSON.parse(fs.readFileSync(path.join(work,'source-qc.json'),'utf8'));
const context={window:{TalkTagNativeCatalogs:{ko:[]},TalkTagKoreanGuidedVariants:{cards:[]}}};
for(const name of ['native-guided-ko-005-010.js','native-guided-ko-005-010-variants.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
const catalog=context.window.TalkTagNativeCatalogs.ko,variants=context.window.TalkTagKoreanGuidedVariants.cards;
if(source.lessons.length!==6||catalog.length!==6||variants.length!==6||manifest.cards.length!==6||inventory.length!==48||qc.length!==24)throw Error('Inventory/card count mismatch');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const duration=file=>{const r=spawnSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'});if(r.status!==0)throw Error('Cannot decode '+file);return Number(r.stdout.trim());};
for(const item of inventory){if(!fs.existsSync(item.file)||hash(item.file)!==item.sha256||fs.statSync(item.file).size!==item.bytes)throw Error('Media hash/size mismatch '+item.key);if(!(duration(item.file)>0))throw Error('Empty media '+item.key);}
for(const [n,lesson] of source.lessons.entries()){
 const card=catalog[n],vcard=variants[n];if(card.id!==lesson.id||vcard.id!==lesson.id||vcard.lines.length!==4||card.expressions.length!==4||card.meanings.length!==4||vcard.variants.length!==4)throw Error('Card schema mismatch '+lesson.id);
 for(let i=0;i<4;i++)if(card.expressions[i]!==lesson.lines[i].ko||card.meanings[i]!==lesson.lines[i].en||vcard.lines[i].text!==lesson.lines[i].ko)throw Error('Bilingual mismatch '+lesson.id+'/'+i);
 for(const variant of vcard.variants){
  if(variant.cues.length!==40||variant.measuredSpeech.length!==40||variant.durationSeconds>600||variant.endingCueStart>=variant.durationSeconds)throw Error('Duration/cue mismatch '+lesson.id);
  const file=inventory.find(x=>x.audio===variant.audio)?.file;if(!file||Math.abs(duration(file)-variant.durationSeconds)>.06)throw Error('Measured duration mismatch '+lesson.id);
  for(const [j,cue] of variant.cues.entries()){
   const spoken=variant.measuredSpeech[j],voice=spoken.end-spoken.start,following=variant.measuredSpeech[j+1];
   if(cue.i!==Math.floor(j/10)||cue.r!==j%10+1||cue.s>=spoken.start||spoken.end!==cue.voiceEnd||cue.e<cue.voiceEnd||voice<=0)throw Error('Timing mismatch '+lesson.id+'/'+j);
   const actualGap=(following?following.start:variant.endingCueStart)-spoken.end;
   if(actualGap+0.02<Math.max(3,variant.ratio*voice))throw Error('Response gap too short '+lesson.id+'/'+variant.ratio+'/'+j+' '+actualGap);
  }
 }
 if(card.audio!==vcard.variants[1].audio||card.training.cues.length!==40||card.training.defaultReps!==10||!card.training.cardDings)throw Error('Default variant mismatch '+lesson.id);
}
console.log('PASS: 24 voiced lines, 6 bilingual cards, 24 rendered variants, 40 repetitions/card, measured 2–3.5× gaps, dings and hashes.');
