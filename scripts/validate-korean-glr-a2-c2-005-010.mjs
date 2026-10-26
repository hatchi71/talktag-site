#!/usr/bin/env node
// Decode and validate every locally assembled Korean A2–C2 005–010 audio variant.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-a2-c2-005-010');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/native-glr-ko-a2-c2-005-010.source.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(work,'variants-manifest.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(work,'draft-catalog.json'),'utf8'));
const uploads=JSON.parse(fs.readFileSync(path.join(work,'upload-inventory.json'),'utf8'));
assert.equal(source.lessons.length,30);
assert.deepEqual(manifest.pauseRatios,[2,2.5,3,3.5]);
assert.equal(manifest.publicationReady,false);
assert.equal(catalog.length,manifest.cards.length);
assert.equal(uploads.length,120+manifest.cards.length*4);
assert.equal(new Set(uploads.map(x=>x.key)).size,uploads.length);
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function local(url){assert(url.startsWith(manifest.releaseBase));const relative=new URL(url).pathname.slice(new URL(manifest.releaseBase).pathname.length);const file=path.join(work,'release',relative);assert(fs.existsSync(file),`Missing ${file}`);return file;}
function pcm(file){const r=spawnSync('/opt/homebrew/bin/ffmpeg',['-v','error','-nostdin','-i',file,'-ac','1','-ar','48000','-f','s16le','pipe:1'],{maxBuffer:160e6});assert.equal(r.status,0,`Decode ${file}`);return r.stdout;}
function rms(bytes,left,right){const from=Math.max(0,Math.floor(left*48000)),to=Math.min(bytes.length/2,Math.ceil(right*48000));let sum=0,n=0;for(let i=from;i<to;i+=8){const x=bytes.readInt16LE(i*2);sum+=x*x;n++;}return n?Math.sqrt(sum/n):0;}
let linesChecked=0,tracksChecked=0,pausesChecked=0;
for(const lesson of source.lessons){
  const parts=manifest.cards.filter(x=>x.id===lesson.id||x.id.startsWith(lesson.id+'-part')).sort((a,b)=>a.partIndex-b.partIndex);
  assert(parts.length>0,`No parts for ${lesson.id}`);
  assert.equal(lesson.lines.filter(x=>x.speaker==='Min-joon').length,2);
  assert.equal(lesson.lines.filter(x=>x.speaker==='Leejin').length,2);
  let nextSentence=1;
  for(const [index,part] of parts.entries()){
    assert.equal(part.partIndex,index+1);assert.equal(part.partCount,parts.length);
    assert.equal(part.sentenceStart,nextSentence);assert.equal(part.lines.length,part.sentenceEnd-part.sentenceStart+1);
    assert.equal(part.repetitions,lesson.level[0]==='A'?10:lesson.level[0]==='B'?15:21);
    const row=catalog.find(x=>x.id===part.id);assert(row&&!row.available);
    assert.equal(row.expressions.length,part.lines.length);
    part.lines.forEach((line,i)=>{
      const original=lesson.lines[nextSentence+i-1];
      assert.equal(line.text,original.ko);assert.equal(line.meaning,original.en);
      assert.equal(row.expressions[i],original.ko);assert.equal(row.meanings[i],original.en);
      const file=local(line.audio);assert.equal(digest(file),line.sha256);assert.equal(fs.statSync(file).size,line.bytes);linesChecked++;
    });
    assert.equal(part.variants.length,4);
    for(const variant of part.variants){
      const file=local(variant.audio),bytes=pcm(file),duration=bytes.length/96000;
      assert.equal(digest(file),variant.sha256);assert.equal(fs.statSync(file).size,variant.bytes);
      assert(Math.abs(duration-variant.durationSeconds)<.005);
      assert(duration<=(lesson.level[0]==='C'?900:600));
      assert.equal(variant.cues.length,part.lines.length*part.repetitions);
      assert.equal(variant.measuredSpeech.length,variant.cues.length);
      assert(rms(bytes,.05,Math.min(.4,variant.cues[0].s-.05))>100,`Missing start ding ${part.id}`);
      assert(rms(bytes,variant.endingCueStart+.05,Math.min(duration-.05,variant.endingCueStart+.4))>100,`Missing end ding ${part.id}`);
      let last=variant.cues[0].s;
      variant.cues.forEach((cue,n)=>{
        const spoken=variant.measuredSpeech[n],next=variant.measuredSpeech[n+1];
        assert.equal(cue.i,Math.floor(n/part.repetitions));assert.equal(cue.r,n%part.repetitions+1);
        assert(Math.abs(cue.s-last)<.002);assert(spoken.start>=cue.s&&spoken.end<=cue.e);
        const minimum=Math.max(3,variant.ratio*(spoken.end-spoken.start));
        const gap=(next?next.start:variant.endingCueStart)-spoken.end;
        assert(gap>=minimum-.004,`Short gap ${part.id}/${variant.ratio}/${n}`);
        if(next)assert(rms(bytes,spoken.end+.20,Math.min(next.start-.20,spoken.end+1.2))<100,`Audible speaking gap ${part.id}`);
        last=cue.e;pausesChecked++;
      });
      assert(Math.abs(last-variant.endingCueStart)<.002);
      if(variant.ratio===2.5){assert.equal(row.audio,variant.audio);assert.equal(row.training.durationSeconds,variant.durationSeconds);assert.equal(JSON.stringify(row.training.cues),JSON.stringify(variant.cues));}
      tracksChecked++;
    }
    nextSentence=part.sentenceEnd+1;
  }
  assert.equal(nextSentence-1,lesson.lines.length,`Incomplete lesson ${lesson.id}`);
}
assert.equal(linesChecked,120);
console.log(`PASS: ${source.lessons.length} episodes, ${manifest.cards.length} selectable cards, ${linesChecked} line references, ${tracksChecked} decoded tracks, ${pausesChecked} timed repetitions.`);
