#!/usr/bin/env node
// Assemble approved English/Korean A0 002–010 cards from one generated model phrase each.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/a0-002-010-scripts.json'),'utf8'));
const root=process.env.TALKTAG_LEVEL0_WORKDIR||'/private/tmp/talktag-level0-002-010';
const out=path.join(root,'final');
const rate=48000,sec=n=>Number((n/rate).toFixed(6));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const titles={
  '002':'Say Your Name','003':'Say Thank You','004':'Get Attention','005':'Decline Politely',
  '006':'Ask for Water','007':'Ask to Hear It Again','008':'Find the Restroom',
  '009':'Ask for Help','010':'Say Goodbye'
};
const slugs={
  '002':'Introduce','003':'Thank-You','004':'Excuse-Me','005':'No-Thank-You',
  '006':'Water','007':'One-More-Time','008':'Restroom','009':'Help','010':'Goodbye'
};
function ff(args){const p=spawnSync('ffmpeg',args,{encoding:null,maxBuffer:64*1024*1024});if(p.error||p.status!==0)throw Error('ffmpeg: '+(p.error?.message||String(p.stderr).slice(-1000)));return p.stdout;}
function decode(p){return ff(['-v','error','-nostdin','-i',p,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);}

const context={window:{TalkTagNative:{language:'en'}}};
vm.runInNewContext(fs.readFileSync(path.join(repo,'level0-glr001.js'),'utf8'),context);
const donor=context.window.TalkTagAudioLessons.find(x=>x.id==='guided-a0-001');
if(!donor?.training?.startCueEnd||!donor?.training?.endingCueStart)throw Error('A0 001 ding donor missing');
const donorPcm=decode(path.join(repo,'audio/guided/level0-001',donor.sourceFilename));
const start=donorPcm.subarray(0,Math.round(donor.training.startCueEnd*rate)*2);
const end=donorPcm.subarray(Math.round(donor.training.endingCueStart*rate)*2);
if(start.length<1000||end.length<1000)throw Error('Start/end ding missing');
fs.mkdirSync(out,{recursive:true});
const cards=[];
for(const pair of source.episodePairs){
  for(const language of ['en','ko']){
    const script=pair[language],raw=path.join(root,'raw',`${language}-${pair.unit}-model.mp3`);
    if(!fs.existsSync(raw))throw Error('Missing model voice '+raw);
    const voice=decode(raw),voiceSamples=voice.length/2;
    // Pad past the strict 2.5×/3s boundary to survive MP3 encoder rounding.
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
      const filename=`SC-GLR-${pair.unit}-A0-${slugs[pair.unit]}-${language==='ko'?'KR-Leejin':'US-Lauren'}.mp3`;
      const dest=path.join(out,filename);
      ff(['-y','-v','error','-nostdin','-f','s16le','-ar',String(rate),'-ac','1','-i',pcmFile,'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',dest]);
      cards.push({id:script.id,language,level:'A0',unit:Number(pair.unit),title:titles[pair.unit],titleKo:pair.en.titleKo,
        targetExpression:script.target,supportMeaning:script.meaning,expressions:[script.target],meanings:[script.meaning],
        tinyPrompt:script.prompt,expectedResponse:script.expected,pronunciation:script.pronunciation,
        scene:pair.scene,picture:pair.picture,pictureAlt:pair.pictureAlt,filename,localFile:dest,
        bytes:fs.statSync(dest).size,sha256:hash(dest),sourceFile:raw,sourceSha256:hash(raw),voiceSeconds:sec(voiceSamples),
        training:{kind:'sentence-repeat',defaultReps:5,silenceMultiplier:2.5,minimumGapSeconds:3,
          startCueEnd,endingCueStart,cues,cardDings:true,durationSeconds:sec(cursor)}});
    }finally{try{fs.closeSync(fd);}catch{}fs.rmSync(scratch,{recursive:true,force:true});}
  }
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),cards},null,2)+'\n');
console.log(cards.map(x=>`${x.id} ${x.training.durationSeconds}s ${x.bytes}B`).join('\n'));
