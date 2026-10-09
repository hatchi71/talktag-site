/* Small accent markers. Tags describe the recording, not a speaker's citizenship. */
(function(){
 'use strict';
 const names={BK:'British English',AU:'Australian English',IN:'Indian English',US:'American English'};
 const decode=value=>{try{return decodeURIComponent(String(value||''));}catch{return String(value||'');}};
 function code(record){
  const explicit=String(record?.accentTag||record?.accent||'').toUpperCase().replace(/[()]/g,'');
  if(names[explicit])return explicit;
  const strings=[];const seen=new WeakSet();
  function walk(value){if(typeof value==='string')strings.push(decode(value));else if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);if(Array.isArray(value))value.forEach(walk);else Object.entries(value).forEach(([key,v])=>{if(!['lines','expressions','meanings','translation','cues','fullText','segments','referenceSummary','keyLanguage'].includes(key))walk(v);});}}
  walk(record);const tag=strings.join(' ').match(/\((BK|AU|IN)\)/i);return tag?tag[1].toUpperCase():'US';
 }
 function badge(record){const c=code(record),span=document.createElement('span');span.className='tt-audio-accent';span.dataset.accent=c;span.setAttribute('role','img');span.setAttribute('aria-label',names[c]);span.title=names[c];const img=document.createElement('img');img.src='/assets/audio-flags/'+c.toLowerCase()+'.svg';img.alt='';img.width=24;img.height=16;span.append(img);return span;}
 function put(target,record){if(!target)return;const c=code(record);const old=target.querySelector(':scope > .tt-audio-accent');if(old?.dataset.accent===c)return;if(old)old.remove();target.append(badge(record));}
 function refresh(){
  const english=!/\/(japanese|korean)(\/|\.html)/i.test(location.pathname)&&!location.pathname.includes('snowballing-studio-ko');
  if(!english)return;
  const lessons=window.TalkTagAudioLessons||[],params=new URLSearchParams(location.search);
  document.querySelectorAll('.lesson-card,.audio-mission-row').forEach(card=>{const link=card.querySelector('a[href*="audio-player.html"]');const id=(card.dataset.completionId||'').replace(/^audio:/,'')|| (link&&new URL(link.href).searchParams.get('id'));const lesson=lessons.find(l=>l.id===id);if(lesson)put(card.querySelector('h2,strong'),lesson);});
  const lesson=lessons.find(l=>l.id===params.get('id'));if(lesson)put(document.getElementById('lessonTitle'),lesson);
  const pilots=window.TalkTagVocalPilots||[];const unit=pilots.find(p=>p.id===params.get('unit'))||pilots[0];
  if(unit)put(document.querySelector('.pilot-intro h1'),unit);
  document.querySelectorAll('.vb-audio-card').forEach(card=>{const id=new URL(card.href).searchParams.get('unit');const p=pilots.find(p=>p.id===id);if(p)put(card.querySelector('.vb-audio-copy strong'),p);});
  const families=window.TALKTAG_VOCALCAMP_MANIFEST?.families||[];
  if(document.body.dataset.camp==='vocal')document.querySelectorAll('.family-card,.story-leaf-row').forEach(card=>{const a=card.matches('a')?card:card.querySelector('a');if(!a)return;const n=new URL(a.href).searchParams.get('family');const f=families.find(f=>f.number===n);if(f)put(card.querySelector('h3,strong'),f);});
  if(/vocalcamp-family\.html$/.test(location.pathname)){const f=families.find(f=>f.number===params.get('family'));if(f)put(document.getElementById('familyTitle'),f);}
  document.querySelectorAll('[data-audio-accent]:not(script)').forEach(node=>put(node,{accentTag:node.dataset.audioAccent}));
  document.querySelectorAll('audio[src]').forEach(a=>{const section=a.closest('article,section');const title=section?.querySelector('h1,h2,h3');if(title&&!title.querySelector('.tt-audio-accent'))put(title,{audio:a.src});});
 }
 window.TalkTagAudioAccent={code,badge,refresh};
 const style=document.createElement('link');style.rel='stylesheet';style.href='/audio-accent.css?v=20261009-flags';document.head.append(style);
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});}
 document.addEventListener('DOMContentLoaded',schedule);if(document.readyState!=='loading')schedule();
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-audio-accent']});
})();
