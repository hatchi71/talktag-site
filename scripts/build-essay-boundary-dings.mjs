#!/usr/bin/env node
// Rebuild published AEA recordings with one approved cue at each card boundary.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cueFiles={start:'/Users/eungjukim/Desktop/TEMP/Start.mp3',end:'/Users/eungjukim/Desktop/TEMP/Ending.mp3'};
const outputRoot=path.join(repo,'audio/essays-boundary-dings-20261020');
const releaseBase='https://audio.talktag.co.kr/Essays/boundary-dings/v1-20261020/';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function command(bin,args){const r=spawnSync(bin,args,{encoding:null,maxBuffer:128e6});if(r.error||r.status!==0)throw Error(`${bin}: ${r.error?.message||String(r.stderr).slice(-900)}`);return r.stdout;}
function pcm(file){const data=command('ffmpeg',['-v','error','-nostdin','-i',file,'-ar','48000','-ac','1','-f','s16le','-']);return new Int16Array(data.buffer,data.byteOffset,data.byteLength/2);}
function seconds(file){return Number(command('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file]).toString().trim());}
function audioMatch(source,cue,side){
  const span=Math.min(source.length,cue.length+48000),section=side==='start'?source.subarray(0,span):source.subarray(source.length-span);
  let best=0;
  for(let offset=0;offset<=section.length-cue.length;offset+=480){
    let dot=0,left=0,right=0;
    for(let i=0;i<cue.length;i+=4){const a=section[offset+i],b=cue[i];dot+=a*b;left+=a*a;right+=b*b;}
    best=Math.max(best,dot/Math.sqrt(left*right||1));
  }
  return best;
}
const context={window:{}};vm.createContext(context);
for(const name of ['audio-essays.js','audio-essays-002-media.js','audio-essays-002.js'])vm.runInContext(fs.readFileSync(path.join(repo,name),'utf8'),context,{filename:name});
const english=context.window.TalkTagAudioLessons.filter(x=>x.type==='plain'&&x.available!==false);
if(english.length!==12)throw Error(`Unexpected English essay catalog size: ${english.length}`);
for(const file of Object.values(cueFiles))if(!fs.existsSync(file))throw Error('Missing approved cue '+file);
const cues=Object.fromEntries(Object.entries(cueFiles).map(([name,file])=>[name,pcm(file)]));
const cueSeconds=Object.fromEntries(Object.entries(cues).map(([name,data])=>[name,data.length/48000]));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-essay-dings-'));
const records=[];
for(const lesson of english){
  const language='en';
  const source=path.join(temp,lesson.id+'.mp3');
  const response=await fetch(lesson.audio,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`${lesson.id}: source HTTP ${response.status}`);
  fs.writeFileSync(source,Buffer.from(await response.arrayBuffer()));
  if(lesson.checksum&&sha(source)!==lesson.checksum)throw Error(`${lesson.id}: published source checksum changed`);
  const decoded=pcm(source),startMatch=audioMatch(decoded,cues.start,'start'),endMatch=audioMatch(decoded,cues.end,'end');
  if(startMatch>0.75||endMatch>0.75)throw Error(`${lesson.id}: possible existing boundary ding; stop to prevent duplication (${startMatch.toFixed(2)}, ${endMatch.toFixed(2)})`);
  const outDir=path.join(outputRoot,language);fs.mkdirSync(outDir,{recursive:true});
  const output=path.join(outDir,lesson.id+'.mp3');
  command('ffmpeg',['-v','error','-nostdin','-y','-i',cueFiles.start,'-i',source,'-i',cueFiles.end,'-filter_complex','[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono[s];[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono[n];[2:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono[e];[s][n][e]concat=n=3:v=0:a=1[a]','-map','[a]','-c:a','libmp3lame','-b:a','128k',output]);
  const actual=seconds(output),speechSeconds=decoded.length/48000;
  if(Math.abs(actual-(cueSeconds.start+speechSeconds+cueSeconds.end))>0.12)throw Error(`${lesson.id}: unexpected encoded duration`);
  const digest=sha(output),bytes=fs.statSync(output).size;
  records.push({id:lesson.id,language,level:lesson.level,sourceAudio:lesson.audio,sourceSha256:sha(source),sourceSeconds:seconds(source),startMatch:+startMatch.toFixed(4),endMatch:+endMatch.toFixed(4),audio:releaseBase+language+'/'+lesson.id+'.mp3?v='+digest.slice(0,12),sha256:digest,bytes,durationSeconds:actual,openingDingSeconds:cueSeconds.start,closingDingSeconds:cueSeconds.end});
  console.log(`${lesson.id}: ${seconds(source).toFixed(2)} -> ${actual.toFixed(2)} s; source cue match ${startMatch.toFixed(2)}/${endMatch.toFixed(2)}`);
}
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify({version:1,releaseBase,cues:{start:{sha256:sha(cueFiles.start),seconds:cueSeconds.start},end:{sha256:sha(cueFiles.end),seconds:cueSeconds.end}},cards:records},null,2)+'\n');
const publicRecords=records.map(({id,language,audio,sha256,durationSeconds,openingDingSeconds,closingDingSeconds})=>({id,language,audio,sha256,durationSeconds,openingDingSeconds,closingDingSeconds}));
fs.writeFileSync(path.join(repo,'essay-ding-media.js'),`/* Verified versioned Essays & Articles boundary-cue media. Generated by build-essay-boundary-dings.mjs. */\n(function(){'use strict';\nvar cards=${JSON.stringify(publicRecords)};\nvar byId=new Map(cards.map(function(card){return [card.id,card];}));\nfunction update(lesson){var card=byId.get(lesson.id);if(!card)return;var shift=card.openingDingSeconds;lesson.audio=card.audio;lesson.audioRevision='ding-'+card.sha256.slice(0,12);lesson.checksum=card.sha256;lesson.durationSeconds=card.durationSeconds;lesson.durationLabel=lesson.durationLong=String(Math.floor(card.durationSeconds/60))+':'+String(Math.floor(card.durationSeconds%60)).padStart(2,'0');lesson.openingDingSeconds=shift;lesson.closingDingSeconds=card.closingDingSeconds;lesson.boundaryDings=true;if(lesson.sync&&!window.TalkTagEssayMedia?.[lesson.id]&&Array.isArray(lesson.sync.cues))lesson.sync.cues=lesson.sync.cues.map(function(c){return {...c,s:c.s+shift,e:c.e+shift};});if(Array.isArray(lesson.sentenceGaps))lesson.sentenceGaps=lesson.sentenceGaps.map(function(pair){return pair.map(function(t){return t+shift;});});}\n(window.TalkTagAudioLessons||[]).forEach(update);Object.values(window.TalkTagNativeCatalogs||{}).forEach(function(list){if(Array.isArray(list))list.forEach(update);});Object.entries(window.TalkTagAudioSync||{}).forEach(function(entry){var card=byId.get(entry[0]);if(card&&Array.isArray(entry[1].cues))entry[1].cues=entry[1].cues.map(function(c){return {...c,s:c.s+card.openingDingSeconds,e:c.e+card.openingDingSeconds};});});Object.entries(window.TalkTagEssayMedia||{}).forEach(function(entry){var card=byId.get(entry[0]),media=entry[1];if(!card)return;media.audio=card.audio;media.audioRevision='ding-'+card.sha256.slice(0,12);media.checksum=card.sha256;media.durationSeconds=card.durationSeconds;media.durationLabel=media.durationLong=String(Math.floor(card.durationSeconds/60))+':'+String(Math.floor(card.durationSeconds%60)).padStart(2,'0');if(media.sync&&Array.isArray(media.sync.cues))media.sync.cues=media.sync.cues.map(function(c){return {...c,s:c.s+card.openingDingSeconds,e:c.e+card.openingDingSeconds};});});window.TalkTagEssayBoundaryDings=cards;\n})();\n`);
console.log(`Built ${records.length} cards.`);
