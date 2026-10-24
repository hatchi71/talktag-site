/* Japanese Studio uses the same three-track hierarchy as English/Korean. */
(() => {
 const init=()=>{
  const file=location.pathname.split('/').pop()||'J-index.html';
  if(file==='J-bootcamp.html'||file==='J-listen-repeat.html'){location.replace('J-snowballing.html'+(file==='J-bootcamp.html'?'#boot-camp':'#sound-check'));return;}
  const css=document.createElement('link');css.rel='stylesheet';css.href='/japanese/studio-structure.css?v=20261011';document.head.append(css);
  const studio='J-snowballing.html',sound=studio+'#sound-check',boot=studio+'#boot-camp';
  document.querySelectorAll('a[href="J-bootcamp.html"]').forEach(a=>a.href=boot);
  document.querySelectorAll('a[href="J-listen-repeat.html"]').forEach(a=>{a.href=sound;if(a.textContent.trim()==='듣고 따라 말하기')a.textContent='사운드 체크'});
  document.querySelectorAll('.ja-related').forEach(nav=>{nav.innerHTML='<a href="'+sound+'">01 · 사운드 체크</a><a href="'+boot+'">02 · 부트 캠프</a><a href="J-readable.html">03 · 리더블</a>';});
  const titles={'J-vocal-camp.html':['보컬 캠프','同じ物語を、声から。','원어민의 음성을 듣고 따라하세요. 한 문장씩 소리가 자라납니다. 이야기의 끝까지 따라가 보세요!'],'J-story-camp.html':['스토리 캠프','STORY CAMP · REBUILD','이야기를 쌓고, 기억해서 말하고, 나의 이야기로 바꿉니다.'],'J-readable.html':['리더블','READ → RECALL → RETELL','읽고, 덮고, 기억한 내용을 내 말로 다시 이야기합니다.'],'J-audio-essays.html':['오디오 에세이와 아티클','SOUND CHECK · LONGER LISTENING','이야기를 듣고, 기억한 핵심 내용을 노트에 정리한 뒤 자신이나 파트너에게 다시 이야기해 보세요.']};
  const info=titles[file];if(!info)return;
  // Camp landings are owned by the shared level-first browser, not this legacy placeholder.
  if(file==='J-vocal-camp.html'||file==='J-story-camp.html')return;
  const main=document.querySelector('main');if(!main)return;document.body.classList.add('ja-studio-aligned');
  const title=info[0],camp=/^(vocal|story)-camp/.test(file),parent=camp?boot:file==='J-audio-essays.html'?sound:studio;
  const back=document.querySelector('.tt-route-previous'),category=document.querySelector('.tt-route-category');
  if(back){const a=document.createElement('a');a.className=back.className;a.href=parent;a.innerHTML='<span aria-hidden="true">←</span><b>이전으로</b>';back.replaceWith(a)}
  if(category){category.href=parent;category.innerHTML='<span aria-hidden="true">⌂</span><b>스노우볼링 스튜디오</b>'}
  const brand=document.querySelector('.ja-brand span');if(brand)brand.textContent=title;
  let content='<section class="ja-hero"><p class="ja-kicker">'+info[1]+'</p><h1>'+title+'</h1><p>'+info[2]+'</p></section>';
  if(file==='J-audio-essays.html')content+='<nav class="ja-related" aria-label="사운드 체크 듣기 과정"><a href="J-guided.html">듣고 따라 말하기</a><a href="J-audio-essays.html" aria-current="page">오디오 에세이와 아티클</a></nav>';
  if(camp){content+='<section aria-labelledby="ja-series-title"><p class="ja-series-label">NUMBERED STORY SERIES · 001–999</p><h2 id="ja-series-title">Story Family를 선택하세요</h2><label class="ja-search">번호 또는 제목 찾기<input type="search" placeholder="공개된 이야기를 준비하고 있습니다" disabled aria-describedby="ja-empty-status"></label><p id="ja-empty-status">공개 0개 · 일본어 이야기를 준비 중입니다.</p></section>';}else{
   content+='<nav class="ja-levels" aria-label="학습 레벨">'+['A1','A2','B1','B2','C1','C2'].map(level=>'<a data-group="'+level[0]+'" href="'+(file==='J-readable.html'?'readable':'audio-essays')+'-'+level.toLowerCase()+'.html"><span>'+level+'</span><small>준비 중</small></a>').join('')+'</nav>';
  }
  content+='<section class="ja-empty"><h2>준비 중</h2><p>'+title+'의 일본어 자료는 아직 공개되지 않았습니다. 실제 콘텐츠와 음원이 준비되면 이곳에 표시됩니다.</p><a href="J-guided.html">공개된 일본어 듣고 따라 말하기 001 연습하기 →</a></section><details class="ja-shelf"><summary>완료한 미션</summary><p>이 과정에서 완료한 미션이 이곳에 모입니다. 아직 공개된 미션이 없습니다.</p></details><p class="ja-note">A1–C2는 학습 난이도 안내이며, 공식 CEFR 평가나 JLPT 등급 환산이 아닙니다.</p><nav class="ja-related" aria-label="스노우볼링 스튜디오 학습 공간"><a href="'+sound+'">01 · 사운드 체크</a><a href="'+boot+'">02 · 부트 캠프</a><a href="J-readable.html">03 · 리더블</a></nav>';
  main.innerHTML=content;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
