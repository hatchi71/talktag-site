import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const raw=fs.readFileSync('public/catalog-metadata.js','utf8');
const begin=raw.indexOf('const d=')+8;
// Catalog is a JSON literal followed by runtime adapters.
let data; for(let i=begin;i<raw.length;i++){if(raw[i]===';'){try{data=JSON.parse(raw.slice(begin,i));break;}catch{}}}
test('all published English 011 collection cards attach their catalog illustration, including split parts',()=>{
 const lessons=data.sound.filter(x=>x.language==='en'&&x.type==='guided'&&x.unit===11&&x.level!=='A0');
 assert.equal(lessons.length,10);
 const images=[];
 const make=()=>({classList:{contains:()=>false,add(){}},append(x){if(x.tag==='img')images.push(x);},addEventListener(){}});
 const cards=lessons.map(l=>({dataset:{completionId:'audio:'+l.id},querySelector:()=>({parentElement:make(),before(){}})}));
 const doc={body:{dataset:{audioType:'guided'}},querySelectorAll:()=>cards,getElementById:()=>null,createElement:tag=>({...make(),tag})};
 vm.runInNewContext(fs.readFileSync('public/glr-scenes.js','utf8'),{document:doc,window:{TalkTagAudioLessons:lessons,addEventListener(){}},location:{search:''},URLSearchParams,MutationObserver:class{observe(){}}});
 assert.deepEqual(images.map(x=>x.src),lessons.map(x=>x.artwork));
 for(const l of lessons)assert(fs.existsSync('public'+l.artwork),l.id);
});
