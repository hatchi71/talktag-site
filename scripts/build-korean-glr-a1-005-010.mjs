#!/usr/bin/env node
// Assemble approved-voice Korean A1 lines into sample-timed GLR cards.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/native-glr-ko-a1-005-010.source.json'),'utf8'));
const work=path.join(root,'_local-audio/korean-glr-a1-005-010');
const release=path.join(work,'release');
const rate=48000, ratios=[2,2.5,3,3.5], reps=10;
const ffmpeg='/opt/homebrew/bin/ffmpeg';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const seconds=samples=>+(samples/rate).toFixed(6);
function run(args,input){const r=spawnSync(ffmpeg,args,{input,maxBuffer:250e6});if(r.error||r.status!==0)throw Error('ffmpeg failed: '+(r.error?.message||String(r.stderr).slice(-500)));return r.stdout;}
function pcm(file){return run(['-v','error','-nostdin','-i',file,'-ac','1','-ar',String(rate),'-f','s16le','pipe:1']);}
function encode(bytes,file){fs.mkdirSync(path.dirname(file),{recursive:true});run(['-v','error','-nostdin','-y','-f','s16le','-ar',String(rate),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','128k',file],bytes);}
function active(bytes){const count=bytes.length/2,frame=480;let first=-1,last=-1;for(let start=0;start<count;start+=frame){let sum=0,n=0;for(let i=start;i<Math.min(count,start+frame);i++){sum+=bytes.readInt16LE(i*2)**2;n++;}if(Math.sqrt(sum/n)>=100){if(first<0)first=start;last=start+n;}}if(first<0)throw Error('Silent utterance');return {first,last};}
const start=pcm('/Users/eungjukim/Desktop/TEMP/Start.mp3');
const end=pcm('/Users/eungjukim/Desktop/TEMP/Ending.mp3');
const startSamples=start.length/2,endSamples=end.length/2;
const catalog=[],variantCards=[],uploads=[],qc=[];
for(const lesson of source.lessons){
  const ep=lesson.episode,base=`https://audio.talktag.co.kr/Korean/guided/20261024-${ep}/`;
  const media=(file,key)=>{const sha256=hash(file);return {audio:base+key+'?v='+sha256.slice(0,16),sha256,bytes:fs.statSync(file).size};};
  const lines=lesson.lines.map((line,i)=>{
    const file=path.join(work,'raw',`a1-${ep}-line${String(i+1).padStart(2,'0')}.mp3`);
    if(!fs.existsSync(file))throw Error('Missing line '+ep+'/'+(i+1));
    const decoded=pcm(file),range=active(decoded),from=Math.max(0,range.first-3840),to=Math.min(decoded.length/2,range.last+5760);
    const clip=Buffer.from(decoded.subarray(from*2,to*2));
    const key=`lines/a1-${String(i+1).padStart(2,'0')}-${line.speaker}.mp3`,out=path.join(release,ep,key);
    encode(clip,out);const publicLine=media(out,key);
    uploads.push({file:out,key:`Korean/guided/20261024-${ep}/${key}`,...publicLine});
    const voiceStart=range.first-from,voiceEnd=range.last-from;
    qc.push({episode:ep,line:i+1,speaker:line.speaker,expected:line.ko,rawSha256:hash(file),rawSeconds:seconds(decoded.length/2),voiceSeconds:seconds(voiceEnd-voiceStart),peak:Math.max(...Array.from({length:clip.length/2},(_,j)=>Math.abs(clip.readInt16LE(j*2))).filter((_,j)=>j%2400===0))});
    return {...line,clip,voiceStart,voiceEnd,samples:clip.length/2,publicLine};
  });
  const id=`ko-guided-a1-${ep}`,variants=[];
  for(const ratio of ratios){
    const cues=[],measuredSpeech=[],chunks=[start];let cursor=startSamples;
    for(let i=0;i<lines.length;i++)for(let r=1;r<=reps;r++){
      const line=lines[i],next=i+1<lines.length?lines[i+(r===reps?1:0)]:line;
      const cueStart=cursor,spokenStart=cursor+line.voiceStart,spokenEnd=cursor+line.voiceEnd;
      chunks.push(line.clip);cursor+=line.samples;
      const target=Math.max(3*rate,Math.round((line.voiceEnd-line.voiceStart)*ratio));
      const trailing=line.samples-line.voiceEnd,leading=(r===reps&&i+1<lines.length?next.voiceStart:line.voiceStart);
      const gap=Math.max(0,target-trailing-leading+Math.round(.12*rate));
      chunks.push(Buffer.alloc(gap*2));cursor+=gap;
      cues.push({s:seconds(cueStart),voiceEnd:seconds(spokenEnd),e:seconds(cursor),i,r});
      measuredSpeech.push({start:seconds(spokenStart),end:seconds(spokenEnd),i,r});
    }
    const endingCueStart=seconds(cursor);chunks.push(end);cursor+=endSamples;
    const key=`cards/${id}/pause-${ratio.toFixed(1).replace('.','_')}.mp3`,out=path.join(release,ep,key);
    encode(Buffer.concat(chunks),out);
    const durationSeconds=seconds(pcm(out).length/2);
    if(Math.abs(durationSeconds-seconds(cursor))>.07||durationSeconds>600)throw Error('Duration failed '+ep+'/'+ratio);
    const rec=media(out,key);uploads.push({file:out,key:`Korean/guided/20261024-${ep}/${key}`,...rec});
    variants.push({ratio,...rec,durationSeconds,endingCueStart,cues,measuredSpeech});
  }
  const d=variants.find(v=>v.ratio===2.5),durationLabel=`${Math.floor(d.durationSeconds/60)}:${String(Math.floor(d.durationSeconds%60)).padStart(2,'0')}`;
  catalog.push({id,language:'ko',type:'guided',format:'scene-dialogue',level:'A1',part:Number(ep),chapter:1,unit:Number(ep),episode:ep,title:lesson.title,nativeTitle:lesson.nativeTitle,description:lesson.expectedOutput,summary:'Listen and repeat, one line at a time.',briefing:lesson.learnerInput,scene:lesson.concreteSituation,artwork:'/assets/glr-scenes/native-001-a1.webp',durationLabel,durationLong:durationLabel,audio:d.audio,audioRevision:d.sha256.slice(0,16),sourceFilename:path.basename(new URL(d.audio).pathname),accentTag:'KR',voiceName:'Min-joon / Leejin',speakers:lines.map(x=>x.speaker),protocolVersion:4,contentRevision:'20261024-a1-005-010',available:true,partIndex:1,partCount:1,sentenceStart:1,sentenceEnd:lines.length,expressions:lines.map(x=>x.ko),meanings:lines.map(x=>x.en),englishMeanings:lines.map(x=>x.en),training:{kind:'sentence-repeat',defaultReps:reps,silenceMultiplier:2.5,minimumGapSeconds:3,startCueEnd:seconds(startSamples),endingCueStart:d.endingCueStart,cardDings:true,durationSeconds:d.durationSeconds,cues:d.cues}});
  variantCards.push({id,episode:ep,level:'A1',title:lesson.title,repetitions:reps,partIndex:1,partCount:1,sentenceStart:1,sentenceEnd:lines.length,lines:lines.map(x=>({text:x.ko,meaning:x.en,...x.publicLine})),variants});
  console.log(`${id}: ${lines.length} lines × ${reps}, max ${variants.at(-1).durationSeconds.toFixed(1)}s`);
}
fs.writeFileSync(path.join(root,'native-guided-ko-005-010.js'),`(function(){window.TalkTagNativeCatalogs=window.TalkTagNativeCatalogs||{};window.TalkTagNativeCatalogs.ko=(window.TalkTagNativeCatalogs.ko||[]).concat(${JSON.stringify(catalog)});})();\n`);
fs.writeFileSync(path.join(root,'native-guided-ko-005-010-variants.js'),`(function(){const patch=${JSON.stringify(variantCards)};const manifest=window.TalkTagKoreanGuidedVariants;if(!manifest?.cards)throw Error('Korean base variant catalog missing');manifest.cards.push(...patch);})();\n`);
fs.writeFileSync(path.join(work,'manifest.json'),JSON.stringify({cards:variantCards,pauseRatios:ratios},null,2)+'\n');
fs.writeFileSync(path.join(work,'upload-inventory.json'),JSON.stringify(uploads,null,2)+'\n');
fs.writeFileSync(path.join(work,'source-qc.json'),JSON.stringify(qc,null,2)+'\n');
console.log(`READY: ${catalog.length} cards; ${uploads.length} audio files.`);
