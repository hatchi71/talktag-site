#!/usr/bin/env node
// Decoded-media technical QC for all English/Korean A0 002–010 cards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/a0-002-010-scripts.json'),'utf8'));
const work=process.env.TALKTAG_LEVEL0_WORKDIR||'/private/tmp/talktag-level0-002-010';
const manifest=JSON.parse(fs.readFileSync(path.join(work,'final/manifest.json'),'utf8'));
const rate=48000;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function decode(file){const p=spawnSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1'],{encoding:null,maxBuffer:32*1024*1024});if(p.status!==0)throw Error(String(p.stderr));return p.stdout;}
function rms(pcm,a,b){const lo=Math.max(0,Math.floor(a*rate)),hi=Math.min(pcm.length/2,Math.ceil(b*rate));let sum=0;for(let i=lo;i<hi;i++){const v=pcm.readInt16LE(i*2)/32768;sum+=v*v;}return Math.sqrt(sum/Math.max(hi-lo,1));}
assert.equal(source.episodePairs.length,9);
assert.equal(manifest.cards.length,18);
const report={status:'technical-pass',checkedAt:new Date().toISOString(),humanListening:'not-performed; user marked optional',cards:[]};
const seen=new Set();
for(const pair of source.episodePairs){
  assert(/^00[2-9]$|^010$/.test(pair.unit));
  const picture=path.join(repo,pair.picture);
  assert(fs.existsSync(picture),'missing picture '+pair.picture);
  for(const language of ['en','ko']){
    const script=pair[language];
    const card=manifest.cards.find(x=>x.id===script.id);
    assert(card,'missing card '+script.id);
    assert(!seen.has(card.id),'duplicate card '+card.id);seen.add(card.id);
    assert.equal(card.language,language);assert.equal(card.level,'A0');
    assert.equal(card.unit,Number(pair.unit));
    assert.equal(card.expressions.length,1);assert.equal(card.expressions[0],script.target);
    assert.equal(card.meanings[0],script.meaning);assert.equal(card.tinyPrompt,script.prompt);
    assert.equal(card.expectedResponse,script.expected);
    assert.equal(card.picture,pair.picture);assert(card.pictureAlt?.length>15);
    const media=path.join(work,'final',card.filename),raw=path.join(work,'raw',`${language}-${pair.unit}-model.mp3`);
    assert(fs.existsSync(media)&&fs.existsSync(raw),'missing audio '+card.id);
    assert.equal(hash(media),card.sha256);assert.equal(hash(raw),card.sourceSha256);
    const pcm=decode(media),t=card.training,length=pcm.length/2/rate;
    assert(length<60,card.id+' too long for one-expression A0');
    assert(Math.abs(length-t.durationSeconds)<0.08,card.id+' duration mismatch');
    assert.equal(t.defaultReps,5);assert.equal(t.cues.length,5);
    assert.equal(t.cardDings,true);
    const startDingRms=rms(pcm,0,t.startCueEnd),endDingRms=rms(pcm,t.endingCueStart,length);
    assert(startDingRms>0.003,card.id+' start ding missing');
    assert(endDingRms>0.003,card.id+' end ding missing');
    let minGap=Infinity,minSpeechRms=Infinity,maxSilenceRms=0;
    t.cues.forEach((cue,i)=>{
      assert.equal(cue.i,0);assert.equal(cue.r,i+1);
      assert(cue.voiceEnd>cue.s&&cue.e>cue.voiceEnd,card.id+' invalid cue');
      if(i)assert(Math.abs(cue.s-t.cues[i-1].e)<0.002,card.id+' cue discontinuity');
      const voiceSeconds=cue.voiceEnd-cue.s,gap=cue.e-cue.voiceEnd;
      assert(gap>=Math.max(3,voiceSeconds*2.5)-0.01,card.id+' insufficient speaking gap');
      const speechRms=rms(pcm,cue.s+0.1,cue.voiceEnd-0.05);
      const silenceRms=rms(pcm,cue.voiceEnd+0.25,cue.e-0.25);
      assert(speechRms>0.002,card.id+' silent model');
      assert(silenceRms<0.003,card.id+' noisy response gap');
      minGap=Math.min(minGap,gap);minSpeechRms=Math.min(minSpeechRms,speechRms);
      maxSilenceRms=Math.max(maxSilenceRms,silenceRms);
    });
    assert(Math.abs(t.cues[0].s-t.startCueEnd)<0.002);
    assert(Math.abs(t.cues.at(-1).e-t.endingCueStart)<0.002);
    report.cards.push({id:card.id,durationSeconds:Number(length.toFixed(3)),repetitions:5,
      minGap:Number(minGap.toFixed(3)),minSpeechRms:Number(minSpeechRms.toFixed(6)),
      maxSilenceRms:Number(maxSilenceRms.toFixed(6)),startDingRms:Number(startDingRms.toFixed(6)),
      endDingRms:Number(endDingRms.toFixed(6)),sha256:card.sha256});
    console.log('PASS '+card.id+' '+length.toFixed(3)+'s · 5 cycles · 2.5×/3s gap · 2 dings');
  }
}
fs.writeFileSync(path.join(work,'final/qc-report.json'),JSON.stringify(report,null,2)+'\n');
