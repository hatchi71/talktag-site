(() => {
 'use strict';
 const lessons=window.TalkTagKoreanStarters.filter(x=>x.published),KEY='talktag-korean-starters:v1';
 let storageOK=true,state;
 try{state=JSON.parse(localStorage.getItem(KEY)||'{}');if(!state||typeof state!=='object'||Array.isArray(state))state={}}catch{state={};storageOK=false}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{storageOK=false;const s=document.getElementById('kr-save-status');if(s)s.textContent='Storage unavailable. Your work lasts only for this visit.'}};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const link=(x,mode='practice')=>'K-korean-starter.html?id='+x.id+'&type='+mode;
 const cards=(mode='practice',hideDone=false)=>lessons.filter(x=>!hideDone||!state[x.id]?.done).map(x=>`<article class="kr-card"><div class="kr-kicker">${x.id} · ${esc(x.topic)}</div><h3>${esc(x.title)}</h3><p lang="ko">${esc(x.koTitle)}</p><p class="kr-muted">${esc(x.goal)}</p><span class="kr-tag">Starter · 6 expressions${state[x.id]?.done?' · Completed':''}</span><br><a href="${link(x,mode)}">${mode==='story'?'Remember and retell':mode==='read'?'Read and retell':'Open practice'} →</a></article>`).join('');
 function shelf(){const done=lessons.filter(x=>state[x.id]?.done);return `<details class="kr-card kr-shelf"><summary>Completed Korean missions · ${done.length} / ${lessons.length}</summary><p class="kr-muted">Your Korean starter collection only. Reopen a lesson from the beginning, or undo completion.</p>${done.map(x=>`<div class="kr-done-row"><a href="${link(x)}">${x.id} · ${esc(x.title)}</a><button data-undo="${x.id}">Undo</button></div>`).join('')||'<p>No completed missions yet.</p>'}</details>`}
 function wireUndo(){document.querySelectorAll('[data-undo]').forEach(b=>b.onclick=()=>{state[b.dataset.undo]={...state[b.dataset.undo],done:false,step:0};save();location.reload()})}
 function recent(x){state[x.id]={...state[x.id],visitedAt:Date.now()};save()}
 function records(){const visited=lessons.filter(x=>state[x.id]?.visitedAt).sort((a,b)=>state[b.id].visitedAt-state[a.id].visitedAt);return `<div class="kr-kicker">YOUR KOREAN SPACE</div><h1>Small steps, remembered.</h1><p>Records are saved in this browser only—not synced across devices.</p>${!storageOK?'<p role="status">Browser storage is unavailable.</p>':''}<section class="kr-card"><h2>Recently visited</h2>${visited.map(x=>`<p><a href="${link(x)}">${x.id} · ${esc(x.title)}</a></p>`).join('')||'<p>Open a starter lesson to begin.</p>'}</section><section class="kr-card kr-section"><h2>Continue training</h2>${visited.filter(x=>!state[x.id].done&&state[x.id].step>0).map(x=>`<p><a href="${link(x)}">${esc(x.title)} · step ${state[x.id].step+1} / 4 →</a></p>`).join('')||'<p>Your unfinished lesson stages will appear here.</p>'}</section>${shelf()}`}
 if(document.body.dataset.krPage==='home'){
  const homeLessons=document.getElementById('kr-home-lessons');
  if(homeLessons)homeLessons.innerHTML=cards();
  const view=new URLSearchParams(location.search).get('view')||'home';
  document.querySelector(`[data-kr-nav="${['home','myspace','talktag','discussions','tests'].includes(view)?view:'home'}"]`)?.setAttribute('aria-current','page');
  const other=document.getElementById('kr-other');
  if(['myspace','talktag','discussions','tests'].includes(view)){
   document.getElementById('kr-home').hidden=true;other.hidden=false;
   if(view==='myspace')other.innerHTML=records();
   if(view==='talktag')other.innerHTML=`<div id="talktag" class="kr-talktag-notice"><div class="kr-kicker">TALK &amp; TAG</div><h1>Talk &amp; Tag</h1><p>Find a meet-up. Join the conversation. Meet in real life.</p><div class="meetup-board">
<article class="kr-starter-notice" aria-labelledby="kr-starter-title">
  <div class="kr-kicker">FREE KOREAN STARTER SESSIONS</div>
  <h2 id="kr-starter-title">Learn Korean together in Uijeongbu.</h2>
  <p>Beginner-friendly practice with a native Korean instructor.</p>
  <div class="kr-starter-times" aria-label="Korean class times">
    <div><span>Saturday</span><strong><time datetime="16:00">4:00 p.m.</time></strong></div>
    <div><span>Sunday</span><strong><time datetime="14:00">2:00 p.m.</time></strong></div>
  </div>
  <div class="kr-starter-location"><span>Where we meet</span><strong>Uijeongbu, Gyeonggi-do</strong><small>Ask in the Kakao chat room for the exact meeting place and next session.</small></div>
  <a class="kr-button kr-primary" href="https://open.kakao.com/o/gyZiY3Hi" target="_blank" rel="noopener noreferrer" aria-label="Ask about Korean Starter Sessions in the Kakao chat room (opens in a new tab)">Ask in Kakao chat ↗</a>
</article></div></div>`;
   if(view==='discussions')other.innerHTML=`<div class="kr-kicker">CONVERSATION STARTERS</div><h1>Something to talk about.</h1><p>Use these prompts with a partner. This is a practice board, not a live chat.</p><div class="kr-grid">${lessons.map(x=>`<article class="kr-card"><div class="kr-kicker">${x.id} · ${esc(x.topic)}</div><h2 lang="ko" class="kr-ko">${esc(x.partner)}</h2><p>${esc(x.partnerEn)}</p><a href="${link(x)}">Prepare your answer →</a></article>`).join('')}</div>`;
   if(view==='tests')other.innerHTML='<div class="kr-kicker">TEST PREPPERS</div><h1>First, Korean you can use.</h1><section class="kr-card"><h2>Korean test preparation · Coming soon</h2><p>There are no published Korean exam drills yet. Start with practical Korean while this section is being prepared.</p><a href="K-korean-learning.html">Explore starter lessons →</a></section>';
   document.title=({myspace:'Korean MySpace',talktag:'Korean Talk & Tag',discussions:'Korean conversation starters',tests:'Korean test preparation'}[view])+' · TalkTag';wireUndo();
  }
  async function news(){try{const r=await fetch('home-news-feed.json',{cache:'no-store'});if(!r.ok)return;const f=await r.json();f.items.filter(x=>x.language==='ko').slice(0,2).forEach((x,i)=>{const c=document.querySelector(`[data-kr-news="${i}"]`);if(!c)return;c.href=x.href;c.querySelector('h3').textContent=x.title;c.querySelector('p').textContent=x.description||'Korean practice · '+x.levels.join(' / ');c.querySelector('strong').textContent='Open collection →'})}catch{}}
  news();addEventListener('pageshow',news);
  document.getElementById('kr-share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);document.getElementById('kr-share').textContent='Copied'}else{document.getElementById('kr-share').textContent='Use browser Share'}}catch(e){if(e.name!=='AbortError')document.getElementById('kr-share').textContent='Use browser Share'}};
  return;
 }
 const params=new URLSearchParams(location.search),lesson=lessons.find(x=>x.id===params.get('id')),mode=['story','read'].includes(params.get('type'))?params.get('type'):'practice';
 const studio=document.getElementById('kr-studio'),host=document.getElementById('kr-lesson');
 document.getElementById('kr-back').href='K-korean-learning.html';document.getElementById('kr-back').textContent='← Studio';
 const track=params.get('type');
 if(!lesson&&(track==='story'||track==='vocal')){
  const title=track==='story'?'Story Camp':'Vocal Camp';
  document.title='Korean '+title+' · TalkTag';
  const brand=document.querySelector('.kr-brand span');if(brand)brand.innerHTML=title+'<small>KOREAN · BOOT CAMP</small>';
  studio.innerHTML='<div class="kr-kicker">KOREAN · BOOT CAMP</div><h1>'+title+'</h1><p>'+(track==='story'?'Build a short Korean story, remember it, and tell it in your own words.':'Build a Korean story through cumulative listening and speaking.')+'</p><section id="koreanCampBrowser"></section>';
  window.TalkTagCampBrowser.mount(document.getElementById('koreanCampBrowser'),{camp:track,language:'ko',starters:lessons,starterDone:x=>Boolean(state[x.id]?.done),starterUndo:id=>{state[id]={...state[id],done:false,step:0};save()}});
  return;
 }
 if(track==='essays'){
  const target=new URL('K-korean-audio-library.html',location.href);target.searchParams.set('type','plain');const level=params.get('level');if(level)target.searchParams.set('level',level);location.replace(target.href+location.hash);return;
 }
 if(track==='vocal'){
  const title='Vocal Camp';document.title='Korean '+title+' · TalkTag';
  studio.innerHTML='<div class="kr-kicker">KOREAN · COMING SOON</div><h1>'+title+'</h1><section class="kr-card"><h2>Recordings are in preparation.</h2><p>This section will use the same learning structure as the English Studio, with Korean audio and English guidance. No recorded Korean lessons are available here yet.</p><a class="kr-button" href="K-korean-starter.html?type=practice">Try the Korean starter expressions →</a></section>';return;
 }
 if(!lesson){
  const label=mode==='story'?'Story Camp':mode==='read'?'Readable':'Guided Listen & Repeat';
  document.title='Korean '+label+' · Starter collection · TalkTag';
  studio.innerHTML='<div class="kr-kicker">KOREAN · STARTER COLLECTION · 001–006</div><h1>'+label+'</h1><p>'+(mode==='practice'?'Short Korean expressions with English support. These starter previews offer optional device-generated pronunciation, not recorded repetition drills.':mode==='story'?'Remember a short Korean scene, then rebuild it and tell it in your own words.':'Read a short Korean scene. Close it. Tell it in your own words.')+'</p><p>'+lessons.filter(x=>state[x.id]?.done).length+' / '+lessons.length+' starter missions completed. These activities share the same starter themes and progress.</p><div class="kr-grid">'+(cards(mode,true)||'<p>All starter missions completed. Reopen them below whenever you like.</p>')+'</div>'+shelf();wireUndo();return;
 }
 studio.hidden=true;host.hidden=false;document.getElementById('kr-back').href=mode==='story'?'K-korean-starter.html?type=story&level='+encodeURIComponent(params.get('level')||'A1'):'K-korean-learning.html';document.getElementById('kr-back').textContent=mode==='story'?'← Story Camp':'← Studio';
 const firstStep=mode==='practice'?0:2;
 let step=state[lesson.id]?.done?firstStep:Math.min(3,Math.max(0,Number(state[lesson.id]?.step??firstStep)||0));
 const steps=['Expressions','Build sentences','Read & remember','Retell & share'];let script='both';
 recent(lesson);document.title=lesson.id+' · '+lesson.title+' · Korean '+(mode==='practice'?'practice':mode==='story'?'Story Camp':'Readable');
 host.innerHTML=`<div class="kr-kicker">${lesson.id} · ${esc(lesson.topic)} · ${mode==='practice'?'EXPRESSION PRACTICE':mode==='story'?'STORY CAMP':'READABLE'}</div><h1>${esc(lesson.title)}</h1><p lang="ko" class="kr-ko">${esc(lesson.koTitle)}</p><p>${esc(lesson.goal)}</p><div class="kr-stepbar" aria-label="Lesson steps">${steps.map((s,i)=>`<button data-step="${i}">${i+1} · ${s}</button>`).join('')}</div><section id="kr-stage" class="kr-card"></section><div class="kr-actions"><button id="kr-prev">← Previous step</button><button id="kr-next" class="kr-primary">Next step →</button></div><p id="kr-save-status" class="kr-status" role="status">${storageOK?'Your notes and unfinished stage are saved in this browser.':'Storage unavailable. Your work lasts only for this visit.'}</p><a class="kr-button" href="K-korean.html?view=myspace">My Korean progress →</a>`;
 const speech=window.speechSynthesis;const voices=()=>speech?speech.getVoices().filter(v=>/^ko(?:-|_)/i.test(v.lang)):[];
 function speak(text,b){if(!speech||!voices().length){const n=document.getElementById('kr-voice-status');if(n)n.textContent='No Korean voice is available on this device. Read aloud yourself; the lesson still works.';return}speech.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.voice=voices()[0];u.rate=.85;u.onstart=()=>{b.textContent='Speaking…'};u.onend=u.onerror=()=>{b.textContent='Listen'};speech.speak(u)}
 function render(){speech?.cancel();document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===step)));document.getElementById('kr-prev').disabled=step===0;const next=document.getElementById('kr-next');next.textContent=step===3?'Mark mission complete ✓':'Next step →';const stage=document.getElementById('kr-stage');
  if(step===0){stage.innerHTML=`<h2>Say one useful thing.</h2><p class="kr-muted">${esc(lesson.note)}</p><div class="kr-stepbar" aria-label="Script display"><button data-script="ko" aria-pressed="${script==='ko'}">KO</button><button data-script="both" aria-pressed="${script==='both'}">KO + EN</button></div>${lesson.lines.map(([ko,en],i)=>`<div class="kr-line"><div class="kr-line-top"><span class="kr-ko" lang="ko">${esc(ko)}</span><button data-speak="${i}" aria-label="Listen to expression ${i+1}">Listen</button></div><p class="kr-en" ${script==='ko'?'hidden':''}>${esc(en)}</p></div>`).join('')}<p id="kr-voice-status" class="kr-status" role="status">Optional device-generated pronunciation—not recorded QC audio. Voice availability and sound vary by device.</p><button id="kr-stop">Stop voice</button>`;
  stage.querySelectorAll('[data-script]').forEach(b=>b.onclick=()=>{script=b.dataset.script;render()});stage.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>speak(lesson.lines[Number(b.dataset.speak)][0],b));document.getElementById('kr-stop').onclick=()=>speech?.cancel();
  }else if(step===1){stage.innerHTML=`<h2>Make it true for you.</h2><p lang="ko" class="kr-ko">${esc(lesson.pattern[0])}</p><p class="kr-en">${esc(lesson.pattern[1])}</p><p>Change the blank, then add one more sentence from the expressions. Say both aloud.</p><label for="kr-note">My sentences</label><textarea id="kr-note" placeholder="Write your own Korean here…">${esc(state[lesson.id]?.notes?.[step]||'')}</textarea>`}
  else if(step===2){stage.innerHTML=`<h2>Read it. Close it. Remember.</h2><p>Read the scene, then hide it and recall the main ideas. You do not need to memorize every word.</p><button id="kr-hide" aria-expanded="true">Hide story</button><div id="kr-reading"><p lang="ko" class="kr-ko">${esc(lesson.story)}</p><details><summary>English meaning</summary><p>${esc(lesson.meaning)}</p></details></div><p class="kr-muted">${esc(lesson.prompt)}</p>`;document.getElementById('kr-hide').onclick=e=>{const r=document.getElementById('kr-reading');r.hidden=!r.hidden;e.target.textContent=r.hidden?'Show story':'Hide story';e.target.setAttribute('aria-expanded',String(!r.hidden))}}
  else{stage.innerHTML=`<h2>Tell it in your own words.</h2><p>${esc(lesson.prompt)}</p><p>Speak without looking. Then ask your partner:</p><p lang="ko" class="kr-ko">${esc(lesson.partner)}</p><p class="kr-en">${esc(lesson.partnerEn)}</p><label for="kr-note">Words I want to keep</label><textarea id="kr-note" placeholder="Useful words or a note for next time…">${esc(state[lesson.id]?.notes?.[step]||'')}</textarea><p class="kr-muted">Working alone? Answer the question aloud and imagine one follow-up question.</p>`}
  stage.querySelector('textarea')?.addEventListener('input',e=>{const s=state[lesson.id]||{};state[lesson.id]={...s,notes:{...s.notes,[step]:e.target.value}};save()});
 }
 function move(n){step=n;state[lesson.id]={...state[lesson.id],step};save();render()}
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>move(Number(b.dataset.step)));document.getElementById('kr-prev').onclick=()=>move(Math.max(0,step-1));document.getElementById('kr-next').onclick=()=>{if(step<3)move(step+1);else{state[lesson.id]={...state[lesson.id],done:true,step:0,completedAt:Date.now()};save();location.href=mode==='story'?'K-korean-starter.html?type=story&level='+encodeURIComponent(params.get('level')||'A1'):'K-korean-learning.html'}};
 addEventListener('pagehide',()=>speech?.cancel());render();
})();
