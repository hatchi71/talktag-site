#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/essays-boundary-dings-20261020');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function pcm(file){const r=spawnSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ar','48000','-ac','1','-f','s16le','-'],{encoding:null,maxBuffer:128e6});assert.equal(r.status,0,String(r.stderr));return new Int16Array(r.stdout.buffer,r.stdout.byteOffset,r.stdout.byteLength/2);}
function match(source,cue,side){const span=Math.min(source.length,cue.length+48000),section=side==='start'?source.subarray(0,span):source.subarray(source.length-span);let best=0;for(let offset=0;offset<=section.length-cue.length;offset+=480){let dot=0,left=0,right=0;for(let i=0;i<cue.length;i+=4){const a=section[offset+i],b=cue[i];dot+=a*b;left+=a*a;right+=b*b;}best=Math.max(best,dot/Math.sqrt(left*right||1));}return best;}
const start=pcm('/Users/eungjukim/Desktop/TEMP/Start.mp3'),end=pcm('/Users/eungjukim/Desktop/TEMP/Ending.mp3');
const englishCards=manifest.cards.filter(card=>card.language==='en');
assert.equal(englishCards.length,12);
for(const card of englishCards){const file=path.join(root,card.language,card.id+'.mp3');assert.equal(fs.statSync(file).size,card.bytes);assert.equal(sha(file),card.sha256);const audio=pcm(file);assert.ok(match(audio,start,'start')>0.75,`${card.id}: opening cue not confirmed`);assert.ok(match(audio,end,'end')>0.75,`${card.id}: closing cue not confirmed`);assert.ok(Math.abs(card.durationSeconds-audio.length/48000)<0.12,`${card.id}: duration mismatch`);}
const context={window:{}};vm.createContext(context);
function run(name){vm.runInContext(fs.readFileSync(path.join(repo,name),'utf8'),context,{filename:name});}
for(const name of ['audio-essays.js','audio-essays-002-media.js','audio-essays-002.js','audio-sync-data.js'])run(name);
const originalMediaCue=context.window.TalkTagEssayMedia['aea-a1-002'].sync.cues[0].s;
const originalSyncCue=context.window.TalkTagAudioSync['aea-a1-001'].cues[0].s;
run('essay-ding-media.js');
const lessons=context.window.TalkTagAudioLessons;
for(const card of englishCards){const lesson=lessons.find(x=>x.id===card.id);assert.ok(lesson,card.id);assert.equal(lesson.audio,card.audio);assert.equal(lesson.boundaryDings,true);}
const shift=manifest.cards.find(x=>x.id==='aea-a1-002').openingDingSeconds;
assert.ok(Math.abs(context.window.TalkTagEssayMedia['aea-a1-002'].sync.cues[0].s-originalMediaCue-shift)<0.001,'English 002 cue shifted more than once');
assert.ok(Math.abs(context.window.TalkTagAudioSync['aea-a1-001'].cues[0].s-originalSyncCue-shift)<0.001,'English 001 cue offset');
console.log('PASS: 12 English essay files, audible approved opening/ending dings, catalog URLs, and single synchronized-text offset.');
