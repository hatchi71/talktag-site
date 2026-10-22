import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const levels=['A1','A2','B1','B2','C1','C2'];
const expectedSteps={A1:6,A2:6,B1:7,B2:7,C1:8,C2:7};
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('vocalcamp-manifest.js','utf8'),context);
const catalog=context.window.TALKTAG_VOCALCAMP_MANIFEST.families;

for(const [number,voice] of [['004','alex'],['005','bella']]){
  const entry=catalog.find(item=>item.number===number);
  assert.ok(entry,`Missing ${number} catalog entry`);
  assert.equal(entry.status,'published');
  assert.equal(entry.audioStatus,'ready');
  assert.deepEqual(Array.from(entry.levels),levels);
  vm.runInContext(fs.readFileSync(`content/vocalcamp/${number}.js`,'utf8'),context);
  const family=context.window.TALKTAG_VOCALCAMP.families[0];
  assert.equal(family.number,number);
  assert.equal(family.status,'published');
  assert.ok(family.audioCue.startUrl && family.audioCue.endUrl);
  for(const level of levels){
    const card=family.levels[level];
    assert.equal(card.status,'ready');
    assert.equal(card.lines.length,expectedSteps[level]);
    assert.equal(card.audioSteps.length,expectedSteps[level]);
    for(let i=0;i<card.audioSteps.length;i++){
      const step=card.audioSteps[i];
      assert.equal(step.step,i+1);
      assert.match(step.url,new RegExp(`/vocal-camp/${number}/20261022-${voice}-american-qc2/${level.toLowerCase()}-step-${String(i+1).padStart(2,'0')}\\.mp3$`));
      assert.ok(Number.isFinite(step.duration)&&step.duration>0);
      if(i)assert.ok(step.duration>card.audioSteps[i-1].duration,'Cumulative duration must increase');
    }
  }
}
const news=JSON.parse(fs.readFileSync('home-news-feed.json','utf8'));
assert.deepEqual(news.items.slice(0,2).map(item=>item.id),['vocal:005','vocal:004']);
console.log('Vocal Camp 004–005: 12 cards, 82 cumulative steps, cues and news feed validated.');
