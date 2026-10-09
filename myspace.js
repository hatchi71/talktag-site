(() => {
 'use strict';
 const KEY='talktag-myspace-activity:v1',COMPLETED='talktag-content-completions:v1';
 const language=path=>path.startsWith('/japanese/')?'ja':path.startsWith('/korean')?'ko':'en';
 const mode=language(location.pathname);
 let storageUnavailable=false;
 const read=(key,fallback={})=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&typeof x==='object'&&!Array.isArray(x)?x:fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{storageUnavailable=true;return false}};
 const value=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const valid=href=>{try{const u=new URL(href,location.origin);return u.origin===location.origin&&!/backstage|\/api\/|meetup-map|offline/i.test(u.pathname)&&(/\.html$/.test(u.pathname)||u.pathname.endsWith('/'))?u:null}catch{return null}};
 function current(){
  const url=new URL(location.href);
  if(!valid(url.href))return null;
  for(const key of [...url.searchParams.keys()])if(!['id','family','level','unit','type','view','set','part'].includes(key))url.searchParams.delete(key);
  url.hash='';
  if(['/','/index.html','/korean.html','/japanese/','/japanese/index.html'].includes(url.pathname)){
   const view=document.querySelector('.view.active')?.id||'home';
   if(view==='myspace')return null;
   url.searchParams.set('view',view);
  }
  if(url.pathname.endsWith('/myspace.html'))return null;
  if(/\/toeic\/(index.html)?$/.test(url.pathname)){
   if(document.documentElement.dataset.toeicSetReady!=='true')return null;
   const set=value('toeic-selected-official-set-v1'),part=value('toeic-active-part')||'5';
   if(set&&set!=='local-legacy')url.searchParams.set('set',set);
   url.searchParams.set('part',part);
  }
  url.searchParams.sort();
  const href=url.pathname+url.search;
  let title=document.querySelector('.view.active .page-heading h2')?.textContent||document.title||'TalkTag';
  if(/\/toeic\/(index.html)?$/.test(url.pathname))title='TOEIC RC · '+(url.searchParams.has('set')?'연습문제 '+Number(url.searchParams.get('set').slice(4)):'저장 문제')+' · Part '+url.searchParams.get('part');
  if(url.pathname.endsWith('/vocalcamp-player.html')){
   const unit=window.TalkTagVocalPilots?.[0];
   if(unit)title='Vocal Camp · '+unit.familyNumber+' '+unit.title+' · '+unit.level;
  }
  if(url.pathname.endsWith('/storycamp-reader.html')){
   const family=window.TALKTAG_STORYCAMP?.families.find(x=>x.number===url.searchParams.get('family'));
   if(family)title='Story Camp · '+family.number+' '+family.title+' · '+url.searchParams.get('level');
  }
  title=title.replace(/\s+/g,' ').trim();
  return {href,title,language:mode,visitedAt:Date.now()};
 }
 function progress(entry){
  const u=new URL(entry.href,location.origin),p=u.searchParams;
  if(u.pathname.endsWith('/storycamp-reader.html')){
   const key='talktag-storycamp-card-'+p.get('family')+'-'+p.get('level');
   let stage=Number(value(key)||0);
   const legacyCounts={'001':{A1:7,A2:8,B1:10,B2:12,C1:16,C2:21},'002':{A1:6,A2:7,B1:8,B2:8,C1:8,C2:8}};
   const n=legacyCounts[p.get('family')]?.[p.get('level')];
   if(n&&value(key+':schema')!=='2'){if(stage>=n+2)stage--;try{localStorage.setItem(key,String(stage));localStorage.setItem(key+':schema','2')}catch{}}
   return stage>0?{label:'이어서 '+(stage+1)+'단계',stage}:null;
  }
  if(u.pathname.endsWith('/vocalcamp-player.html')){
   const state=read('talktag-vocal-pilot-simple-family-'+p.get('family')+'-'+p.get('level'));
   const rounds=Array.isArray(state.counts)?state.counts.reduce((n,x)=>n+(Number(x)||0),0):0;
   return state.card>0||rounds>0?{label:'이어서 '+((state.card||0)+1)+'단계'+(rounds?' · 반복 '+rounds+'회':''),stage:state.card||0}:null;
  }
  if(/\/toeic\/(index.html)?$/.test(u.pathname)){
   const set=p.get('set')||'local-legacy',part=p.get('part')||'5';
   const state=read('toeic-practice-position-v1')[set+':part'+part];
   const solved=read(set==='local-legacy'?'part'+part+'-desk-v1':'toeic-official-progress-v1:'+set+':part'+part).results;
   return state&&(state.index>0||Object.keys(solved||{}).length)?{label:'이어서 '+(state.index+1)+'번째 문제',stage:state.index}:null;
  }
  if(u.pathname.endsWith('/audio-player.html')||u.pathname.endsWith('/jlpt-n4-audio-player.html')){
   const audio=document.querySelector('audio'),prefix=mode==='ja'?'talktag-japanese-n4:':'talktag-audio:';
   const pos=Number(audio?.currentTime||read(prefix+p.get('id')).position||0);
   return pos>=1?{label:'이어서 '+Math.floor(pos/60)+':'+String(Math.floor(pos%60)).padStart(2,'0'),position:pos}:null;
  }
  return null;
 }
 let lastSignature='',timer;
 function record(){
  const entry=current();if(!entry)return;
  const checkpoint=progress(entry),signature=JSON.stringify([entry.href,entry.title,checkpoint]);
  if(signature===lastSignature)return;
  lastSignature=signature;
  const all=read(KEY);all[entry.href]={...all[entry.href],...entry,checkpoint};
  const rows=Object.values(all).filter(x=>valid(x.href)).sort((a,b)=>(b.visitedAt||0)-(a.visitedAt||0)).slice(0,300);
  write(KEY,Object.fromEntries(rows.map(x=>[x.href,x])));
 }
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{record();mount()},400)};
 let host,lists,toeicCatalog;
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node};
 function row(item,detail){
  const li=make('li'),a=make('a'),url=valid(item.href);
  if(!url)return null;
  a.href=url.pathname+url.search;
  a.append(make('span',item.title,'tt-myspace-title'));
  if(detail)a.append(make('small',detail));
  const arrow=make('span','↗','tt-myspace-arrow');arrow.setAttribute('aria-hidden','true');a.append(arrow);li.append(a);return li;
 }
 function fill(list,items,empty,detail){
  list.replaceChildren();
  items.forEach(x=>{const node=row(x,detail(x));if(node)list.append(node)});
  if(!list.children.length)list.append(make('li',empty,'tt-myspace-empty'));
 }
 function fallback(id,data){
  if(data.href&&data.title&&valid(data.href))return data;
  const match=id.match(/^(storycamp|vocalcamp)-family:(\d{3})$/);
  if(match){
   const [_,camp,number]=match;
   const catalog=window[camp==='storycamp'?'TALKTAG_STORYCAMP_MANIFEST':'TALKTAG_VOCALCAMP_MANIFEST'];
   const family=catalog?.families.find(x=>x.number===number);if(!family)return null;
   return {...data,language:'en',title:(camp==='storycamp'?'Story Camp':'Vocal Camp')+' · '+number+' '+family.title,href:'/'+camp+'-family.html?family='+number};
  }
  const lesson=id.startsWith('audio:')&&window.TalkTagAudioLessons?.find(x=>x.id===id.slice(6));
  if(lesson)return {...data,language:'en',title:lesson.level+' · '+lesson.title,href:'/audio-player.html?id='+encodeURIComponent(lesson.id)};
  const reading=id.match(/^readable:(A1|A2|B1|B2|C1|C2):(\d+)$/);
  if(reading)return {...data,language:'en',title:'Readable · '+reading[1]+' · '+reading[2],href:'/'+(['C1','C2'].includes(reading[1])?'readable-advanced':'readable-strict')+'.html?level='+reading[1]+'&id='+reading[2]};
  return null;
 }
 function refresh(){
  if(!host)return;
  const imported=read(KEY);
  function restore(href,title){
   if(imported[href])return;
   const entry={href,title,language:language(href),visitedAt:null},checkpoint=progress(entry);
   if(checkpoint)imported[href]={...entry,checkpoint};
  }
  // Import known saved positions, not fabricated browser history.
  try{
   for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    let match=key.match(/^talktag-storycamp-card-(\d{3})-(A1|A2|B1|B2|C1|C2)$/);
    let camp='storycamp';
    if(!match){match=key.match(/^talktag-vocal-pilot-simple-family-(\d{3})-(A1|A2|B1|B2|C1|C2)$/);camp='vocalcamp'}
    if(match){
     const family=window[camp==='storycamp'?'TALKTAG_STORYCAMP_MANIFEST':'TALKTAG_VOCALCAMP_MANIFEST']?.families.find(x=>x.number===match[1]);
     if(family)restore('/'+camp+(camp==='storycamp'?'-reader':'-player')+'.html?family='+match[1]+'&level='+match[2],(camp==='storycamp'?'Story Camp':'Vocal Camp')+' · '+match[1]+' '+family.title+' · '+match[2]);
    }
   }
   for(const lesson of window.TalkTagAudioLessons||[])restore('/audio-player.html?id='+encodeURIComponent(lesson.id),lesson.level+' · '+lesson.title);
   for(const slot of Object.keys(read('toeic-practice-position-v1'))){
    const match=slot.match(/^(RC-S\d{3}):part([567])$/);
    const set=match&&toeicCatalog?.sets.find(x=>x.id===match[1]&&x.published);
    if(set)restore('/toeic/?part='+match[2]+'&set='+match[1],'TOEIC RC · '+set.title+' · Part '+match[2]);
   }
  }catch{}
  write(KEY,imported);
  if(storageUnavailable)host.querySelector('.tt-myspace-note').textContent='이 브라우저에서 기록을 저장하지 못하고 있습니다. 브라우저의 저장 설정 또는 남은 공간을 확인해 주세요.';
  const rows=Object.values(imported).filter(x=>x.language===mode&&valid(x.href)).sort((a,b)=>(b.visitedAt||0)-(a.visitedAt||0));
  fill(lists.recent,rows.filter(x=>x.visitedAt),'방문한 페이지가 여기에 표시됩니다. 도입 이전의 방문 이력은 복원하지 않습니다.',x=>new Date(x.visitedAt).toLocaleDateString('ko-KR'));
  rows.forEach(x=>{if(x.href.includes('/storycamp-reader.html'))x.checkpoint=progress(x)});
  fill(lists.continue,rows.filter(x=>x.checkpoint),'저장된 훈련 단계나 재생 위치가 있는 항목이 여기에 표시됩니다.',x=>x.checkpoint.label);
  const done=Object.entries(read(COMPLETED)).filter(([id,x])=>x&&x.source!=='automatic'&&(!id.startsWith('audio:')||x.source==='manual')).map(([id,x])=>fallback(id,x)).filter(x=>x&&x.language===mode);
  done.sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||'')));
  fill(lists.complete,done,'수동으로 완료 표시한 미션이 여기에 표시됩니다.',()=> '수동 완료');
 }
 function mount(){
  if(!host){
   host=document.getElementById('myspace');
   if(!host&&location.pathname==='/japanese/myspace.html')host=document.querySelector('.ja-empty');
   if(!host)return;
   host.replaceChildren();host.classList.add('tt-myspace');
   host.append(make('h2','MySpace'),make('p','이 브라우저의 학습 기록입니다. 기기 간 동기화와 회원 데이터베이스 저장은 아직 연결되지 않았습니다.','tt-myspace-note'));
   lists={};
   for(const [key,label] of [['recent','최근 방문 · Recently visited'],['continue','이어서 훈련하기 · Continue training'],['complete','완료한 미션 · Completed missions']]){
    const section=make('section',null,'tt-myspace-section');section.append(make('h3',label));lists[key]=make('ul');lists[key].dataset.myspaceList=key;section.append(lists[key]);host.append(section);
   }
   refresh();
   for(const src of ['/storycamp-manifest.js','/vocalcamp-manifest.js','/audio-lessons.js']){
    const s=document.createElement('script');s.src=src+'?v=20261008-myspace';s.onload=refresh;document.head.append(s);
   }
   fetch('/toeic/content/rc/manifest.json',{cache:'no-cache'}).then(r=>{if(r.ok)return r.json()}).then(data=>{toeicCatalog=data;refresh()}).catch(()=>{});
  }else refresh();
 }
 function completion(event){
  const {id,completed}=event.detail||{};if(!id)return;
  if(completed){
   const all=read(COMPLETED),data=all[id];
   if(data){
    const card=[...document.querySelectorAll('[data-completion-id]')].find(x=>x.dataset.completionId===id);
    const anchor=card?.matches('a[href]')?card:card?.querySelector('a[href]');
    const url=valid(anchor?.href||location.href);
    let title=card?.querySelector('h2,h3')?.textContent||document.title;
    const family=id.match(/^(storycamp|vocalcamp)-family:(\d{3})$/);
    if(family)title=(family[1]==='storycamp'?'Story Camp':'Vocal Camp')+' · '+family[2]+' '+title;
    if(url){all[id]={...data,href:url.pathname+url.search,title:title.trim(),language:language(url.pathname)};write(COMPLETED,all)}
   }
  }
  refresh();
 }
 function boot(){
  const css=document.createElement('link');css.rel='stylesheet';css.href='/myspace.css?v=20261008-1';document.head.append(css);
  mount();record();
  new MutationObserver(schedule).observe(document.querySelector('title')||document.head,{childList:true,subtree:true,characterData:true});
  document.querySelectorAll('.view').forEach(view=>new MutationObserver(schedule).observe(view,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('click',event=>{if(!event.target.closest('.tt-myspace'))schedule()});
  let lastAudioRecord=0;
  document.addEventListener('timeupdate',()=>{if(Date.now()-lastAudioRecord>5000){lastAudioRecord=Date.now();record()}},true);
  addEventListener('pagehide',record);addEventListener('pageshow',schedule);
  addEventListener('storage',()=>{refresh()});
  addEventListener('talktag:completion-change',completion);
  window.TalkTagMySpace={record,refresh};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
