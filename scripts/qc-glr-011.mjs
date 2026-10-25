#!/usr/bin/env node
// Technical QC for the decoded final English GLR 011 media.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.env.TALKTAG_GLR011_WORKDIR||'/private/tmp/talktag-glr011';
const cards=JSON.parse(fs.readFileSync(`${root}/final/manifest.json`,'utf8')).cards;
const rate=48000;
function decode(file){const p=spawnSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1'],{encoding:null,maxBuffer:1024*1024*1024});if(p.status!==0)throw Error(String(p.stderr));return p.stdout;}
function rms(pcm,a,b){const lo=Math.max(0,Math.floor(a*rate)),hi=Math.min(pcm.length/2,Math.ceil(b*rate));let sum=0;for(let i=lo;i<hi;i++){const v=pcm.readInt16LE(i*2)/32768;sum+=v*v;}return Math.sqrt(sum/Math.max(hi-lo,1));}
const report=[];
for(const card of cards){
  const pcm=decode(card.localFile),audioSeconds=pcm.length/2/rate,t=card.training,cues=t.cues;
  assert(card.bytes===fs.statSync(card.localFile).size,card.id+' byte mismatch');
  assert(Math.abs(audioSeconds-t.durationSeconds)<0.08,card.id+' measured duration mismatch');
  assert(audioSeconds<=(/^C/.test(card.level)?900:600),card.id+' too long');
  assert.equal(card.expressions.length,card.meanings.length,card.id+' bilingual mismatch');
  assert.equal(cues.length,card.expressions.length*t.defaultReps,card.id+' repetition mismatch');
  assert(rms(pcm,0,t.startCueEnd)>0.003,card.id+' opening ding inaudible');
  assert(rms(pcm,t.endingCueStart,t.durationSeconds)>0.003,card.id+' closing ding inaudible');
  let minGap=Infinity,maxSilenceRms=0,minSpeechRms=Infinity;
  cues.forEach((c,n)=>{
    assert.equal(c.i,Math.floor(n/t.defaultReps),card.id+' line order');
    assert.equal(c.r,n%t.defaultReps+1,card.id+' repetition order');
    assert(c.s>=t.startCueEnd-.05&&c.voiceEnd>c.s&&c.e>c.voiceEnd,card.id+' cue order');
    const voiceLength=c.voiceEnd-c.s,gap=c.e-c.voiceEnd;
    assert(gap>=Math.max(voiceLength*2.5,3)-.01,card.id+' insufficient response gap');
    minGap=Math.min(minGap,gap);
    const voiceRms=rms(pcm,c.s+.1,Math.max(c.s+.11,c.voiceEnd-.1));
    minSpeechRms=Math.min(minSpeechRms,voiceRms);
    const silenceRms=rms(pcm,c.voiceEnd+.25,c.e-.25);
    maxSilenceRms=Math.max(maxSilenceRms,silenceRms);
    assert(voiceRms>0.002,card.id+' silent voice '+n);
    assert(silenceRms<0.003,card.id+' non-silent practice gap '+n);
  });
  report.push({id:card.id,durationSeconds:Number(audioSeconds.toFixed(3)),repetitions:cues.length,minGap:Number(minGap.toFixed(3)),maxSilenceRms:Number(maxSilenceRms.toFixed(6)),minSpeechRms:Number(minSpeechRms.toFixed(6)),startDingRms:Number(rms(pcm,0,t.startCueEnd).toFixed(6)),endDingRms:Number(rms(pcm,t.endingCueStart,t.durationSeconds).toFixed(6)),sha256:card.sha256});
}
fs.writeFileSync(`${root}/final/qc-report.json`,JSON.stringify({status:'technical-pass',cards:report},null,2)+'\n');
console.log('PASS '+report.length+' cards; '+report.map(x=>`${x.id} ${x.durationSeconds}s gap>=${x.minGap}s`).join('; '));
