import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={window:{}};vm.createContext(c);
for(const filename of ['native-guided-data.js','native-guided-ko-002.js','native-guided-ko-003.js','native-guided-ko-splits.js']){
 const file=new URL('../'+filename,import.meta.url);if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),c);
}
for(const filename of ['audio/korean/guided/segments-001-002/manifest.js','native-guided-ko-003-variants.js']){
 const file=new URL('../'+filename,import.meta.url);if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),c);
}
const koreanVariants=JSON.parse(fs.readFileSync(new URL('../audio/korean/guided/segments-001-002/manifest.json',import.meta.url),'utf8'));
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
  const nativeVariant=language==='ko'&&lesson.contentRevision==='ko-segments-001-002-v1-20261016'
   ?koreanVariants.cards.find(card=>card.id===lesson.id)?.variants.find(item=>item.ratio===2.5)
   :language==='ko'&&Number(lesson.unit)===3
    ?c.window.TalkTagKoreanGuidedVariants?.cards.find(card=>card.id===lesson.id)?.variants.find(item=>item.ratio===2.5):null;
  if(language==='ko'&&(lesson.contentRevision==='ko-segments-001-002-v1-20261016'||Number(lesson.unit)===3)){
   assert(nativeVariant,'Missing published Korean ratio variant '+lesson.id);
   assert.equal(JSON.stringify(t.cues),JSON.stringify(nativeVariant.cues));
   assert.equal(t.durationSeconds,nativeVariant.durationSeconds);
  }
  let last=t.startCueEnd;
  for(let i=0;i<n;i++)for(let r=1;r<=reps;r++){
   const index=i*reps+r-1,q=t.cues[index];assert.equal(q.i,i);assert.equal(q.r,r);assert(Math.abs(q.s-last)<.002);assert(q.voiceEnd>q.s);
   if(nativeVariant){
    const speech=nativeVariant.measuredSpeech[index],next=nativeVariant.measuredSpeech[index+1];
    const actual=next?next.start-speech.end:nativeVariant.endingCueStart+(nativeVariant.endingToneLeadSeconds||0)-speech.end;
    assert(actual>=Math.max(3,2.5*(speech.end-speech.start))-.01,lesson.id+' measured response gap');
   }else assert(q.e-q.voiceEnd>=Math.max(3,2.5*(q.voiceEnd-q.s))-.01,lesson.id+' response gap');
   last=q.e;
  }
  assert(Math.abs(last-t.endingCueStart)<.002);
  const episode=String(lesson.unit||1),group=episode+':'+lesson.level;
  if(!groups.has(group))groups.set(group,[]);groups.get(group).push(lesson);levels.add(lesson.level);
  if(!episodes.has(episode))episodes.set(episode,new Set());episodes.get(episode).add(lesson.level);
  if(language==='ko'&&(episode==='2'||episode==='3')){
   assert.equal(lesson.speakers.length,n);assert.match(lesson.audioRevision,/^[a-f0-9]{16}$/);
   assert(lesson.audioRevision.startsWith(new URL(lesson.audio).searchParams.get('v')));
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
console.log('Native GLR: '+count+' published cards; episode parts, repetitions, gaps, dings, durations, translations and versioned Korean 002/003 audio passed.');
