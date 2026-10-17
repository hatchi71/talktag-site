#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/guided/segments-003-010/variants');
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const js=fs.readFileSync(path.join(root,'manifest.js'),'utf8');
const c={window:{}};vm.runInNewContext(js,c);
if(JSON.stringify(c.window.TalkTagGuided003010Variants)!==JSON.stringify(m))throw Error('Manifest JSON/JS mismatch');
if(m.version!==1||m.cards.length!==61||JSON.stringify(m.pauseRatios)!=='[2,2.5,3,3.5]')throw Error('Manifest inventory mismatch');
const sourceCtx={window:{}};
for(const f of ['guided-lauren003.js','guided-lauren004.js','guided-jarnathan005.js','guided-max006.js','guided-roger007.js','guided-miniskit-pilots.js','guided-miniskit-a2-c2.js'])vm.runInNewContext(fs.readFileSync(path.join(repo,f),'utf8'),sourceCtx);
const originals=new Map(sourceCtx.window.TalkTagAudioLessons.map(x=>[x.id,x]));
let files=0,worst=.0;
const acoustic=process.argv.includes('--acoustic');
function rmsAt(fd,seconds){
  const samples=4800,buffer=Buffer.alloc(samples*2);
  const offset=Math.max(0,Math.floor(seconds*48000))*2;
  const n=fs.readSync(fd,buffer,0,buffer.length,offset);
  if(n<buffer.length)throw Error('Decoded window is truncated at '+seconds);
  let sum=0;for(let i=0;i<n;i+=2){const x=buffer.readInt16LE(i);sum+=x*x;}
  return Math.sqrt(sum/(n/2))/32768;
}
function peakRms(fd,start,end){let peak=0;for(let at=start;at+.1<end;at+=.05)peak=Math.max(peak,rmsAt(fd,at));return peak;}
for(const card of m.cards){
  const original=originals.get(card.id);
  if(!original||original.training.defaultReps!==card.repetitions||
      JSON.stringify(card.lines)!==JSON.stringify(original.expressions.map((text,i)=>({text,meaning:original.meanings[i]}))))throw Error('Script or repetitions changed '+card.id);
  if(card.variants.length!==4)throw Error('Variant count '+card.id);
  for(const v of card.variants){
    const u=new URL(v.audio),relative=u.pathname.slice(new URL(m.releaseBase).pathname.length);
    const file=path.join(repo,'audio/guided/segments-003-010',relative);
    if(!u.pathname.startsWith(new URL(m.releaseBase).pathname+'variants/')||!fs.existsSync(file)||
        fs.statSync(file).size!==v.bytes||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==v.sha256)throw Error('Missing or changed audio '+card.id+' '+v.ratio);
    if(v.cues.length!==card.lines.length*card.repetitions||v.audio.split('?v=')[1]!==v.sha256.slice(0,12))throw Error('Cue count or URL '+card.id);
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'});
    const duration=Number(probe.stdout);
    if(probe.status!==0||Math.abs(duration-v.durationSeconds)>.08)throw Error('Decoded duration '+card.id+' '+v.ratio);
    for(let i=0;i<v.cues.length;i++){
      const cue=v.cues[i],next=v.cues[i+1],target=Math.max(3,(cue.voiceEnd-cue.s)*v.ratio),gap=cue.e-cue.voiceEnd;
      if(cue.i!==Math.floor(i/card.repetitions)||cue.r!==i%card.repetitions+1||cue.voiceEnd<=cue.s||
          Math.abs(gap-target)>.005||(next&&Math.abs(next.s-cue.e)>.001))throw Error('Pause/cue mismatch '+card.id+' '+v.ratio+' '+i);
      worst=Math.max(worst,Math.abs(gap-target));
    }
    if(v.cues.at(-1).e!==v.endingCueStart||v.endingCueStart>=duration)throw Error('Ending ding missing '+card.id);
    if(acoustic){
      const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-glr-acoustic-'));
      const raw=path.join(scratch,'decoded.pcm');
      try{
        const decoded=spawnSync('ffmpeg',['-y','-v','error','-nostdin','-i',file,'-ar','48000','-ac','1','-f','s16le',raw],{encoding:'utf8'});
        if(decoded.status!==0)throw Error('Cannot decode '+card.id+' '+v.ratio);
        const fd=fs.openSync(raw,'r');
        try{
          for(const cue of v.cues){
            const gap=cue.e-cue.voiceEnd;
            const quiet=rmsAt(fd,cue.voiceEnd+gap/2-.05);
            if(quiet>.002)throw Error(`Audible signal in pause ${card.id} ${v.ratio} line ${cue.i+1} rep ${cue.r}: ${quiet}`);
          }
          if(peakRms(fd,0,v.cues[0].s)<.0005||peakRms(fd,v.endingCueStart,duration)<.0005)throw Error('Missing card ding '+card.id+' '+v.ratio);
        }finally{fs.closeSync(fd);}
      }finally{fs.rmSync(scratch,{recursive:true,force:true});}
    }
    files++;
  }
  console.log(`PASS ${card.id}: 4 pause choices, ${card.repetitions} repeats per line`);
}
console.log(`PASS ${m.cards.length} cards, ${files} verified MP3s, max cue pause error ${worst.toFixed(4)}s`);
