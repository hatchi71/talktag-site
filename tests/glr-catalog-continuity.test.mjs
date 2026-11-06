import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('English A1 retains original 008–010 IDs and their completion connections',()=>{
 const c={window:{},location:{pathname:'/audio-library.html'}};
 vm.runInNewContext(fs.readFileSync('public/catalog-metadata.js','utf8'),c);
 for(const n of ['08','09','10']){
  const id=`guided-a1-${n}-miniskit-pilot`;
  const matches=c.window.TalkTagAudioLessons.filter(x=>x.id===id);
  assert.equal(matches.length,1);
  assert.equal(matches[0].unit,Number(n));
  assert.equal(matches[0].available,true);
  assert.equal(c.window.TalkTagCardTitles[id].ordinal,Number(n));
 }
});
