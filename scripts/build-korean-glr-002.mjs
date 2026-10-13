import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {processFile, decideFile, DEFAULT_PATHS} from '/Users/eungjukim/Desktop/TalkTag Audio QC Studio/lib/qc-engine.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WORK=path.join(ROOT,'_local-audio/korean-glr-002');
DEFAULT_PATHS.workingDir=path.join(WORK,'studio-working');
const LOCAL='/Users/eungjukim/Desktop/Snowbaling자료작업실/1. TakTag 자료실/Korean/1. Korean Sound Check/1. Guided Listen & Repeat/002 Korean (Min-joon-Leejin)';
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'content/native-glr-ko-002.json'),'utf8'));
const speechReview=JSON.parse(fs.readFileSync(path.join(WORK,'speech-review.json'),'utf8'));
for(const card of config.cards)for(let i=0;i<card.lines.length;i++){
 const line=card.lines[i],source=path.join(WORK,'raw',card.level,`${String(i+1).padStart(2,'0')}-${line.speaker}.mp3`);
 const reviewed=speechReview.find(r=>r.level===card.level&&r.line===i+1);
 if(!reviewed?.passed||reviewed.expected!==line.ko||reviewed.sourceSha256!==crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'))throw Error('Missing or stale transcript approval '+card.level+'/'+(i+1));
}
const RATE=48000;
function run(tool,args){return execFileSync('/opt/homebrew/bin/'+tool,args,{maxBuffer:250e6});}
function pcm(file){return run('ffmpeg',['-v','error','-i',file,'-ac','1','-ar',String(RATE),'-f','s16le','-']);}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function trim(source){
 const count=source.length/2,block=480;let first=-1,last=-1;
 for(let i=0;i<count;i+=block){let sum=0,n=0;for(let j=i;j<Math.min(count,i+block);j++){sum+=source.readInt16LE(j*2)**2;n++;}if(Math.sqrt(sum/n)>=100){if(first<0)first=i;last=i+n;}}
 if(first<0)throw Error('No speech in line');
 const left=Math.max(0,first-3840),right=Math.min(count,last+5760);
 return {bytes:Buffer.from(source.subarray(left*2,right*2)),trimStart:left/RATE,trimEnd:right/RATE};
}
const manifest=[],qc=[],localPlans=[];
for(const card of config.cards){
 const stem=`002 ${card.title} ${card.level} (Korean) Min-joon-Leejin`;
 const folder=path.join(LOCAL,stem);
 for(const sub of ['01 Scripts','02 TTS Original','03 QC','04 Training Cards','05 Artwork'])fs.mkdirSync(path.join(folder,sub),{recursive:true});
 const plan={...card,episode:2,voice:'Min-joon / Leejin',folder,filename:stem};localPlans.push(plan);
 fs.writeFileSync(path.join(folder,'01 Scripts',stem+'.txt'),card.lines.map(l=>l.ko).join('\n')+'\n');
 fs.writeFileSync(path.join(folder,'01 Scripts',stem+' EN.txt'),card.lines.map(l=>l.en).join('\n')+'\n');
 writeJson(path.join(folder,'01 Scripts',stem+' metadata.json'),{...plan,voices:config.voices,references:config.references,register:config.register});
 const lines=[];
 for(let i=0;i<card.lines.length;i++){
  const line=card.lines[i],name=`${stem} L${String(i+1).padStart(2,'0')} ${line.speaker}.mp3`;
  const inputDir=path.join(folder,'02 TTS Original'),outputDir=path.join(folder,'03 QC');
  const input=path.join(inputDir,name);
  if(!fs.existsSync(input))fs.copyFileSync(path.join(WORK,'raw',card.level,`${String(i+1).padStart(2,'0')}-${line.speaker}.mp3`),input);
  let report=await processFile({inputDir,outputDir,name,normalizeDualMono:false,measureAfterHighpass:true});
  let metrics=report.output.metrics;
  if(metrics.inputLufs < -17){report=await processFile({inputDir,outputDir,name,normalizeDualMono:false,measureAfterHighpass:true,outputGainDb:-16.6-metrics.inputLufs});metrics=report.output.metrics;}
  if(Math.abs(metrics.inputLufs+16)>1.2||metrics.inputTruePeak>-1||metrics.channels!==1||metrics.sampleRate!==RATE)throw Error('Speech QC failed '+card.level+'/'+(i+1)+' '+JSON.stringify(metrics));
  const approved=await decideFile({assetId:report.assetId,decision:'processed',outputDir,note:'Independent utterance recording; technical speech QC passed. Transcript audit recorded locally.'});
  const file=path.join(outputDir,approved.previewFile),trimmed=trim(pcm(file));
  const seconds=trimmed.bytes.length/(2*RATE),gapSeconds=Math.max(3,2.5*seconds)+.25;
  lines.push({...line,index:i,pcm:trimmed.bytes,seconds,gapSeconds});
  qc.push({level:card.level,line:i+1,speaker:line.speaker,input,file,metrics,speechSeconds:seconds,gapSeconds,trimStart:trimmed.trimStart,trimEnd:trimmed.trimEnd});
  console.log('Speech QC',card.level,i+1,seconds.toFixed(2)+'s',metrics.inputLufs+' LUFS');
 }
 const reps=card.level[0]==='A'?10:card.level[0]==='B'?15:21;
 const start=pcm('/Users/eungjukim/Desktop/TEMP/Start.mp3'),ending=pcm('/Users/eungjukim/Desktop/TEMP/Ending.mp3');
 const dingSeconds=(start.length+ending.length)/(2*RATE),limit=card.level[0]==='C'?900:600;
 const options=[];
 function partition(index,groups){if(index===lines.length){const seconds=groups.map(g=>dingSeconds+g.reduce((n,l)=>n+(l.seconds+l.gapSeconds)*reps,0));const mean=seconds.reduce((a,b)=>a+b,0)/seconds.length;options.push({groups,score:seconds.reduce((s,x)=>s+(x-mean)**2,0)});return;}let g=[],duration=dingSeconds;for(let j=index;j<lines.length;j++){duration+=(lines[j].seconds+lines[j].gapSeconds)*reps;if(duration>limit-.15)break;g.push(lines[j]);partition(j+1,[...groups,[...g]]);}}
 partition(0,[]);options.sort((a,b)=>a.groups.length-b.groups.length||a.score-b.score);if(!options.length)throw Error('Complete repetition cycle too long '+card.level);
 const groups=options[0].groups;
 for(let p=0;p<groups.length;p++){
  const group=groups[p],id=`ko-guided-${card.level.toLowerCase()}-002`+(p?'-part'+(p+1):'');
  const chunks=[start],cues=[];let samples=start.length/2;
  for(let i=0;i<group.length;i++){const l=group[i],gap=Buffer.alloc(Math.ceil(l.gapSeconds*RATE)*2);for(let r=1;r<=reps;r++){const s=samples/RATE;chunks.push(l.pcm);samples+=l.pcm.length/2;const voiceEnd=samples/RATE;chunks.push(gap);samples+=gap.length/2;cues.push({s:+s.toFixed(5),voiceEnd:+voiceEnd.toFixed(5),e:+(samples/RATE).toFixed(5),i,r});}}
  const endingCueStart=samples/RATE;chunks.push(ending);samples+=ending.length/2;
  const filename=`SC-GLR-002-${card.level}-Korean-${card.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}-Part-${String(p+1).padStart(2,'0')}-KR-Min-joon-Leejin.mp3`;
  const raw=path.join(WORK,id+'.pcm'),file=path.join(folder,'04 Training Cards',filename);fs.writeFileSync(raw,Buffer.concat(chunks));
  run('ffmpeg',['-v','error','-y','-f','s16le','-ar',String(RATE),'-ac','1','-i',raw,'-c:a','libmp3lame','-b:a','128k','-metadata','artist=TalkTag','-metadata','album=Korean Sound Check GLR 002',file]);
  const seconds=Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file]).toString());if(seconds>limit||Math.abs(seconds-samples/RATE)>.1)throw Error('Card duration failed '+id);
  const decoded=pcm(file);for(const q of cues){const minimum=Math.max(3,2.5*(q.voiceEnd-q.s));if(q.e-q.voiceEnd<minimum+.20)throw Error('Short response gap '+id);const left=Math.round((q.voiceEnd+.12)*RATE),right=Math.round((q.e-.12)*RATE);let sum=0;for(let i=left;i<right;i++)sum+=decoded.readInt16LE(i*2)**2;if(Math.sqrt(sum/(right-left))>100)throw Error('Non-silent response gap '+id);}
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),key='Korean/guided/20261013-002/'+filename;
  const duration=Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
  const record={id,language:'ko',type:'guided',format:'scene-dialogue',level:card.level,part:2,chapter:p+1,unit:2,episode:'002',title:card.title,nativeTitle:card.nativeTitle,description:card.description,summary:'Listen and repeat, one line at a time.',briefing:card.briefing,scene:card.scene,artwork:'/assets/glr-scenes/ko-002-'+card.level.toLowerCase()+'.webp',durationLabel:duration,durationLong:duration,audio:'https://audio.talktag.co.kr/'+key+'?v='+hash.slice(0,16),audioRevision:hash.slice(0,16),sourceFilename:filename,accentTag:'KR',voiceName:'Min-joon / Leejin',speakers:group.map(l=>l.speaker),protocolVersion:card.level[0]==='C'?3:2,contentRevision:config.revision,available:true,partIndex:p+1,partCount:groups.length,sentenceStart:group[0].index+1,sentenceEnd:group.at(-1).index+1,expressions:group.map(l=>l.ko),meanings:group.map(l=>l.en),englishMeanings:group.map(l=>l.en),training:{kind:'sentence-repeat',defaultReps:reps,silenceMultiplier:2.5,minimumGapSeconds:3,startCueEnd:start.length/(2*RATE),endingCueStart,cardDings:true,durationSeconds:seconds,cues}};
  writeJson(path.join(folder,'04 Training Cards',id+'.json'),record);manifest.push({file,key,sha256:hash,seconds,card:record});console.log('Assembled',id,duration,group.length+' lines × '+reps);
 }
}
writeJson(path.join(WORK,'qc-summary.json'),qc);writeJson(path.join(WORK,'assembled-manifest.json'),manifest);writeJson(path.join(LOCAL,'002 Korean production plan.json'),localPlans);
fs.writeFileSync(path.join(ROOT,'native-guided-ko-002.js'),'/* Original Korean GLR 002; independently generated lines, measured gaps and versioned audio. */\n(function(){window.TalkTagNativeCatalogs=window.TalkTagNativeCatalogs||{};window.TalkTagNativeCatalogs.ko=(window.TalkTagNativeCatalogs.ko||[]).concat('+JSON.stringify(manifest.map(r=>r.card))+');})();\n');
