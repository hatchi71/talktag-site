import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-002');
const manifest=JSON.parse(fs.readFileSync(path.join(work,'assembled-manifest.json')));
const output=path.join(work,'live');fs.mkdirSync(output,{recursive:true});
const results=[];
for(let index=0;index<manifest.length;index+=3){
 await Promise.all(manifest.slice(index,index+3).map(async record=>{
  const response=await fetch(record.card.audio,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(record.card.id+' HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  if(sha256!==record.sha256)throw Error(record.card.id+' published bytes differ from QC file');
  const file=path.join(output,record.card.id+'.mp3');fs.writeFileSync(file,bytes);
  const seconds=Number(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file]).toString());
  if(Math.abs(seconds-record.seconds)>.01)throw Error(record.card.id+' duration mismatch');
  for(const [s,e] of [[0,4095],[bytes.length-4096,bytes.length-1]]){
   const range=await fetch(record.card.audio,{headers:{Range:'bytes='+s+'-'+e},signal:AbortSignal.timeout(30000)});
   const sample=Buffer.from(await range.arrayBuffer());
   if(range.status!==206||!sample.equals(bytes.subarray(s,e+1)))throw Error(record.card.id+' range playback mismatch');
  }
  results.push({id:record.card.id,url:record.card.audio,sha256,bytes:bytes.length,seconds,fullDownload:'PASS',firstAndLastRanges:'PASS'});
  console.log('PASS public audio',record.card.id,seconds.toFixed(2)+'s');
 }));
}
fs.writeFileSync(path.join(work,'r2-verification.json'),JSON.stringify(results,null,2)+'\n');
