#!/usr/bin/env node
// Assemble the two approved Level 0 greeting pilots from one model utterance each.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/a0-001-scripts.json'),'utf8'));
const root=process.env.TALKTAG_LEVEL0_WORKDIR||'/private/tmp/talktag-level0-001';
const out=path.join(root,'final');
const rate=48000,sec=n=>Number((n/rate).toFixed(6));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function ff(args){const p=spawnSync('ffmpeg',args,{encoding:null,maxBuffer:64*1024*1024});if(p.error||p.status!==0)throw Error('ffmpeg: '+(p.error?.message||String(p.stderr).slice(-1000)));return p.stdout;}
function decode(p){return ff(['-v','error','-nostdin','-i',p,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);}
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(repo,'guided-miniskit-pilots.js'),'utf8'),context);
const donor=context.window.TalkTagAudioLessons.find(x=>x.id==='guided-a1-10-miniskit-pilot');
if(!donor?.training?.startCueEnd||!donor?.training?.endingCueStart)throw Error('Ding donor missing');
const donorPcm=decode(path.join(repo,'audio/guided/miniskit-pilot-20261012',donor.sourceFilename));
const start=donorPcm.subarray(0,Math.round(donor.training.startCueEnd*rate)*2);
const end=donorPcm.subarray(Math.round(donor.training.endingCueStart*rate)*2);
if(start.length<1000||end.length<1000)throw Error('Start/end ding missing');
fs.mkdirSync(out,{recursive:true});
const cards=[];
for(const card of source.cards){
  const raw=path.join(root,'raw',card.language==='ko'?'ko-model.mp3':'en-model.mp3');
  if(!fs.existsSync(raw))throw Error('Missing model voice '+raw);
  const voice=decode(raw),voiceSamples=voice.length/2;
  const gapSamples=Math.ceil(Math.max(3.2,voiceSamples/rate*2.55+0.15)*rate);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-a0-glr-'));
  const pcmFile=path.join(scratch,'card.pcm');
  const fd=fs.openSync(pcmFile,'w');let cursor=0;const cues=[];
  try{
    function append(buffer){fs.writeSync(fd,buffer);cursor+=buffer.length/2;}
    function silence(samples){const zero=Buffer.alloc(rate*2);let left=samples;while(left){const n=Math.min(rate,left);fs.writeSync(fd,zero,0,n*2);cursor+=n;left-=n;}}
    append(start);const startCueEnd=sec(cursor);
    for(let rep=1;rep<=5;rep++){
      const s=cursor;append(voice);const voiceEnd=cursor;silence(gapSamples);
      cues.push({s:sec(s),voiceEnd:sec(voiceEnd),e:sec(cursor),i:0,r:rep});
    }
    const endingCueStart=sec(cursor);append(end);fs.closeSync(fd);
    const filename=card.language==='ko'?'SC-GLR-001-A0-Say-Hello-KR-Leejin.mp3':'SC-GLR-001-A0-Say-Hello-US-Lauren.mp3';
    const dest=path.join(out,filename);
    ff(['-y','-v','error','-nostdin','-f','s16le','-ar',String(rate),'-ac','1','-i',pcmFile,'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',dest]);
    cards.push({id:card.id,language:card.language,level:'A0',unit:1,title:card.title,titleKo:card.titleKo,
      targetExpression:card.targetExpression,supportMeaning:card.supportMeaning,expressions:[card.targetExpression],meanings:[card.supportMeaning],tinyPrompt:card.tinyPrompt,expectedResponse:card.expectedResponse,
      picture:card.picture,pictureAlt:card.pictureAlt,filename,localFile:dest,bytes:fs.statSync(dest).size,sha256:hash(dest),
      sourceFile:raw,sourceSha256:hash(raw),voiceSeconds:sec(voiceSamples),
      training:{kind:'sentence-repeat',defaultReps:5,silenceMultiplier:2.5,minimumGapSeconds:3,startCueEnd,endingCueStart,cues,cardDings:true,durationSeconds:sec(cursor)}});
  }finally{try{fs.closeSync(fd);}catch{}fs.rmSync(scratch,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),cards},null,2)+'\n');
console.log(cards.map(x=>`${x.id} ${x.training.durationSeconds}s ${x.bytes}B`).join('\n'));
