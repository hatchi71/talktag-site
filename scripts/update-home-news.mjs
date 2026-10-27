import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);process.chdir(fileURLToPath(root));
const path='home-news-feed.json';
function catalog(read){
 const c={window:{}};vm.createContext(c);
 const html=read('audio-library.html')||'';
 const scripts=[...html.matchAll(/src="([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]).filter(x=>/^(audio-lessons|level0-glr001|level0-glr002-010|guided-[a-z-]+\d+|guided-miniskit-pilots|mini-talks-\d+|audio-essays(?:-\d+(?:-media)?)?)\.js$/.test(x));
 for(const f of [...scripts,'storycamp-manifest.js','vocalcamp-manifest.js']){const s=read(f);if(s)vm.runInContext(s,c,{timeout:1000});}
 const groups=new Map();
 for(const l of c.window.TalkTagAudioLessons||[]){if(l.available===false||!l.audio)continue;const number=String(l.number||l.unit||1).padStart(3,'0'),isLevel0=l.format==='level0',isMiniTalks=l.format==='mini-talks',isLevel0Batch=isLevel0&&Number(number)>=2&&Number(number)<=10,id=isLevel0?'level0:en:'+(isLevel0Batch?'002-010':number):isMiniTalks?'mini:en:'+number:l.type+':'+number;
 if(!groups.has(id))groups.set(id,{id,title:isLevel0?'English Start Here · Level 0 · '+(isLevel0Batch?'002–010':number):isMiniTalks?'영어 미니토크 · '+number:(l.type==='guided'?'Guided L&R':'Audio Essays & Articles')+' · '+number,href:'audio-library.html?type='+l.type+(isLevel0?'&level=A0':''),levels:[],description:isLevel0Batch?'Nine short picture-led expressions to hear, repeat, and use today.':isLevel0?'그림을 보고 한 가지 인사를 듣고 말해 보세요.':isMiniTalks?'A1–C2 실생활 대화를 듣고, 메모한 뒤 내 말로 다시 이야기해 보세요.':l.type==='guided'?'새 일상 표현을 듣고 따라 말해 보세요.':'새 이야기를 듣고 내 말로 다시 이야기해 보세요.',publishedAt:isMiniTalks?l.publishedAt:undefined});
 const g=groups.get(id);if(!g.levels.includes(l.level))g.levels.push(l.level);
 }
 const story=c.window.TALKTAG_STORYCAMP_MANIFEST?.families||[],vocal=c.window.TALKTAG_VOCALCAMP_MANIFEST?.families||[];
 for(const f of story.filter(f=>f.status==='published'))groups.set('boot:'+f.number,{id:'boot:'+f.number,title:f.number+' · '+f.title,href:'storycamp-family.html?family='+f.number,levels:f.levels,description:vocal.some(v=>v.number===f.number&&v.status==='published'&&v.audioStatus==='ready')?'Vocal · Story Camp에서 새 이야기를 연습하세요.':'Story Camp에서 새 이야기를 연습하세요.',publishedAt:f.publishedAt});
 for(const f of vocal.filter(f=>f.status==='published'&&f.audioStatus==='ready'&&!story.some(s=>s.number===f.number&&s.status==='published')))groups.set('vocal:'+f.number,{id:'vocal:'+f.number,title:'Vocal Camp · '+f.number,href:'vocalcamp-family.html?family='+f.number,levels:f.levels,description:'새 이야기를 누적해서 듣고, 따라 말하며 내 말로 이어 보세요.'});
 const readableLevels=['A1','A2','B1','B2','C1','C2'].filter(level=>{const source=read(`content/readable/en-${level.toLowerCase()}-001.json`);if(!source)return false;const chapter=JSON.parse(source);return chapter.level===level&&chapter.status==='published'&&chapter.paragraphs?.length;});
 if(readableLevels.length)groups.set('readable:en:001:levels',{id:'readable:en:001:levels',language:'en',title:'Readable · 001 · A1–C2',href:'readable.html',levels:readableLevels,description:'피터의 이야기를 수준별로 읽고, 기억해서 내 말로 다시 이야기해 보세요.'});
 const koreanReadable=read('content/readable/korean-001.js');
 if(koreanReadable)vm.runInContext(koreanReadable,c,{timeout:1000});
 for(const chapter of (c.window.TalkTagKoreanReadable||[]).filter(chapter=>chapter.status==='published'&&chapter.paragraphs?.length)){
  const number=String(chapter.unit||1).padStart(3,'0');
  groups.set('korean-readable:'+number,{id:'korean-readable:'+number,language:'ko',title:'Korean Readable · '+number,href:`K-korean-readable.html?level=${chapter.level}`,levels:[chapter.level],description:'Read a Korean story, then recall and retell it in your own words.',publishedAt:chapter.publishedAt});
 }
 const korean=read('korean-starter-data.js');
 if(korean){vm.runInContext(korean,c,{timeout:1000});const ready=(c.window.TalkTagKoreanStarters||[]).filter(x=>x.published&&x.lines?.length&&x.story);if(ready.length)groups.set('korean:starters',{id:'korean:starters',title:'Korean Starter Collection · 001–006',href:'K-korean-learning.html',levels:['Starter'],description:'영어 안내와 함께 일상 한국어를 연습하고 기억해서 말해 보세요.'});}
 for(const file of ['content/vocalcamp-korean-001.js','content/storycamp-korean/001.js']){const koreanVocal=read(file);if(koreanVocal)vm.runInContext(koreanVocal,c,{timeout:1000});}
 for(const f of (c.window.TALKTAG_VOCALCAMP_KOREAN?.families||[]).filter(f=>f.status==='published'&&f.audioStatus==='ready'))groups.set('korean-vocal:'+f.number,{id:'korean-vocal:'+f.number,language:'ko',title:'Korean Vocal Camp · '+f.number,href:'K-korean-vocal-camp.html',levels:f.levels,description:'Build one Korean story through cumulative listening and speaking.'});
 for(const f of (c.window.TALKTAG_STORYCAMP_KOREAN?.families||[]).filter(f=>f.status==='published'))groups.set('korean-story:'+f.number,{id:'korean-story:'+f.number,language:'ko',title:'Korean Story Camp · '+f.number,href:'K-korean-story-camp.html',levels:Object.keys(f.levels||{}),description:'Rebuild and retell an original Korean story with English guidance.'});
 const japaneseVocal=read('content/vocalcamp-japanese-001.js');
 if(japaneseVocal)vm.runInContext(japaneseVocal,c,{timeout:1000});
 for(const f of (c.window.TALKTAG_VOCALCAMP_JAPANESE?.families||[]).filter(f=>f.status==='published'&&f.audioStatus==='ready'))groups.set('japanese-vocal:'+f.number,{id:'japanese-vocal:'+f.number,language:'ja',title:'Japanese Vocal Camp · '+f.number,href:'japanese/J-vocal-camp.html',levels:f.levels,description:'짧은 일본어 이야기를 누적해서 듣고 따라 말한 뒤, 기억해 자신의 이야기로 바꾸어 보세요.'});
 for(const file of ['native-guided-data.js','native-guided-ko-002.js','native-guided-ko-003.js','native-guided-ko-004-a1.js','native-guided-ko-005-010.js','native-guided-ko-a2-c2-004-010.js','native-audio-korean-aea-001.js','native-audio-korean-aea-002.js']){const native=read(file);if(native)vm.runInContext(native,c,{timeout:1000});}
 for(const [language,lessons] of Object.entries(c.window.TalkTagNativeCatalogs||{}))for(const lesson of lessons){
  if(!lesson.available||!lesson.audio)continue;
  const number=String(lesson.unit||1).padStart(3,'0'),track=lesson.type==='plain'?'Audio Essays & Articles':'Guided L&R',id='native:'+language+':'+lesson.type+':'+number,name=language==='ko'?'Korean':'Japanese';
  if(!groups.has(id))groups.set(id,{id,language,title:name+' '+track+' · '+number,href:language==='ko'?`K-korean-audio-library.html?type=${lesson.type}`:'japanese/J-guided.html?type=guided',levels:[],description:lesson.type==='plain'?'Listen, summarize, and retell an original audio essay.':language==='ko'?'Practice everyday Korean expressions, one line at a time.':'일본어의 새 일상 표현을 듣고 따라 말해 보세요.'});
  const group=groups.get(id);if(!group.levels.includes(lesson.level))group.levels.push(lesson.level);
 }
 const koreanA2C2=(c.window.TalkTagNativeCatalogs?.ko||[]).filter(lesson=>lesson.type==='guided'&&lesson.available&&lesson.audio&&Number(lesson.episode)>=4&&Number(lesson.episode)<=10&&['A2','B1','B2','C1','C2'].includes(lesson.level));
 if(koreanA2C2.length===97)groups.set('native:ko:guided:a2-c2:004-010',{
  id:'native:ko:guided:a2-c2:004-010',language:'ko',title:'Korean Guided L&R · A2–C2 · 004–010',
  href:'K-korean-audio-library.html?type=guided',levels:['A2','B1','B2','C1','C2'],
  description:'Seven everyday Korean episode groups now include new A2–C2 listening and speaking cards.'
 });
 for(const file of ['level0-glr001.js','level0-glr002-010.js']){const level0=read(file);if(!level0)continue;const nativeLevel0={window:{TalkTagNative:{language:'ko'}}};vm.createContext(nativeLevel0);vm.runInContext(level0,nativeLevel0,{timeout:1000});for(const lesson of nativeLevel0.window.TalkTagAudioLessons||[]){if(lesson.available===false||!lesson.audio)continue;const number=String(lesson.unit||1).padStart(3,'0'),isBatch=Number(number)>=2&&Number(number)<=10,id='level0:ko:'+(isBatch?'002-010':number);groups.set(id,{id,language:'ko',title:'Korean Start Here · Level 0 · '+(isBatch?'002–010':number),href:'K-korean-audio-library.html?type=guided&level=A0',levels:['A0'],description:isBatch?'Nine short picture-led expressions to hear, repeat, and use in Korean.':'See a real-life greeting, listen, repeat, then answer in Korean.'});}}
 return [...groups.values()];
}
const current=catalog(f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):null);
const previous=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')).items:[];
const dates=new Map(previous.map(x=>[x.id,x.publishedAt]));
if(current.some(x=>!dates.has(x.id))){
 const history=execFileSync('git',['log','--reverse','--format=%H %cI','--','audio-library.html','audio-lessons.js','guided-lauren003.js','guided-miniskit-pilots.js','audio-essays.js','audio-essays-002-media.js','audio-essays-002.js','storycamp-manifest.js','content/readable/en-a1-001.json'],{encoding:'utf8'}).trim().split('\n');
 for(const row of history){const [sha,date]=row.split(' ');let items=[];try{items=catalog(f=>{try{return execFileSync('git',['show',sha+':'+f],{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{return null;}});}catch{continue;}for(const item of items)if(!dates.has(item.id))dates.set(item.id,date);}
}
const now=new Date().toISOString();
// Imported legacy content shares one repository timestamp. Use the known
// latest legacy release (Audio Essays 002) as the tie-break for that baseline.
const tieRank=x=>({guided:3,plain:4,boot:2,readable:1}[x.id.split(':')[0]]||0);
const items=current.map(x=>({...x,language:x.language||(x.id.startsWith('korean:')?'ko':'en'),publishedAt:x.publishedAt||dates.get(x.id)||now})).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||tieRank(b)-tieRank(a)||b.id.localeCompare(a.id));
const output=JSON.stringify({version:1,items},null,2)+'\n';
if(process.argv.includes('--check')){if(!fs.existsSync(path)||fs.readFileSync(path,'utf8')!==output)throw Error('Run node scripts/update-home-news.mjs and commit home-news-feed.json');}
else fs.writeFileSync(path,output);
console.log('News feed: '+items.length+' upload groups; latest '+items.slice(0,2).map(x=>x.title).join(' / '));
