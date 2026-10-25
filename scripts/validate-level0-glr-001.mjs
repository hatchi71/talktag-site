#!/usr/bin/env node
// Independent, decoded-media acceptance check for the English/Korean A0 pilots.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/guided/a0-001-scripts.json'),'utf8'));
const moduleText=fs.readFileSync(path.join(root,'level0-glr001.js'),'utf8');
const rate=48000;
function decode(file){const p=spawnSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ar',String(rate),'-ac','1','-f','s16le','pipe:1'],{encoding:null,maxBuffer:32*1024*1024});if(p.status!==0)throw Error(String(p.stderr));return p.stdout;}
function rms(pcm,a,b){const lo=Math.max(0,Math.floor(a*rate)),hi=Math.min(pcm.length/2,Math.ceil(b*rate));let sum=0;for(let i=lo;i<hi;i++){const v=pcm.readInt16LE(i*2)/32768;sum+=v*v;}return Math.sqrt(sum/Math.max(hi-lo,1));}
for(const language of ['en','ko']){
  const context={window:{TalkTagNative:{language}}};vm.runInNewContext(moduleText,context);
  const cards=context.window.TalkTagAudioLessons;
  assert.equal(cards.length,1,language+' catalog count');
  const card=cards[0],script=source.cards.find(x=>x.language===language);
  assert.equal(card.id,script.id);assert.equal(card.level,'A0');assert.equal(card.format,'level0');
  assert.equal(card.expressions.length,1);assert.equal(card.expressions[0],script.targetExpression);
  assert.equal(card.meanings[0],script.supportMeaning);assert.equal(card.tinyPrompt,script.tinyPrompt);
  assert(fs.existsSync(path.join(root,card.artwork.replace(/^\//,''))),language+' missing artwork');
  assert(card.artworkAlt?.length>15,language+' missing alt');
  const media=path.join(root,'audio/guided/level0-001',card.sourceFilename);
  const pcm=decode(media),t=card.training,length=pcm.length/2/rate;
  assert(length<60,language+' A0 card is not short');
  assert(Math.abs(length-t.durationSeconds)<0.08,language+' duration mismatch');
  assert.equal(t.defaultReps,5);assert.equal(t.cues.length,5);
  assert(rms(pcm,0,t.startCueEnd)>0.003,language+' start ding missing');
  assert(rms(pcm,t.endingCueStart,length)>0.003,language+' end ding missing');
  t.cues.forEach((cue,i)=>{
    assert.equal(cue.i,0);assert.equal(cue.r,i+1);
    assert(cue.voiceEnd>cue.s&&cue.e>cue.voiceEnd,language+' invalid cue');
    assert(cue.e-cue.voiceEnd>=Math.max(3,(cue.voiceEnd-cue.s)*2.5)-0.01,language+' insufficient speaking gap');
    assert(rms(pcm,cue.s+0.1,cue.voiceEnd-0.05)>0.002,language+' silent model');
    assert(rms(pcm,cue.voiceEnd+0.25,cue.e-0.25)<0.003,language+' non-silent response gap');
  });
  console.log('PASS '+card.id+' '+length.toFixed(3)+'s · 5 model cycles · 2.5×/3s gap · 2 dings');
}
