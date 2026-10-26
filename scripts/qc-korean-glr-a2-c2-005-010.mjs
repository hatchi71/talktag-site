#!/usr/bin/env node
// Technical audio QC only. This does not assert that Korean pronunciation has been listened to.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {processFile, decideFile, DEFAULT_PATHS} from '/Users/eungjukim/Desktop/TalkTag Audio QC Studio/lib/qc-engine.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-a2-c2-005-010');
const config=JSON.parse(fs.readFileSync(path.join(root,'content/native-glr-ko-a2-c2-005-010.source.json'),'utf8'));
if(config.status!=='script-draft-not-for-publication'||config.lessons.length!==30)throw Error('Unexpected Korean GLR production source');
DEFAULT_PATHS.workingDir=path.join(work,'studio-working');
const inputDir=path.join(work,'lines');
const approved=path.join(work,'approved-lines');
const report=[];
for(const card of config.lessons){
  for(let index=0;index<card.lines.length;index++){
    const line=card.lines[index];
    const name=`${card.level.toLowerCase()}-${card.episode}-${String(index+1).padStart(2,'0')}-${line.speaker}.mp3`;
    const source=path.join(inputDir,name);
    if(!fs.existsSync(source))throw Error('Missing source audio '+name);
    let result=await processFile({inputDir,outputDir:approved,name,normalizeDualMono:false,measureAfterHighpass:true});
    let metrics=result.output.metrics;
    if(metrics.inputLufs < -17){
      result=await processFile({inputDir,outputDir:approved,name,normalizeDualMono:false,measureAfterHighpass:true,outputGainDb:-15.6-metrics.inputLufs});
      metrics=result.output.metrics;
    }
    const pass=result.output.assessment.grade==='pass'&&Math.abs(metrics.inputLufs+16)<=1.2&&metrics.inputTruePeak<=-1&&metrics.channels===1&&metrics.sampleRate===48000&&metrics.duration>=0.8;
    const output=pass?await decideFile({assetId:path.basename(name,'.mp3'),decision:'processed',note:'Technical QC passed; auditory/pronunciation review not performed.',outputDir:approved}):null;
    report.push({cardId:card.id,level:card.level,episode:card.episode,line:index+1,speaker:line.speaker,expected:line.ko,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),technicalPass:pass,auditoryReviewed:false,metrics,output:output?.destination??null});
    console.log(`${card.id} ${index+1}/${card.lines.length}: ${pass?'TECHNICAL PASS':'TECHNICAL FAIL'}`);
  }
}
fs.writeFileSync(path.join(work,'technical-qc.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Technical QC ${report.filter(x=>x.technicalPass).length}/${report.length} lines passed.`);
if(report.some(x=>!x.technicalPass))process.exitCode=1;
