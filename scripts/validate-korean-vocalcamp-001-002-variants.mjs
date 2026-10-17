#!/usr/bin/env node
// Independently decode Korean Vocal Camp 001/002 cumulative step variants.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/korean/vocalcamp/segments-001-002');
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
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-vc-validate-'));
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
for(const file of ['content/vocalcamp-korean-001.js','content/vocalcamp-korean-002.js'])
  vm.runInNewContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
const catalog=context.window.TALKTAG_VOCALCAMP_KOREAN;
const jsContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'manifest.js'),'utf8'),jsContext);
if(JSON.stringify(jsContext.window.TalkTagKoreanVocal001002Variants)!==JSON.stringify(manifest))
  fail('JS/JSON manifests differ');
if(manifest.cards.length!==12||JSON.stringify(manifest.ratios)!==JSON.stringify([2,2.5,3,3.5]))
  fail('Expected 12 cards and four pause ratios');
const uniqueLines=new Set();
for(const card of manifest.cards){
  const lesson=catalog.families.find(family=>family.number===card.episode)?.levelsData?.[card.level];
  if(!lesson||card.lines.length!==lesson.lines.length||card.steps.length!==lesson.lines.length||
      JSON.stringify(card.lines.map(line=>line.text))!==JSON.stringify(lesson.lines)||
      JSON.stringify(card.lines.map(line=>line.meaning))!==JSON.stringify(lesson.translation))
    fail(`${card.id}: bilingual catalog mismatch`);
  for(const line of card.lines){
    const file=local(line.audio);uniqueLines.add(file);
    if(!fs.existsSync(file)||fs.statSync(file).size!==line.bytes||hash(file)!==line.sha256)
      fail(`${card.id}: isolated line missing or hash mismatch`);
  }
  for(const step of card.steps){
    if(step.variants.length!==4)fail(`${card.id} step ${step.step}: ratio count mismatch`);
    for(const variant of step.variants){
      const label=`${card.id} step ${step.step} ${variant.ratio}×`,file=local(variant.audio);
      if(!fs.existsSync(file)){fail(`${label}: MP3 missing`);continue;}
      totalBytes+=fs.statSync(file).size;
      if(fs.statSync(file).size!==variant.bytes||hash(file)!==variant.sha256)
        fail(`${label}: hash/size mismatch`);
      const {rms,duration}=readRms(file);checked++;
      if(!near(duration,variant.durationSeconds,0.001)||variant.cues.length!==step.step)
        fail(`${label}: duration or cue count mismatch`);
      for(let n=0;n<variant.cues.length;n++){
        const cue=variant.cues[n],next=variant.cues[n+1];
        if(cue.i!==n||cue.s>=cue.voiceEnd||cue.voiceEnd>=cue.e||cue.e>duration+0.001)
          fail(`${label}: invalid cue ${n+1}`);
        const audible=energetic(rms,Math.max(0,cue.s-.12),Math.min(duration,cue.voiceEnd+.3));
        if(!audible||!near(audible.first,cue.s,.26)||!near(audible.end,cue.voiceEnd,.26)){
          fail(`${label}: decoded speech misaligned at ${n+1}`);continue;
        }
        const speech=card.lines[n].speechSeconds;
        const target=next?.35:Math.max(3,(cue.voiceEnd-variant.cues[0].s)*variant.ratio);
        if(next){
          const nextAudible=energetic(rms,Math.max(0,next.s-.12),Math.min(duration,next.voiceEnd+.3));
          if(!nextAudible){fail(`${label}: next voice missing at ${n+1}`);continue;}
          const error=nextAudible.first-audible.end-target;
          worst=Math.max(worst,Math.abs(error));gaps++;
          if(error<-.11||error>.31)fail(`${label}: decoded speaking gap off by ${error.toFixed(3)}s at ${n+1}`);
        }else{
          const tail=duration-audible.end,error=tail-target;
          worst=Math.max(worst,Math.abs(error));gaps++;
          if(error<-.11||error>.31)fail(`${label}: final speaking pause off by ${error.toFixed(3)}s`);
        }
      }
    }
  }
}
if(uniqueLines.size!==60)fail(`Expected 60 unique isolated lines; got ${uniqueLines.size}`);
console.log(`Korean Vocal Camp decoded ${checked}/240 variants, ${uniqueLines.size}/60 line MP3s, ${gaps} measured pauses; worst pause error ${worst.toFixed(3)}s; ${(totalBytes/1048576).toFixed(1)} MiB variants.`);
if(errors.length){for(const error of errors.slice(0,40))console.error(`FAIL ${error}`);
  if(errors.length>40)console.error(`... ${errors.length-40} further failures`);process.exitCode=1;}
else console.log('Korean Vocal Camp audio/cue/pause checks passed; human pronunciation/listening review remains separate.');
