#!/usr/bin/env node
// Independently decode the Korean GLR 001/002 segmented release and measure
// voice-to-voice gaps, cue alignment, dings, duration caps and file hashes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/korean/guided/segments-001-002');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const errors=[];let checked=0,gaps=0,worst=0,totalBytes=0;
const fail=message=>errors.push(message);
const near=(a,b,tolerance)=>Math.abs(a-b)<=tolerance;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function local(url){
  if(!url.startsWith(manifest.releaseBase))throw Error(`Unexpected release URL ${url}`);
  return path.join(root,url.split('?')[0].slice(manifest.releaseBase.length));
}
function readRms(file){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-glr-validate-'));
  const raw=path.join(temp,'audio.pcm');
  try{
    const result=spawnSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ar','48000','-ac','1','-f','s16le',raw],{encoding:'utf8'});
    if(result.error||result.status!==0)throw Error(`Could not decode ${file}: ${result.error?.message||result.stderr}`);
    const fd=fs.openSync(raw,'r'),buffer=Buffer.alloc(960),rms=[];
    try{for(;;){const n=fs.readSync(fd,buffer,0,960,null);if(!n)break;let sum=0;
      for(let i=0;i<n;i+=2){const sample=buffer.readInt16LE(i);sum+=sample*sample;}
      rms.push(Math.sqrt(sum/(n/2))/32768);
    }}finally{fs.closeSync(fd);}
    return {rms,duration:fs.statSync(raw).size/96000};
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function energetic(rms,start,end){
  let first=-1,last=-1;
  for(let i=Math.max(0,Math.floor(start*100));i<Math.min(rms.length,Math.ceil(end*100));i++)
    if(rms[i]>=0.001){if(first<0)first=i;last=i;}
  return first<0?null:{first:first/100,end:(last+1)/100};
}
const context={window:{}};
for(const file of ['native-guided-data.js','native-guided-ko-002.js','native-guided-ko-splits.js'])
  vm.runInNewContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
const patch=context.window.TalkTagNativeCatalogs.ko;
const jsContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'manifest.js'),'utf8'),jsContext);
if(JSON.stringify(jsContext.window.TalkTagKoreanGuidedVariants)!==JSON.stringify(manifest))fail('JS/JSON manifests differ');
if(manifest.cards.length!==23||JSON.stringify(manifest.pauseRatios)!==JSON.stringify([2,2.5,3,3.5])||
    manifest.publicationReady!==true||manifest.oversize?.length)fail('Manifest card count, ratios or publication-ready status invalid');
const uniqueLines=new Set();
for(const card of manifest.cards){
  const lesson=patch.find(item=>item.id===card.id);
  const repetitions=card.level.startsWith('A')?10:card.level.startsWith('B')?15:21;
  if(!lesson||card.repetitions!==repetitions||card.variants.length!==4||
      JSON.stringify(card.lines.map(line=>line.text))!==JSON.stringify(lesson.expressions)||
      JSON.stringify(card.lines.map(line=>line.meaning))!==JSON.stringify(lesson.meanings))
    fail(`${card.id}: catalog bilingual text/repetitions mismatch`);
  for(const line of card.lines){
    const file=local(line.audio);uniqueLines.add(file);
    if(!fs.existsSync(file)||fs.statSync(file).size!==line.bytes||hash(file)!==line.sha256)
      fail(`${card.id}: isolated line missing or hash mismatch`);
  }
  for(const variant of card.variants){
    const label=`${card.id} ${variant.ratio}×`,file=local(variant.audio);
    if(!fs.existsSync(file)){fail(`${label}: MP3 missing`);continue;}
    totalBytes+=fs.statSync(file).size;
    if(fs.statSync(file).size!==variant.bytes||hash(file)!==variant.sha256)
      fail(`${label}: hash/size mismatch`);
    const {rms,duration}=readRms(file);checked++;
    if(!near(duration,variant.durationSeconds,0.001))fail(`${label}: decoded duration mismatch`);
    if(duration>(card.level.startsWith('C')?900:600))fail(`${label}: duration cap exceeded`);
    const events=card.lines.length*repetitions;
    if(variant.cues.length!==events||variant.measuredSpeech.length!==events){fail(`${label}: cue count mismatch`);continue;}
    if(!energetic(rms,0,Math.min(1,variant.cues[0].s)))fail(`${label}: missing start ding`);
    for(let n=0;n<events;n++){
      const cue=variant.cues[n],speech=variant.measuredSpeech[n],nextCue=variant.cues[n+1],nextSpeech=variant.measuredSpeech[n+1];
      if(cue.i!==Math.floor(n/repetitions)||cue.r!==n%repetitions+1||
          speech.i!==cue.i||speech.r!==cue.r||cue.s>speech.start||
          !near(speech.end,cue.voiceEnd,0.001)||speech.end>cue.e||cue.e>duration+0.001||
          nextCue&&!near(cue.e,nextCue.s,0.001))fail(`${label}: invalid cue ${n+1}`);
      const audible=energetic(rms,cue.s,Math.min(duration,speech.end+0.3));
      if(!audible||!near(audible.first,speech.start,0.25)||!near(audible.end,speech.end,0.25)){
        fail(`${label}: decoded voice misaligned at ${n+1}`);continue;
      }
      const target=Math.max(3,(speech.end-speech.start)*variant.ratio);
      const planned=nextSpeech?nextSpeech.start-speech.end:
        variant.endingCueStart+variant.endingToneLeadSeconds-speech.end;
      if(!near(planned,target,nextSpeech?0.003:0.025))fail(`${label}: planned speaking gap wrong at ${n+1}`);
      if(nextCue){
        const next=energetic(rms,nextCue.s,Math.min(duration,nextSpeech.end+0.3));
        if(!next){fail(`${label}: next voice missing at ${n+1}`);continue;}
        const error=next.first-audible.end-target;
        worst=Math.max(worst,Math.abs(error));gaps++;
        if(error<-.11||error>.31)fail(`${label}: decoded gap off by ${error.toFixed(3)}s at ${n+1}`);
      }
    }
    if(!near(variant.cues.at(-1).e,variant.endingCueStart,0.001)||
        !energetic(rms,variant.endingCueStart,Math.min(duration,variant.endingCueStart+0.6)))
      fail(`${label}: missing or misaligned ending ding`);
  }
}
if(uniqueLines.size!==54)fail(`Expected 54 unique isolated lines; got ${uniqueLines.size}`);
console.log(`Korean GLR decoded ${checked}/92 ratio variants, ${uniqueLines.size}/54 unique line MP3s, ${gaps} measured voice-to-voice gaps; worst gap error ${worst.toFixed(3)}s; ${(totalBytes/1048576).toFixed(1)} MiB variants.`);
if(errors.length){for(const error of errors.slice(0,40))console.error(`FAIL ${error}`);
  if(errors.length>40)console.error(`... ${errors.length-40} further failures`);process.exitCode=1;}
else console.log('Korean GLR audio/cue/duration checks passed; human pronunciation/listening review remains separate.');
