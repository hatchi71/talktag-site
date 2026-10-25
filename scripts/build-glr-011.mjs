#!/usr/bin/env node
// Assemble original GLR 011 TTS clips into independently playable, timed cards.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/glr-011-scripts.json'),'utf8'));
const root=process.env.TALKTAG_GLR011_WORKDIR||'/private/tmp/talktag-glr011';
const raw=path.join(root,'raw'),out=path.join(root,'final');
const rate=48000,sec=s=>Number((s/rate).toFixed(6));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function ff(args){const p=spawnSync('ffmpeg',args,{encoding:null,maxBuffer:1024*1024*1024});if(p.error||p.status!==0)throw Error('ffmpeg: '+(p.error?.message||String(p.stderr).slice(-1000)));return p.stdout;}
function decode(p){return ff(['-v','error','-nostdin','-i',p,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);}
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(repo,'guided-miniskit-pilots.js'),'utf8'),ctx);
const donor=ctx.window.TalkTagAudioLessons.find(x=>x.id==='guided-a1-10-miniskit-pilot');
if(!donor?.training?.startCueEnd||!donor?.training?.endingCueStart)throw Error('Boundary ding donor missing');
const donorPcm=decode(path.join(repo,'audio/guided/miniskit-pilot-20261012',donor.sourceFilename));
const start=donorPcm.subarray(0,Math.round(donor.training.startCueEnd*rate)*2);
const end=donorPcm.subarray(Math.round(donor.training.endingCueStart*rate)*2);
if(start.length<1000||end.length<1000)throw Error('Boundary dings missing');
fs.mkdirSync(out,{recursive:true});
const records=[];
for(const [level,data] of Object.entries(source.levels)){
  const reps=/^C/.test(level)?21:/^B/.test(level)?15:10;
  const ceiling=/^C/.test(level)?900:600;
  const lines=data.lines.map((line,i)=>{
    const p=path.join(raw,`${level.toLowerCase()}-${String(i+1).padStart(2,'0')}.mp3`);
    if(!fs.existsSync(p))throw Error('Missing raw TTS '+p);
    const pcm=decode(p);
    return {...line,pcm,sourceFile:p,sourceSha256:hash(p),durationSeconds:pcm.length/2/rate};
  });
  const cost=line=>reps*(line.durationSeconds+Math.max(3.2,line.durationSeconds*2.55+0.15));
  const groups=[];let current=[],length=(start.length+end.length)/2/rate;
  for(const line of lines){
    if(current.length&&(length+cost(line)>ceiling||(/^[BC]/.test(level)&&current.length>=2))){groups.push(current);current=[];length=(start.length+end.length)/2/rate;}
    if(length+cost(line)>ceiling)throw Error(`${level} single repetition cycle exceeds ${ceiling}s`);
    current.push(line);length+=cost(line);
  }
  if(current.length)groups.push(current);
  let lineNumber=0;
  for(let part=0;part<groups.length;part++){
    const group=groups[part],first=lineNumber+1;
    const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-glr011-'));
    const pcmFile=path.join(scratch,'card.pcm');const fd=fs.openSync(pcmFile,'w');
    let cursor=0;const cues=[];
    try{
      function append(buffer){fs.writeSync(fd,buffer);cursor+=buffer.length/2;}
      append(start);const startCueEnd=sec(cursor);
      group.forEach((line,i)=>{
        for(let rep=1;rep<=reps;rep++){
          const s=cursor;append(line.pcm);const voiceEnd=cursor;
          const gap=Math.ceil(Math.max(3.2,line.durationSeconds*2.55+0.15)*rate);
          let remaining=gap;const zero=Buffer.alloc(rate*2);
          while(remaining){const samples=Math.min(rate,remaining);fs.writeSync(fd,zero,0,samples*2);cursor+=samples;remaining-=samples;}
          cues.push({s:sec(s),voiceEnd:sec(voiceEnd),e:sec(cursor),i,r:rep});
        }
      });
      const endingCueStart=sec(cursor);append(end);fs.closeSync(fd);
      const partSuffix=groups.length>1?`-Part-${String(part+1).padStart(2,'0')}`:'';
      const filename=`SC-GLR-011-${level}-${data.title.replace(/[^A-Za-z0-9]+/g,'-').replace(/-$/,'')}${partSuffix}-US-Roger-Lauren.mp3`;
      const dest=path.join(out,filename);
      ff(['-y','-v','error','-nostdin','-f','s16le','-ar',String(rate),'-ac','1','-i',pcmFile,'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',dest]);
      const durationSeconds=sec(cursor);
      if(durationSeconds>ceiling)throw Error(`${level} card ${part+1} exceeds ${ceiling}s`);
      records.push({
        id:`guided-${level.toLowerCase()}-11${groups.length>1?'-part'+(part+1):''}`,
        level,unit:11,partIndex:groups.length>1?part+1:null,partCount:groups.length>1?groups.length:null,
        sentenceStart:first,sentenceEnd:first+group.length-1,title:data.title+(groups.length>1?` · Part ${part+1}`:''),
        situation:data.situation,filename,localFile:dest,bytes:fs.statSync(dest).size,sha256:hash(dest),
        expressions:group.map(x=>x.en),meanings:group.map(x=>x.ko),speakers:group.map(x=>x.speaker),
        sourceFiles:group.map(x=>({path:x.sourceFile,sha256:x.sourceSha256,durationSeconds:x.durationSeconds})),
        training:{kind:'sentence-repeat',defaultReps:reps,silenceMultiplier:2.5,minimumGapSeconds:3,
          startCueEnd,endingCueStart,cues,cardDings:true,durationSeconds}
      });
    }finally{try{fs.closeSync(fd);}catch{}fs.rmSync(scratch,{recursive:true,force:true});}
    lineNumber+=group.length;
  }
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,episode:11,createdAt:new Date().toISOString(),cards:records},null,2)+'\n');
console.log(records.map(x=>`${x.id} ${x.training.durationSeconds}s ${x.bytes}B ${x.sha256.slice(0,12)}`).join('\n'));
