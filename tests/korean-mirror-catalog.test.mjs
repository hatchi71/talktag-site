import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},location:{pathname:'/K-korean-audio-library.html'}};
vm.runInNewContext(fs.readFileSync('public/catalog-metadata.js','utf8'),context);
test('Korean mirror episodes 011–020 keep 20 ordinals and 22 independently selectable parts',()=>{
 const cards=context.window.TalkTagAudioLessons.filter(c=>c.type==='guided'&&['A1','A2'].includes(c.level)&&c.unit>=11&&c.unit<=20);
 assert.equal(cards.length,22);
 for(const level of ['A1','A2'])assert.deepEqual([...new Set(cards.filter(c=>c.level===level).map(c=>c.unit))].sort((a,b)=>a-b),[11,12,13,14,15,16,17,18,19,20]);
 for(const c of cards){assert.equal(c.available,true);assert.ok(fs.existsSync('public'+c.artwork));assert.ok(c.description&&!/No shopping|No crooked|No food|unreadable marks/.test(c.description));}
 for(const n of [18,19])assert.equal(cards.filter(c=>c.level==='A2'&&c.unit===n).length,2);
});
test('generated Korean release notice resolves every card in its own course',()=>{
 const feed=JSON.parse(fs.readFileSync('public/home-news-feed.json','utf8'));
 const group=feed.items.find(g=>g.id==='guided:ko:a1-a2:011-020');assert.equal(group.cardIds.length,22);
 const ids=new Set(context.window.TalkTagAudioLessons.map(c=>c.id));assert.ok(group.cardIds.every(id=>ids.has(id)));
});
