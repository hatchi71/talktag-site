import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),context={window:{}};vm.createContext(context);
for(const name of ['audio-lessons.js','guided-drill-data.js','guided-lauren003.js','guided-lauren004.js','guided-jarnathan005.js','guided-card-parts.js'])vm.runInContext(fs.readFileSync(new URL(name,root),'utf8'),context);
const lessons=context.window.TalkTagAudioLessons.filter(l=>l.type==='guided'&&l.available!==false),ids=new Set();
for(const l of lessons){
 assert(!ids.has(l.id),'Duplicate '+l.id);ids.add(l.id);
 const [m,s]=l.durationLabel.split(':').map(Number);assert(m*60+s<=660,'Split required: '+l.id);
 if(l.protocolVersion>=2){assert(m*60+s<=600,'V2 10-minute maximum: '+l.id);assert(l.training.endingCueStart<=600,l.id+' V2 cue exceeds 10 minutes');}
 assert.equal(l.expressions.length,l.meanings.length,l.id+' translation coverage');
 assert.equal(l.training.defaultReps,/^[BC]/.test(l.level)?15:10);
 const cues=l.training.cues;assert(cues?.length,l.id+' cues missing');
 assert(l.training.startCueEnd>0,l.id+' starting ding missing');
 assert(cues[0].s>=l.training.startCueEnd-.06,l.id+' starting ding overlaps speech');
 assert(l.training.endingCueStart>=cues.at(-1).e-.06,l.id+' ending ding overlaps training');
 if(l.training.cardDings)assert(l.training.durationSeconds>l.training.endingCueStart+.05,l.id+' ending ding missing');
 assert(cues.at(-1).e<=661,l.id+' cue exceeds card duration');
 for(let i=0;i<l.expressions.length;i++){
 const sentence=cues.filter(c=>c.i===i);assert.equal(sentence.length,l.training.defaultReps,l.id+' incomplete repetition cycle');
 sentence.forEach((c,r)=>{assert.equal(c.r,r+1);assert(c.s>=0&&c.voiceEnd>c.s&&c.e>c.voiceEnd);assert(Math.abs((c.e-c.voiceEnd)/(c.voiceEnd-c.s)-2.5)<.002);});
 }
}
for(const id of new Set((context.window.TalkTagGuidedParts||[]).map(p=>p.sourceId))){
 const group=lessons.filter(p=>p.sourceId===id);let next=1;group.forEach((p,i)=>{assert.equal(p.partIndex,i+1);assert.equal(p.sentenceStart,next);next=p.sentenceEnd+1;});
 const original=context.window.TalkTagGuidedDrills[id];assert.equal(next-1,Math.max(...original.cues.map(c=>c.i))+1,id+' missing sentences');
}
console.log('PASS: '+lessons.length+' guided cards, <=11 minutes, complete cycles, bilingual scripts and rebased cues.');
