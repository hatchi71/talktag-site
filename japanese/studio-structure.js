/* Japanese Studio uses the same three-track hierarchy as English/Korean. */
(() => {
 const init=()=>{
  const file=location.pathname.split('/').pop()||'index.html';
  if(file==='bootcamp.html'||file==='listen-repeat.html'){location.replace('snowballing.html'+(file==='bootcamp.html'?'#boot-camp':'#sound-check'));return;}
  const css=document.createElement('link');css.rel='stylesheet';css.href='/japanese/studio-structure.css?v=20261011';document.head.append(css);
  const studio='snowballing.html',sound=studio+'#sound-check',boot=studio+'#boot-camp';
  document.querySelectorAll('a[href="bootcamp.html"]').forEach(a=>a.href=boot);
  document.querySelectorAll('a[href="listen-repeat.html"]').forEach(a=>{a.href=sound;if(a.textContent.trim()==='Listen & Repeat')a.textContent='Sound Check'});
  document.querySelectorAll('.ja-related').forEach(nav=>{nav.innerHTML='<a href="'+sound+'">01 · Sound Check</a><a href="'+boot+'">02 · Boot Camp</a><a href="readable.html">03 · Readable</a>';});
  const titles={'vocal-camp.html':['Vocal Camp','同じ物語を、声から。','원어민의 음성을 듣고 따라하세요. 한 문장씩 소리가 자라납니다. 이야기의 끝까지 따라가 보세요!'],'story-camp.html':['Story Camp','STORY CAMP · REBUILD','이야기를 쌓고, 기억해서 말하고, 나의 이야기로 바꿉니다.'],'readable.html':['Readable','READ → RECALL → RETELL','읽고, 덮고, 기억한 내용을 내 말로 다시 이야기합니다.'],'audio-essays.html':['Audio Essays & Articles','SOUND CHECK · LONGER LISTENING','이야기를 듣고, 기억한 핵심 내용을 노트에 정리한 뒤 자신이나 파트너에게 다시 이야기해 보세요.']};
  const info=titles[file];if(!info)return;
  const main=document.querySelector('main');if(!main)return;document.body.classList.add('ja-studio-aligned');
  const title=info[0],camp=/^(vocal|story)-camp/.test(file),parent=camp?boot:file==='audio-essays.html'?sound:studio;
  const back=document.querySelector('.tt-route-previous'),category=document.querySelector('.tt-route-category');
  if(back){const a=document.createElement('a');a.className=back.className;a.href=parent;a.innerHTML='<span aria-hidden="true">←</span><b>이전으로</b>';back.replaceWith(a)}
  if(category){category.href=parent;category.innerHTML='<span aria-hidden="true">⌂</span><b>Studio</b>'}
  const brand=document.querySelector('.ja-brand span');if(brand)brand.textContent=title;
  let content='<section class="ja-hero"><p class="ja-kicker">'+info[1]+'</p><h1>'+title+'</h1><p>'+info[2]+'</p></section>';
  if(file==='audio-essays.html')content+='<nav class="ja-related" aria-label="Sound Check 듣기 과정"><a href="guided.html">Guided L&amp;R</a><a href="audio-essays.html" aria-current="page">Essays &amp; Articles</a></nav>';
  if(camp){content+='<section aria-labelledby="ja-series-title"><p class="ja-series-label">NUMBERED STORY SERIES · 001–999</p><h2 id="ja-series-title">Story Family를 선택하세요</h2><label class="ja-search">번호 또는 제목 찾기<input type="search" placeholder="공개된 이야기를 준비하고 있습니다" disabled aria-describedby="ja-empty-status"></label><p id="ja-empty-status">공개 0개 · 일본어 이야기를 준비 중입니다.</p></section>';}else{
   content+='<nav class="ja-levels" aria-label="학습 레벨">'+['A1','A2','B1','B2','C1','C2'].map(level=>'<a data-group="'+level[0]+'" href="'+(file==='readable.html'?'readable':'audio-essays')+'-'+level.toLowerCase()+'.html"><span>'+level+'</span><small>준비 중</small></a>').join('')+'</nav>';
  }
  content+='<section class="ja-empty"><h2>준비 중</h2><p>'+title+'의 일본어 자료는 아직 공개되지 않았습니다. 실제 콘텐츠와 음원이 준비되면 이곳에 표시됩니다.</p><a href="guided.html">공개된 Japanese Guided L&amp;R 001 연습하기 →</a></section><details class="ja-shelf"><summary>완료한 미션</summary><p>이 과정에서 완료한 미션이 이곳에 모입니다. 아직 공개된 미션이 없습니다.</p></details><p class="ja-note">A1–C2는 학습 난이도 안내이며, 공식 CEFR 평가나 JLPT 등급 환산이 아닙니다.</p><nav class="ja-related" aria-label="Studio 학습 공간"><a href="'+sound+'">01 · Sound Check</a><a href="'+boot+'">02 · Boot Camp</a><a href="readable.html">03 · Readable</a></nav>';
  main.innerHTML=content;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
