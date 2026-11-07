import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function catalog(pathname){const c={window:{},location:{pathname}};vm.runInNewContext(fs.readFileSync('public/catalog-metadata.js','utf8'),c);return c.window;}
test('every active card has a resolvable reviewed image regardless of course pathname',()=>{
 const expected=Object.keys(catalog('/protected-card.html').TalkTagCardTitles).sort();
 assert.ok(expected.length>=408,'preserve the existing catalog while allowing new releases');
 for(const p of ['/protected-card.html','/K-korean-audio-library.html','/japanese/J-index.html']){
  const w=catalog(p);assert.deepEqual(Object.keys(w.TalkTagCardTitles).sort(),expected);
  for(const id of Object.keys(w.TalkTagCardTitles)){const art=w.TalkTagCardArtwork[id];assert.ok(art?.src,id);assert.ok(art.alt?.trim(),id);assert.ok(fs.existsSync('public/'+art.src.replace(/^\//,'')),id+': '+art.src);}
 }
});
test('English A1/A2 013–015 each resolve their own reviewed daily-life scene',()=>{
 const w=catalog('/audio-library.html');const scenes=new Set();
 for(const level of ['A1','A2'])for(const episode of [13,14,15]){
  const id=`guided-${level.toLowerCase()}-${episode}`;
  const card=w.TalkTagAudioLessons.find(x=>x.id===id);assert.ok(card,id);
  const expected=`/assets/glr-scenes/en/${level.toLowerCase()}-${String(episode).padStart(3,'0')}-daily-v1.jpg`;
  assert.equal(card.artwork,expected);assert.equal(w.TalkTagCardArtwork[id].src,expected);scenes.add(expected);
 }
 assert.equal(scenes.size,6);
});
test('GLR 011 has six level-specific scenes and matching split parts',()=>{
 const w=catalog('/audio-library.html');let seen=new Set();
 for(const level of ['A1','A2','B1','B2','C1','C2']){let cards=w.TalkTagAudioLessons.filter(x=>x.unit===11&&x.level===level);assert.ok(cards.length);let paths=new Set(cards.map(x=>x.artwork));assert.equal(paths.size,1);const art=[...paths][0];assert.ok(art.includes('011-'+level.toLowerCase()+'-v2'));seen.add(art);for(const c of cards)assert.equal(w.TalkTagCardArtwork[c.id].src,c.artwork);}
 assert.equal(seen.size,6);
});
test('Boot Camp collection and protected player use the same reviewed scene',()=>{
 const w=catalog('/protected-card.html');const c={window:{}};vm.runInNewContext(fs.readFileSync('public/bootcamp-artwork.js','utf8'),c);
 for(const id of Object.keys(w.TalkTagCardTitles).filter(x=>/^(en|ko|ja)-(vocal|story)-camp-/.test(x))){const [,lang,camp,n,level]=/^(en|ko|ja)-(vocal|story)-camp-(\d+)-(\w+)$/.exec(id);assert.equal(c.window.TalkTagBootCampArtwork.get(camp,n,level.toUpperCase(),lang).src,w.TalkTagCardArtwork[id].src);}
 assert.ok(w.TalkTagCardArtwork['ko-vocal-camp-002-c2'].src.endsWith('002-c2-v2.jpg'));
});
