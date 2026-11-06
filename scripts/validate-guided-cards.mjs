// Validate a private QC release manifest without copying lesson text into public/.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file=process.argv[2];
assert(file,'Usage: node scripts/validate-guided-cards.mjs ABSOLUTE_MANIFEST');
const {cards}=JSON.parse(fs.readFileSync(file,'utf8'));const ids=new Set();
for(const c of cards){
 assert(!ids.has(c.id),'Duplicate '+c.id);ids.add(c.id);
 const t=c.training,reps=c.level==='A0'?5:/^C/.test(c.level)?21:/^B/.test(c.level)?15:10;
 assert.equal(t.defaultReps,reps);assert.equal(t.silenceMultiplier,2.5);assert.equal(t.minimumGapSeconds,3);
 assert(t.durationSeconds<=(/^C/.test(c.level)?900:600),'Duration limit '+c.id);
 assert.equal(c.expressions.length,c.meanings.length);assert(c.expressions.every(Boolean)&&c.meanings.every(Boolean));
 assert.equal(t.cues.length,c.expressions.length*reps);
 assert(t.startCueEnd>0&&t.cues[0].s>=t.startCueEnd-.06);
 assert(t.endingCueStart>=t.cues.at(-1).e-.06&&t.durationSeconds>t.endingCueStart+.05);
 for(const [n,cue] of t.cues.entries()){
  assert.equal(cue.i,Math.floor(n/reps));assert.equal(cue.r,n%reps+1);
  assert(cue.voiceEnd>cue.s&&cue.e-cue.voiceEnd>=Math.max(3,2.5*(cue.voiceEnd-cue.s))-.01);
 }
}
console.log('PASS: '+cards.length+' Guided L&R cards; repetitions, dings, duration, bilingual coverage and cues.');
