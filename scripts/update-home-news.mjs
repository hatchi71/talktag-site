import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);process.chdir(fileURLToPath(root));
const path='home-news-feed.json';
function catalog(read){
 const c={window:{}};vm.createContext(c);
 const html=read('audio-library.html')||'';
 const scripts=[...html.matchAll(/src="([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]).filter(x=>/^(audio-lessons|guided-lauren\d+|audio-essays(?:-\d+(?:-media)?)?)\.js$/.test(x));
 for(const f of [...scripts,'storycamp-manifest.js','vocalcamp-manifest.js']){const s=read(f);if(s)vm.runInContext(s,c,{timeout:1000});}
 const groups=new Map();
 for(const l of c.window.TalkTagAudioLessons||[]){if(l.available===false||!l.audio)continue;const number=String(l.number||l.unit||1).padStart(3,'0'),id=l.type+':'+number;
 if(!groups.has(id))groups.set(id,{id,title:(l.type==='guided'?'Guided L&R':'Audio Essays & Articles')+' · '+number,href:'audio-library.html?type='+l.type,levels:[],description:l.type==='guided'?'새 일상 표현을 듣고 따라 말해 보세요.':'새 이야기를 듣고 내 말로 다시 이야기해 보세요.'});
 const g=groups.get(id);if(!g.levels.includes(l.level))g.levels.push(l.level);
 }
 const story=c.window.TALKTAG_STORYCAMP_MANIFEST?.families||[],vocal=c.window.TALKTAG_VOCALCAMP_MANIFEST?.families||[];
 for(const f of story.filter(f=>f.status==='published'))groups.set('boot:'+f.number,{id:'boot:'+f.number,title:f.number+' · '+f.title,href:'storycamp-family.html?family='+f.number,levels:f.levels,description:vocal.some(v=>v.number===f.number&&v.status==='published'&&v.audioStatus==='ready')?'Vocal · Story Camp에서 새 이야기를 연습하세요.':'Story Camp에서 새 이야기를 연습하세요.'});
 const readable=JSON.parse(read('content/readable/readable-stories-A1-C2-60.json')||'[]');
 for(const r of readable){if(!r.content||r.status==='draft')continue;const number=String(r.id.split('-').at(-1)).padStart(3,'0'),id='readable:'+number;if(!groups.has(id))groups.set(id,{id,title:'Readable · '+number,href:'readable.html',levels:[],description:'새 글을 읽고 기억한 내용을 내 말로 이야기해 보세요.'});const g=groups.get(id);if(!g.levels.includes(r.level))g.levels.push(r.level);}
 return [...groups.values()];
}
const current=catalog(f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):null);
const previous=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')).items:[];
const dates=new Map(previous.map(x=>[x.id,x.publishedAt]));
if(current.some(x=>!dates.has(x.id))){
 const history=execFileSync('git',['log','--reverse','--format=%H %cI','--','audio-library.html','audio-lessons.js','guided-lauren003.js','audio-essays.js','audio-essays-002-media.js','audio-essays-002.js','storycamp-manifest.js','content/readable/readable-stories-A1-C2-60.json'],{encoding:'utf8'}).trim().split('\n');
 for(const row of history){const [sha,date]=row.split(' ');let items=[];try{items=catalog(f=>{try{return execFileSync('git',['show',sha+':'+f],{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{return null;}});}catch{continue;}for(const item of items)if(!dates.has(item.id))dates.set(item.id,date);}
}
const now=new Date().toISOString();
// Imported legacy content shares one repository timestamp. Use the known
// latest legacy release (Audio Essays 002) as the tie-break for that baseline.
const tieRank=x=>({guided:3,plain:4,boot:2,readable:1}[x.id.split(':')[0]]||0);
const items=current.map(x=>({...x,publishedAt:dates.get(x.id)||now})).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||tieRank(b)-tieRank(a)||b.id.localeCompare(a.id));
const output=JSON.stringify({version:1,items},null,2)+'\n';
if(process.argv.includes('--check')){if(!fs.existsSync(path)||fs.readFileSync(path,'utf8')!==output)throw Error('Run node scripts/update-home-news.mjs and commit home-news-feed.json');}
else fs.writeFileSync(path,output);
console.log('News feed: '+items.length+' upload groups; latest '+items.slice(0,2).map(x=>x.title).join(' / '));
