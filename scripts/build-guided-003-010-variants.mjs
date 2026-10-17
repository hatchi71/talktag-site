#!/usr/bin/env node
// Rebuild English GLR 003–010 from published speech, preserving each card identity.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/guided/segments-003-010');
const releaseBase='https://audio.talktag.co.kr/English/guided/segments-003-010/v1-20261017/';
const sources=path.join(root,'sources');
const rate=48000, ratios=[2,2.5,3,3.5];
const files=['guided-lauren003.js','guided-lauren004.js','guided-jarnathan005.js','guided-max006.js','guided-roger007.js','guided-miniskit-pilots.js','guided-miniskit-a2-c2.js'];
const context={window:{}};
for(const file of files)vm.runInNewContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
const cards=(context.window.TalkTagAudioLessons||[]).filter(card=>card.type==='guided'&&card.part>=3&&card.part<=10);
if(cards.length!==61||new Set(cards.map(card=>card.id)).size!==61)throw Error('Unexpected source card inventory');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sec=n=>Number((n/rate).toFixed(6));
function run(args){const r=spawnSync('ffmpeg',args,{encoding:null,maxBuffer:1024*1024*1024});if(r.error||r.status!==0)throw Error('ffmpeg: '+(r.error?.message||String(r.stderr).slice(-600)));return r.stdout;}
function decode(file){return run(['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);}
function sourcePath(card){const u=new URL(card.audio,'https://talktag.co.kr');const local=path.join(repo,'audio/guided',u.pathname.split('/').at(-2),path.basename(u.pathname));return fs.existsSync(local)?local:path.join(sources,card.id+'.mp3');}
const sourceByCard=new Map();
for(const card of cards){
  const local=sourcePath(card);
  if(fs.existsSync(local)){sourceByCard.set(card.id,local);continue;}
  fs.mkdirSync(sources,{recursive:true});
  const response=await fetch(new URL(card.audio,'https://talktag.co.kr'),{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error(`Source unavailable: ${card.id} ${response.status}`);
  fs.writeFileSync(local,Buffer.from(await response.arrayBuffer()));
  sourceByCard.set(card.id,local);
  console.log('Source cached:',card.id);
}
const records=[];
for(const card of cards){
  const source=sourceByCard.get(card.id), pcm=decode(source), sampleCount=pcm.length/2, t=card.training;
  if(!Array.isArray(t?.cues)||t.cues.length!==card.expressions.length*t.defaultReps||
    card.expressions.length!==card.meanings.length||!Number.isFinite(t.startCueEnd)||!Number.isFinite(t.endingCueStart))throw Error('Invalid published source '+card.id);
  const cut=(a,b)=>pcm.subarray(Math.max(0,Math.round(a*rate))*2,Math.min(sampleCount,Math.round(b*rate))*2);
  const start=cut(0,t.startCueEnd), end=cut(t.endingCueStart,sampleCount/rate);
  if(start.length<1000||end.length<1000)throw Error('Missing boundary cue '+card.id);
  const lines=card.expressions.map((text,i)=>{
    const cue=t.cues.find(c=>c.i===i&&c.r===1);
    if(!cue||cue.voiceEnd<=cue.s)throw Error('Missing first repetition '+card.id+' line '+i);
    return {pcm:cut(cue.s,cue.voiceEnd),text,meaning:card.meanings[i],sourceStart:cue.s,sourceEnd:cue.voiceEnd};
  });
  const variants=[];
  for(const ratio of ratios){
    const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-glr3-10-'));
    const raw=path.join(scratch,'audio.pcm');
    const rel=`${card.id}/pause-${ratio.toFixed(1).replace('.','_')}.mp3`;
    const dest=path.join(root,'variants',rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    const fd=fs.openSync(raw,'w');let cursor=0;const cues=[];
    try{
      fs.writeSync(fd,start);cursor+=start.length/2;
      for(let i=0;i<lines.length;i++)for(let rep=1;rep<=t.defaultReps;rep++){
        const line=lines[i],s=cursor;
        fs.writeSync(fd,line.pcm);cursor+=line.pcm.length/2;
        const voiceEnd=cursor;
        const gap=Math.max(3*rate,Math.round(line.pcm.length/2*ratio));
        const silence=Buffer.alloc(96000);
        let remaining=gap;
        while(remaining){const take=Math.min(remaining,rate);fs.writeSync(fd,silence,0,take*2);remaining-=take;}
        cursor+=gap;
        cues.push({s:sec(s),voiceEnd:sec(voiceEnd),e:sec(cursor),i,r:rep});
      }
      const endingCueStart=sec(cursor);fs.writeSync(fd,end);cursor+=end.length/2;
      fs.closeSync(fd);
      run(['-y','-v','error','-nostdin','-f','s16le','-ar',String(rate),'-ac','1','-i',raw,'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',dest]);
      const digest=sha(dest),bytes=fs.statSync(dest).size;
      variants.push({ratio,audio:releaseBase+'variants/'+rel+'?v='+digest.slice(0,12),durationSeconds:sec(cursor),bytes,sha256:digest,endingCueStart,cues});
    }finally{try{fs.closeSync(fd);}catch{}fs.rmSync(scratch,{recursive:true,force:true});}
  }
  records.push({id:card.id,level:card.level,episode:card.part,repetitions:t.defaultReps,sourceSha256:sha(source),lines:lines.map(({text,meaning})=>({text,meaning})),variants});
  console.log(`${records.length}/${cards.length} rebuilt ${card.id}`);
}
const manifest={version:1,releaseBase,pauseRatios:ratios,minimumPauseSeconds:3,cards:records};
fs.mkdirSync(path.join(root,'variants'),{recursive:true});
fs.writeFileSync(path.join(root,'variants/manifest.json'),JSON.stringify(manifest));
fs.writeFileSync(path.join(root,'variants/manifest.js'),'window.TalkTagGuided003010Variants = '+JSON.stringify(manifest)+';\n');
console.log(`Built ${records.length} cards, ${records.length*4} variants.`);
