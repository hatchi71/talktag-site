#!/usr/bin/env node
// Assemble Korean GLR source lines after TalkTag Audio QC Studio's technical pass.
// This builds a local release candidate; it does not mark it publication-ready.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-a2-c2-005-010');
const release=path.join(work,'release');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/native-glr-ko-a2-c2-005-010.source.json'),'utf8'));
const qc=JSON.parse(fs.readFileSync(path.join(work,'technical-qc.json'),'utf8'));
if(source.lessons.length!==30||qc.length!==120||qc.some(row=>!row.technicalPass||!row.output))throw Error('Complete technical QC inventory required');
const rate=48000,ratios=[2,2.5,3,3.5],base='https://audio.talktag.co.kr/Korean/guided/20261026-a2-c2-005-010/';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const seconds=samples=>+(samples/rate).toFixed(6);
function ffmpeg(args){const r=spawnSync('/opt/homebrew/bin/ffmpeg',args,{encoding:null,maxBuffer:200e6});if(r.error||r.status!==0)throw Error('ffmpeg failed '+(r.error?.message||String(r.stderr).slice(-500)));return r.stdout;}
function pcm(file){return ffmpeg(['-v','error','-nostdin','-i',file,'-ac','1','-ar',String(rate),'-f','s16le','pipe:1']);}
function encode(bytes,file){fs.mkdirSync(path.dirname(file),{recursive:true});const r=spawnSync('/opt/homebrew/bin/ffmpeg',['-v','error','-nostdin','-y','-f','s16le','-ar',String(rate),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','128k',file],{input:bytes,maxBuffer:2e6});if(r.error||r.status!==0)throw Error('MP3 encode failed '+file);}
function active(bytes){const count=bytes.length/2,frame=480;let first=-1,last=-1;for(let start=0;start<count;start+=frame){let sum=0,n=0;for(let i=start;i<Math.min(count,start+frame);i++){sum+=bytes.readInt16LE(i*2)**2;n++;}if(Math.sqrt(sum/n)>=100){if(first<0)first=start;last=start+n;}}if(first<0)throw Error('Silent line');return {first,last};}
function record(file,key){const sha256=hash(file),bytes=fs.statSync(file).size;return {audio:base+key+'?v='+sha256.slice(0,16),sha256,bytes};}
const start=pcm('/Users/eungjukim/Desktop/TEMP/Start.mp3'),end=pcm('/Users/eungjukim/Desktop/TEMP/Ending.mp3');
const startSamples=start.length/2,endSamples=end.length/2;
const catalog=[],variantCards=[],uploads=[];
for(const lesson of source.lessons){
  const reps=lesson.level[0]==='A'?10:lesson.level[0]==='B'?15:21;
  const limit=lesson.level[0]==='C'?900:600;
  const lines=lesson.lines.map((line,index)=>{
    const entry=qc.find(row=>row.cardId===lesson.id&&row.line===index+1);
    const raw=path.join(work,'lines',`${lesson.level.toLowerCase()}-${lesson.episode}-${String(index+1).padStart(2,'0')}-${line.speaker}.mp3`);
    if(!entry||entry.expected!==line.ko||entry.sourceSha256!==hash(raw)||!fs.existsSync(entry.output))throw Error('Unverified line '+lesson.id+'/'+(index+1));
    const samples=pcm(entry.output),range=active(samples),from=Math.max(0,range.first-3840),to=Math.min(samples.length/2,range.last+5760);
    const clip=Buffer.from(samples.subarray(from*2,to*2)),voiceStart=range.first-from,voiceEnd=range.last-from;
    const key=`lines/${lesson.level.toLowerCase()}-${lesson.episode}-${String(index+1).padStart(2,'0')}-${line.speaker}.mp3`,file=path.join(release,key);
    encode(clip,file);uploads.push({file,key:base.slice('https://audio.talktag.co.kr/'.length)+key,...record(file,key)});
    return {...line,clip,voiceStart,voiceEnd,samples:clip.length/2,voiceSeconds:seconds(voiceEnd-voiceStart),publicLine:record(file,key)};
  });
  const overhead=seconds(startSamples+endSamples);
  const predicted=group=>overhead+group.reduce((sum,line)=>sum+reps*(seconds(line.samples)+Math.max(3,3.5*line.voiceSeconds)+.12),0);
  const options=[];
  function partition(index,groups){if(index===lines.length){const durations=groups.map(predicted),avg=durations.reduce((a,b)=>a+b,0)/durations.length;options.push({groups,score:durations.reduce((sum,n)=>sum+(n-avg)**2,0)});return;}
    for(let last=index+1;last<=lines.length;last++){const group=lines.slice(index,last);if(predicted(group)>limit-.5)break;partition(last,[...groups,group]);}}
  partition(0,[]);options.sort((a,b)=>a.groups.length-b.groups.length||a.score-b.score);
  if(!options.length)throw Error('No duration-safe card split '+lesson.id);
  const groups=options[0].groups;
  for(let part=0,sentenceStart=1;part<groups.length;part++){
    const group=groups[part],id=lesson.id+(part?`-part${part+1}`:'');
    const variants=[];
    for(const ratio of ratios){
      const cues=[],measuredSpeech=[],chunks=[start];let cursor=startSamples;
      const events=group.flatMap((line,i)=>Array.from({length:reps},(_,r)=>({line,i,r:r+1})));
      for(let n=0;n<events.length;n++){
        const {line,i,r}=events[n],next=events[n+1]?.line;
        const cueStart=cursor,spokenStart=cursor+line.voiceStart,spokenEnd=cursor+line.voiceEnd;
        chunks.push(line.clip);cursor+=line.samples;
        const target=Math.max(3*rate,Math.round((line.voiceEnd-line.voiceStart)*ratio));
        const trailing=line.samples-line.voiceEnd,leading=next?next.voiceStart:0;
        const gap=Math.max(0,target-trailing-leading);
        chunks.push(Buffer.alloc(gap*2));cursor+=gap;
        cues.push({s:seconds(cueStart),voiceEnd:seconds(spokenEnd),e:seconds(cursor),i,r});
        measuredSpeech.push({start:seconds(spokenStart),end:seconds(spokenEnd),i,r});
      }
      const endingCueStart=seconds(cursor);chunks.push(end);cursor+=endSamples;
      const key=`cards/${id}/pause-${ratio.toFixed(1).replace('.','_')}.mp3`,file=path.join(release,key);
      encode(Buffer.concat(chunks),file);
      const decoded=pcm(file),durationSeconds=seconds(decoded.length/2);
      if(durationSeconds>limit||Math.abs(durationSeconds-seconds(cursor))>.06)throw Error('Duration failure '+id+'/'+ratio+' '+durationSeconds);
      const media=record(file,key);uploads.push({file,key:base.slice('https://audio.talktag.co.kr/'.length)+key,...media});
      variants.push({ratio,...media,durationSeconds,endingCueStart,cues,measuredSpeech});
    }
    const defaultVariant=variants.find(row=>row.ratio===2.5),first=sentenceStart,last=first+group.length-1;
    const durationLabel=`${Math.floor(defaultVariant.durationSeconds/60)}:${String(Math.floor(defaultVariant.durationSeconds%60)).padStart(2,'0')}`;
    catalog.push({id,language:'ko',type:'guided',format:'scene-dialogue',level:lesson.level,part:Number(lesson.episode),chapter:part+1,unit:Number(lesson.episode),episode:lesson.episode,title:lesson.title,nativeTitle:lesson.nativeTitle,description:lesson.expectedOutput,summary:'Listen and repeat, one line at a time.',briefing:lesson.learnerInput,scene:lesson.situation,artwork:'/assets/glr-scenes/native-001-a1.webp',durationLabel,durationLong:durationLabel,audio:defaultVariant.audio,audioRevision:defaultVariant.sha256.slice(0,16),sourceFilename:path.basename(new URL(defaultVariant.audio).pathname),accentTag:'KR',voiceName:'Min-joon / Leejin',speakers:group.map(row=>row.speaker),protocolVersion:4,contentRevision:'ko-a2-c2-005-010-20261026',available:false,partIndex:part+1,partCount:groups.length,sentenceStart:first,sentenceEnd:last,expressions:group.map(row=>row.ko),meanings:group.map(row=>row.en),englishMeanings:group.map(row=>row.en),training:{kind:'sentence-repeat',defaultReps:reps,silenceMultiplier:2.5,minimumGapSeconds:3,startCueEnd:seconds(startSamples),endingCueStart:defaultVariant.endingCueStart,cardDings:true,durationSeconds:defaultVariant.durationSeconds,cues:defaultVariant.cues}});
    variantCards.push({id,episode:lesson.episode,level:lesson.level,title:lesson.title,repetitions:reps,partIndex:part+1,partCount:groups.length,sentenceStart:first,sentenceEnd:last,lines:group.map(row=>({text:row.ko,meaning:row.en,...row.publicLine})),variants});
    sentenceStart=last+1;
    console.log(`${id}: ${group.length} lines × ${reps} repetitions, max ${variants.at(-1).durationSeconds.toFixed(1)}s`);
  }
}
const manifest={version:1,releaseBase:base,pauseRatios:ratios,minimumPauseSeconds:3,publicationReady:false,cards:variantCards};
fs.writeFileSync(path.join(work,'variants-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(work,'draft-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(work,'upload-inventory.json'),JSON.stringify(uploads,null,2)+'\n');
console.log(`BUILT LOCAL DRAFT: ${catalog.length} split cards, ${uploads.length} immutable MP3 objects. Publication remains disabled.`);
