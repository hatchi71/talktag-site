import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={window:{}};vm.createContext(c);
for(const filename of ['native-guided-data.js','native-guided-ko-002.js']){
 const file=new URL('../'+filename,import.meta.url);if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),c);
}
let count=0;const ids=new Set();
for(const [language,lessons] of Object.entries(c.window.TalkTagNativeCatalogs)){
 const groups=new Map(),levels=new Set(),episodes=new Map();
 for(const lesson of lessons){
  assert(!ids.has(lesson.id),'Duplicate ID '+lesson.id);ids.add(lesson.id);
  assert.equal(lesson.language,language);assert.equal(lesson.available,true);
  assert.match(lesson.audio,/^https:\/\/audio\.talktag\.co\.kr\/(Korean|Japanese)\/guided\//);
  const n=lesson.expressions.length,t=lesson.training,reps=lesson.level.startsWith('A')?10:lesson.level.startsWith('B')?15:21;
  assert.equal(t.defaultReps,reps);assert.equal(t.silenceMultiplier,2.5);assert.equal(t.minimumGapSeconds,3);
  assert.equal(lesson.meanings.length,n);assert(t.cardDings&&t.startCueEnd>0&&t.endingCueStart<t.durationSeconds);
  assert(t.durationSeconds<=(lesson.level.startsWith('C')?900:600));assert.equal(t.cues.length,n*reps);
  let last=t.startCueEnd;
  for(let i=0;i<n;i++)for(let r=1;r<=reps;r++){
   const q=t.cues[i*reps+r-1];assert.equal(q.i,i);assert.equal(q.r,r);assert(Math.abs(q.s-last)<.002);assert(q.voiceEnd>q.s);
   assert(q.e-q.voiceEnd>=Math.max(3,2.5*(q.voiceEnd-q.s))-.01,lesson.id+' response gap');last=q.e;
  }
  assert(Math.abs(last-t.endingCueStart)<.002);
  const episode=String(lesson.unit||1),group=episode+':'+lesson.level;
  if(!groups.has(group))groups.set(group,[]);groups.get(group).push(lesson);levels.add(lesson.level);
  if(!episodes.has(episode))episodes.set(episode,new Set());episodes.get(episode).add(lesson.level);
  if(language==='ko'&&episode==='2'){
   assert.equal(lesson.speakers.length,n);assert.match(lesson.audioRevision,/^[a-f0-9]{16}$/);
   assert.equal(new URL(lesson.audio).searchParams.get('v'),lesson.audioRevision);
   assert(fs.existsSync(new URL('..'+lesson.artwork,import.meta.url)),'Missing scene '+lesson.id);
   assert(lesson.briefing&&lesson.scene);assert.equal(lesson.englishMeanings.length,n);
  }
  count++;
 }
 assert.equal(levels.size,6);for(const episodeLevels of episodes.values())assert.equal(episodeLevels.size,6);
 for(const parts of groups.values()){
  parts.sort((a,b)=>a.partIndex-b.partIndex);let next=1;
  parts.forEach((part,index)=>{assert.equal(part.partIndex,index+1);assert.equal(part.partCount,parts.length);assert.equal(part.sentenceStart,next);next=part.sentenceEnd+1;});
 }
}
console.log('Native GLR: '+count+' cards; episode parts, repetitions, gaps, dings, durations, translations and versioned Korean 002 audio passed.');
