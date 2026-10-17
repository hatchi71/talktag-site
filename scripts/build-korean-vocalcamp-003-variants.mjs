#!/usr/bin/env node
// Assemble Korean Vocal Camp 003 from its newly generated isolated
// line recordings. No TTS service is called and source files are never changed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputRoot=path.join(repo,'audio/korean/vocalcamp/segments-003');
const releaseBase='https://audio.talktag.co.kr/Korean/boot-camp/vocal-camp/segments-003/v1-20261017/';
const rate=48000,ratios=[2,2.5,3,3.5],silence=Buffer.alloc(rate*2);
const count=pcm=>pcm.length/2;
const sec=samples=>Number((samples/rate).toFixed(6));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ratioName=ratio=>ratio.toFixed(1).replace('.','_');
function run(command,args){
  const result=spawnSync(command,args,{encoding:null,maxBuffer:96*1024*1024});
  if(result.error||result.status!==0)throw Error(`${command}: ${result.error?.message||String(result.stderr).slice(-1000)}`);
  return result.stdout;
}
function decode(file){
  if(!fs.existsSync(file))throw Error(`Missing published line recording ${file}`);
  return run('ffmpeg',['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);
}
function activeRange(pcm){
  const frame=480,data=new Int16Array(pcm.buffer,pcm.byteOffset,pcm.length/2);
  let first=-1,last=-1;
  for(let offset=0;offset<data.length;offset+=frame){
    const end=Math.min(data.length,offset+frame);let sum=0;
    for(let i=offset;i<end;i++)sum+=data[i]*data[i];
    if(Math.sqrt(sum/(end-offset))/32768>=0.001){if(first<0)first=offset;last=end;}
  }
  if(first<0||last<=first)throw Error('No audible signal in published line recording');
  return {first,last};
}
function writeSilence(fd,samples){
  if(samples<0)throw Error(`Negative pause ${samples}`);
  for(let left=samples;left>0;){const n=Math.min(rate,left);fs.writeSync(fd,silence,0,n*2);left-=n;}
}
function encode(raw,output){
  fs.mkdirSync(path.dirname(output),{recursive:true});
  run('ffmpeg',['-v','error','-nostdin','-y','-f','s16le','-ar',String(rate),'-ac','1','-i',raw,
    '-map_metadata','-1','-id3v2_version','3','-codec:a','libmp3lame','-q:a','4',output]);
}
function record(file,relative){
  const digest=sha(file);
  return {audio:`${releaseBase}${relative}?v=${digest.slice(0,12)}`,
    bytes:fs.statSync(file).size,sha256:digest};
}
function catalog(){
  const context={window:{}};
  for(const file of ['content/vocalcamp-korean-003.js'])
    vm.runInNewContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
  const families=context.window.TALKTAG_VOCALCAMP_KOREAN?.families;
  if(families?.length!==1||families[0].number!=='003')
    throw Error('Korean Vocal Camp 003 catalog is incomplete');
  return families;
}

const cards=[];
for(const family of catalog())for(const level of ['A1','A2','B1','B2','C1','C2']){
  const episode=family.number,lesson=family.levelsData[level];
  if(!lesson||lesson.status!=='draft'||lesson.lines.length!==lesson.translation.length||
      lesson.lines.length!==lesson.speakers.length)throw Error(`Korean Vocal Camp catalog mismatch ${episode}/${level}`);
  const lines=[];
  for(let i=0;i<lesson.lines.length;i++){
    const original=path.join(repo,'_local-audio/korean-vocalcamp-003/raw',`K-VC-003-${level}-${String(i+1).padStart(2,'0')}-${lesson.speakers[i]}.mp3`);
    const source=decode(original),active=activeRange(source);
    const first=Math.max(0,active.first-Math.round(rate*0.08));
    const last=Math.min(count(source),active.last+Math.round(rate*0.12));
    const pcm=Buffer.from(source.subarray(first*2,last*2));
    const relative=`${episode}/${level.toLowerCase()}/line-${String(i+1).padStart(2,'0')}.mp3`;
    const output=path.join(outputRoot,relative);
    const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-vc-line-'));
    try{const raw=path.join(scratch,'line.pcm');fs.writeFileSync(raw,pcm);encode(raw,output);}
    finally{fs.rmSync(scratch,{recursive:true,force:true});}
    lines.push({text:lesson.lines[i],meaning:lesson.translation[i],
      speaker:lesson.speakers?.[i]||'Leejin',pcm,samples:count(pcm),
      voiceStart:active.first-first,voiceEnd:active.last-first,
      speechSeconds:sec(active.last-active.first),sourceSha256:sha(original),...record(output,relative)});
  }
  const steps=[];
  for(let k=1;k<=lines.length;k++){
    const variants=[];
    for(const ratio of ratios){
      const relative=`${episode}/${level.toLowerCase()}/pause-${ratioName(ratio)}/step-${String(k).padStart(2,'0')}.mp3`;
      const output=path.join(outputRoot,relative);
      const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-vc-step-'));
      const raw=path.join(scratch,'assembly.pcm');let fd;
      try{
        fd=fs.openSync(raw,'w');let cursor=0;const cues=[];
        for(let i=0;i<k;i++){
          const line=lines[i],voiceStart=cursor+line.voiceStart,voiceEnd=cursor+line.voiceEnd;
          fs.writeSync(fd,line.pcm);cursor+=line.samples;
          const nextLead=i+1<k?lines[i+1].voiceStart:0;
          const target=i+1<k?Math.max(Math.round(.35*rate),line.samples-line.voiceEnd+nextLead):Math.max(3*rate,Math.round((voiceEnd-lines[0].voiceStart)*ratio));
          const gap=target-(line.samples-line.voiceEnd)-nextLead;
          writeSilence(fd,gap);cursor+=gap;
          cues.push({i,s:sec(voiceStart),voiceEnd:sec(voiceEnd),e:sec(cursor)});
        }
        fs.closeSync(fd);fd=undefined;encode(raw,output);
        const decoded=decode(output);
        if(Math.abs(count(decoded)-cursor)>2304)throw Error(`Decoded duration mismatch ${episode}/${level}/${k}/${ratio}`);
        variants.push({ratio,durationSeconds:sec(count(decoded)),cues,...record(output,relative)});
      }finally{if(fd!==undefined)fs.closeSync(fd);fs.rmSync(scratch,{recursive:true,force:true});}
    }
    steps.push({step:k,variants});
  }
  cards.push({id:`family-${episode}-${level}`,episode,level,title:family.title,
    lines:lines.map(({pcm,samples,voiceStart,voiceEnd,...data})=>data),steps});
  console.log(`Korean Vocal Camp ${episode}/${level}: ${lines.length} isolated lines, ${steps.length*4} cumulative variants`);
}
const manifest={version:1,releaseBase,ratios,minimumPauseSeconds:3,cards};
fs.mkdirSync(outputRoot,{recursive:true});
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(outputRoot,'manifest.js'),`window.TalkTagKoreanVocal003Variants = ${JSON.stringify(manifest)};\n`);
console.log(`Built ${cards.length} Korean Vocal Camp cards and ${cards.reduce((n,card)=>n+card.steps.length*4,0)} step variants.`);
