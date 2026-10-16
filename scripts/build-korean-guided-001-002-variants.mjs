#!/usr/bin/env node
// Assemble Korean GLR 001/002 from the existing isolated, QC-processed lines.
// This never calls a speech service or changes the published source recordings.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputRoot=path.join(repo,'audio/korean/guided/segments-001-002');
const releaseBase='https://audio.talktag.co.kr/Korean/guided/segments-001-002/v1-20261016/';
const rate=48000, ratios=[2,2.5,3,3.5], silence=Buffer.alloc(rate*2);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const samples=pcm=>pcm.length/2;
const sec=n=>Number((n/rate).toFixed(6));
const suffix=ratio=>ratio.toFixed(1).replace('.','_');
const splitRanges={
  '001/B1':[[1,2],[3,4]],
  '002/B1':[[1,2],[3,3],[4,6]],
  '002/B2':[[1,2],[3,3],[4,5],[6,6]]
};
function plannedCards(episode,level,original){
  const ranges=splitRanges[`${episode}/${level}`];
  if(!ranges)return original.map(item=>({...item,legacyCardId:item.id,
    legacySentenceStart:1,legacySentenceEnd:item.expressions.length}));
  const base=original[0].id.replace(/-part\d+$/,'');
  const total=Math.max(...original.map(item=>item.sentenceEnd));
  if(ranges[0][0]!==1||ranges.at(-1)[1]!==total||
      ranges.some(([first,last],index)=>first>last||index>0&&first!==ranges[index-1][1]+1))
    throw Error(`Incomplete Korean GLR split plan ${episode}/${level}`);
  return ranges.map(([first,last],index)=>{
    const prior=original.find(item=>item.sentenceStart<=first&&item.sentenceEnd>=last);
    if(!prior)throw Error(`Split crosses an old card ${episode}/${level}/${first}-${last}`);
    const from=first-prior.sentenceStart,to=last-prior.sentenceStart+1;
    return {...prior,id:index?`${base}-part${index+1}`:base,
      partIndex:index+1,partCount:ranges.length,sentenceStart:first,sentenceEnd:last,
      expressions:prior.expressions.slice(from,to),meanings:prior.meanings.slice(from,to),
      englishMeanings:prior.englishMeanings?.slice(from,to),speakers:prior.speakers?.slice(from,to),
      legacyCardId:prior.id,legacySentenceStart:from+1,legacySentenceEnd:to};
  });
}

function run(command,args){
  const result=spawnSync(command,args,{encoding:null,maxBuffer:128*1024*1024});
  if(result.error||result.status!==0)throw Error(`${command}: ${result.error?.message||String(result.stderr).slice(-1200)}`);
  return result.stdout;
}
function decode(file){
  if(!fs.existsSync(file))throw Error(`Missing source ${file}`);
  return run('ffmpeg',['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1']);
}
function activeRange(pcm){
  const frame=480, data=new Int16Array(pcm.buffer,pcm.byteOffset,pcm.length/2);
  let first=-1,last=-1;
  for(let offset=0;offset<data.length;offset+=frame){
    const end=Math.min(data.length,offset+frame);
    let sum=0;
    for(let i=offset;i<end;i++)sum+=data[i]*data[i];
    if(Math.sqrt(sum/(end-offset))/32768>=0.001){if(first<0)first=offset;last=end;}
  }
  if(first<0||last<=first)throw Error('Isolated line has no audible signal');
  return {first,last};
}
function writeSilence(fd,count){
  if(count<0)throw Error(`Negative speaking pause ${count}`);
  for(let left=count;left>0;){const n=Math.min(left,rate);fs.writeSync(fd,silence,0,n*2);left-=n;}
}
function encode(raw,output){
  fs.mkdirSync(path.dirname(output),{recursive:true});
  run('ffmpeg',['-v','error','-nostdin','-y','-f','s16le','-ar',String(rate),'-ac','1','-i',raw,
    '-map_metadata','-1','-id3v2_version','3','-codec:a','libmp3lame','-q:a','4',output]);
}
function manifestRecord(output,relative){
  const digest=sha(output);
  return {audio:`${releaseBase}${relative}?v=${digest.slice(0,12)}`,sha256:digest,bytes:fs.statSync(output).size};
}
function catalog(){
  const context={window:{}};
  for(const file of ['native-guided-data.js','native-guided-ko-002.js'])
    vm.runInNewContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
  return context.window.TalkTagNativeCatalogs.ko;
}
function sourceRoot001(){
  const parent='/Users/eungjukim/Desktop/Snowbaling자료작업실';
  const talktag=fs.readdirSync(parent).find(name=>name.startsWith('1. TalkTag')&&name.includes('자료'));
  if(!talktag)throw Error('Corrected TalkTag materials folder is missing');
  return path.join(parent,talktag,'Korean','1. Korean Sound Check','1. Guided Listen & Repeat','001 Korean (Min-joon)');
}
function sources001(lessons){
  const root=sourceRoot001(),result={};
  for(const folder of fs.readdirSync(root,{withFileTypes:true}).filter(item=>item.isDirectory())){
    const match=folder.name.match(/\b(A1|A2|B1|B2|C1|C2)\b/);
    if(!match)continue;
    const level=match[1],dir=path.join(root,folder.name,'04 Training Cards');
    const lineCount=lessons.filter(item=>item.level===level&&item.unit===1)
      .reduce((highest,item)=>Math.max(highest,item.sentenceEnd),0);
    const files=Array.from({length:lineCount},(_,i)=>path.join(dir,`sentence-${i+1}.wav`));
    if(result[level]||files.some(file=>!fs.existsSync(file)))throw Error(`Incomplete Korean GLR 001 isolates: ${level}`);
    result[level]=files;
  }
  if(Object.keys(result).length!==6)throw Error('Expected six Korean GLR 001 level source folders');
  return result;
}
function sources002(){
  const raw=JSON.parse(fs.readFileSync(path.join(repo,'_local-audio/korean-glr-002/speech-review.json'),'utf8'));
  const qc=JSON.parse(fs.readFileSync(path.join(repo,'_local-audio/korean-glr-002/qc-summary.json'),'utf8'));
  if(raw.length!==28||qc.length!==28||raw.some(item=>!item.passed))throw Error('GLR 002 transcript/QC audit is incomplete');
  const result={};
  for(const entry of qc){
    const review=raw.find(item=>item.level===entry.level&&item.line===entry.line);
    const source=path.join(repo,'_local-audio/korean-glr-002/studio-working/preview',path.basename(entry.file));
    if(!review||!fs.existsSync(source)||review.sourceSha256!==sha(review.source))
      throw Error(`GLR 002 reviewed source mismatch ${entry.level}/${entry.line}`);
    result[entry.level]??=[];
    result[entry.level][entry.line-1]={file:source,text:review.expected,speaker:entry.speaker,sourceSha256:sha(source)};
  }
  return result;
}
function isolated(file){
  const original=decode(file),active=activeRange(original);
  const start=Math.max(0,active.first-Math.round(rate*0.08));
  const end=Math.min(samples(original),active.last+Math.round(rate*0.12));
  const pcm=Buffer.from(original.subarray(start*2,end*2));
  return {pcm,count:samples(pcm),voiceStart:active.first-start,voiceEnd:active.last-start,sourceSha256:sha(file)};
}

const lessons=catalog(),source001=sources001(lessons),source002=sources002();
const start=decode('/Users/eungjukim/Desktop/TEMP/Start.mp3');
const ending=decode('/Users/eungjukim/Desktop/TEMP/Ending.mp3');
const endingActive=activeRange(ending);
const lineSources={},cards=[],oversize=[];
fs.mkdirSync(outputRoot,{recursive:true});
for(const episode of ['001','002'])for(const level of ['A1','A2','B1','B2','C1','C2']){
  const matching=lessons.filter(item=>item.unit===Number(episode));
  const originalCards=matching.filter(item=>item.level===level);
  const levelCards=plannedCards(episode,level,originalCards);
  const totalLines=Math.max(...originalCards.map(item=>item.sentenceEnd));
  const approved=episode==='001'
    ?source001[level].map(file=>({file,sourceSha256:sha(file)}))
    :source002[level];
  if(!approved||approved.length!==totalLines)throw Error(`Isolated line count mismatch ${episode}/${level}`);
  const lines=approved.map((entry,index)=>{
    const pcm=isolated(entry.file);
    const pair=originalCards.flatMap(item=>item.expressions.map((text,i)=>({index:item.sentenceStart+i,text,meaning:item.meanings[i]})))
      .find(item=>item.index===index+1);
    if(!pair||entry.text&&entry.text!==pair.text)throw Error(`Published script/source transcript mismatch ${episode}/${level}/${index+1}`);
    return {...pcm,text:pair.text,meaning:pair.meaning,speaker:entry.speaker||'Min-joon'};
  });
  const exports=[];
  for(let i=0;i<lines.length;i++){
    const relative=`${episode}/${level.toLowerCase()}/line-${String(i+1).padStart(2,'0')}.mp3`;
    const output=path.join(outputRoot,relative);
    const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-glr-line-'));
    try{const raw=path.join(scratch,'line.pcm');fs.writeFileSync(raw,lines[i].pcm);encode(raw,output);}
    finally{fs.rmSync(scratch,{recursive:true,force:true});}
    exports.push({index:i+1,text:lines[i].text,meaning:lines[i].meaning,speaker:lines[i].speaker,
      sourceSha256:lines[i].sourceSha256,speechSeconds:sec(lines[i].voiceEnd-lines[i].voiceStart),
      ...manifestRecord(output,relative)});
  }
  lineSources[`${episode}/${level}`]=exports;
  for(const card of levelCards){
    const selected=lines.slice(card.sentenceStart-1,card.sentenceEnd);
    const reps=card.training.defaultReps;
    if(reps!==(level.startsWith('A')?10:level.startsWith('B')?15:21)||
      selected.length!==card.expressions.length||selected.some((line,i)=>line.text!==card.expressions[i]||line.meaning!==card.meanings[i]))
      throw Error(`Published repetitions/script mismatch ${card.id}`);
    const variants=[];
    for(const ratio of ratios){
      const relative=`${episode}/${card.id}/pause-${suffix(ratio)}.mp3`;
      const output=path.join(outputRoot,relative);
      const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'talktag-ko-glr-variant-'));
      const raw=path.join(scratch,'assembly.pcm');let fd;
      try{
        fd=fs.openSync(raw,'w');fs.writeSync(fd,start);
        let cursor=samples(start);
        const events=selected.flatMap((line,i)=>Array.from({length:reps},(_,r)=>({line,i,r:r+1})));
        const cues=[],measuredSpeech=[];
        for(let n=0;n<events.length;n++){
          const {line,i,r}=events[n],next=events[n+1];
          const clipStart=cursor,voiceStart=cursor+line.voiceStart,voiceEnd=cursor+line.voiceEnd;
          fs.writeSync(fd,line.pcm);cursor+=line.count;
          const target=Math.max(3*rate,Math.round((line.voiceEnd-line.voiceStart)*ratio));
          const currentTail=line.count-line.voiceEnd,nextLead=next?next.line.voiceStart:endingActive.first;
          const gap=target-currentTail-nextLead;
          writeSilence(fd,gap);cursor+=gap;
          cues.push({s:sec(clipStart),voiceEnd:sec(voiceEnd),e:sec(cursor),i,r});
          measuredSpeech.push({start:sec(voiceStart),end:sec(voiceEnd),i,r});
        }
        const endingCueStart=sec(cursor);
        fs.writeSync(fd,ending);cursor+=samples(ending);
        fs.closeSync(fd);fd=undefined;
        encode(raw,output);
        const decoded=decode(output),durationSeconds=sec(samples(decoded));
        if(Math.abs(samples(decoded)-cursor)>2304)throw Error(`Decoded duration mismatch ${card.id}/${ratio}`);
        const limit=level.startsWith('C')?900:600;
        if(durationSeconds>limit)oversize.push({id:card.id,ratio,durationSeconds,limit});
        variants.push({ratio,...manifestRecord(output,relative),durationSeconds,
          endingCueStart,endingToneLeadSeconds:sec(endingActive.first),cues,measuredSpeech,
          overDurationLimit:durationSeconds>limit});
      }finally{if(fd!==undefined)fs.closeSync(fd);fs.rmSync(scratch,{recursive:true,force:true});}
    }
    cards.push({id:card.id,episode,level,title:card.title,repetitions:reps,
      partIndex:card.partIndex,partCount:card.partCount,sentenceStart:card.sentenceStart,sentenceEnd:card.sentenceEnd,
      legacyCardId:card.legacyCardId,legacySentenceStart:card.legacySentenceStart,legacySentenceEnd:card.legacySentenceEnd,
      lines:selected.map((line,index)=>({text:line.text,meaning:line.meaning,
        audio:exports[card.sentenceStart-1+index].audio,
        bytes:exports[card.sentenceStart-1+index].bytes,
        sha256:exports[card.sentenceStart-1+index].sha256})),variants});
    console.log(`${card.id}: ${selected.length} lines × ${reps} reps, four pause variants`);
  }
}
const manifest={version:1,releaseBase,pauseRatios:ratios,minimumPauseSeconds:3,
  sourceRevisions:{'001':'001-20261010','002':'ko-002-20261013'},
  publicationReady:oversize.length===0,oversize,lineSources,cards,
  legacyMapping:Object.fromEntries([...new Set(cards.map(card=>card.legacyCardId))].map(id=>
    [id,cards.filter(card=>card.legacyCardId===id).map(card=>({id:card.id,
      legacySentenceStart:card.legacySentenceStart,legacySentenceEnd:card.legacySentenceEnd}))]))};
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(outputRoot,'manifest.js'),`window.TalkTagKoreanGuidedVariants = ${JSON.stringify(manifest)};\nwindow.TalkTagKoreanGuided001002Variants = window.TalkTagKoreanGuidedVariants;\n`);
function durationLabel(seconds){const whole=Math.round(seconds);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;}
const replacements=[];
for(const item of cards){
  const prior=lessons.find(lesson=>lesson.id===item.legacyCardId);
  const ratio=item.variants.find(variant=>variant.ratio===2.5);
  const updated={...prior,id:item.id,episode:item.episode,partIndex:item.partIndex,partCount:item.partCount,
    sentenceStart:item.sentenceStart,sentenceEnd:item.sentenceEnd,
    expressions:item.lines.map(line=>line.text),meanings:item.lines.map(line=>line.meaning),
    englishMeanings:item.lines.map((_,index)=>prior.englishMeanings?.[item.legacySentenceStart-1+index]??item.lines[index].meaning),
    speakers:prior.speakers?.slice(item.legacySentenceStart-1,item.legacySentenceEnd),
    legacyCardId:item.legacyCardId,legacySentenceStart:item.legacySentenceStart,
    legacySentenceEnd:item.legacySentenceEnd,audio:ratio.audio,audioRevision:ratio.sha256.slice(0,16),
    sourceFilename:path.basename(new URL(ratio.audio).pathname),protocolVersion:4,
    contentRevision:`ko-segments-001-002-v1-20261016`,durationLabel:durationLabel(ratio.durationSeconds),
    durationLong:durationLabel(ratio.durationSeconds),releaseDurationSeconds:ratio.durationSeconds,
    training:{...prior.training,silenceMultiplier:2.5,minimumGapSeconds:3,
      startCueEnd:sec(samples(start)),endingCueStart:ratio.endingCueStart,
      durationSeconds:ratio.durationSeconds,cues:ratio.cues}};
  replacements.push(updated);
}
const replacementJson=JSON.stringify(replacements);
const patch=`(function(){const root=window.TalkTagNativeCatalogs;if(!root?.ko)return;\n`+
  `const old=root.ko;window.TalkTagKoreanGuidedLegacyCatalog=old.filter(x=>x.language==='ko'&&x.type==='guided'&&Number(x.unit)<=2).map(x=>({...x,training:{...x.training,cues:x.training?.cues?.map(c=>({...c}))}}));\n`+
  `const replacements=${replacementJson};const groups=new Map();for(const entry of replacements){const list=groups.get(entry.legacyCardId)||[];list.push(entry);groups.set(entry.legacyCardId,list);}\n`+
  `root.ko=old.flatMap(entry=>groups.get(entry.id)||[entry]);window.TalkTagKoreanGuidedSplitVersion='v1-20261016';})();\n`;
fs.writeFileSync(path.join(repo,'native-guided-ko-splits.js'),patch);
console.log(`Built ${cards.length} cards, ${cards.length*4} ratio variants, ${Object.values(lineSources).reduce((n,part)=>n+part.length,0)} isolated lines.`);
if(oversize.length)console.warn(`NOT PUBLICATION READY: ${oversize.length} variants exceed their card duration cap:`,JSON.stringify(oversize));
