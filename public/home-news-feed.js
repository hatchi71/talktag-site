(() => {
 async function refresh(){
  const board=document.querySelector('.landing-news');
  const notice=document.querySelector('.tt-release-notice');
  if(!board&&!notice)return;
  try{
   const response=await fetch('/home-news-feed.json',{cache:'no-store'});if(!response.ok)return;
   const feed=await response.json();
   const language=board?.dataset.newsLanguage||notice?.dataset.newsLanguage||'en';
   const items=feed.items.filter(x=>x.language===language&&x.href&&!x.href.includes('://')).slice(0,2);
   if(notice&&items.length){
    notice.querySelector('small').textContent=language==='ko'?'NEW IN KOREAN · '+items[0].levels.join(' · '):'새 콘텐츠 · '+items[0].levels.join(' · ');
    notice.href='/'+items[0].href.replace(/^\/+/, '');
    notice.querySelector('strong').textContent=items[0].title;
    notice.querySelector('span').textContent=items[0].description;
    notice.hidden=false;
   }
   if(!board||items.length!==2)return;
   const cards=[...board.querySelectorAll('.tt-news')];
   board.setAttribute('aria-label','TalkTag 게시판');
   cards[0].querySelector('.news-label').textContent='Talk & Tag · 모임 안내';
   items.forEach((item,i)=>{
    const card=cards[i+1];card.href='/'+item.href.replace(/^\/+/, '');card.dataset.uploadId=item.id;
    card.querySelector('.news-label').textContent='새 콘텐츠 · 최신 업로드';
    card.querySelector('h3').textContent=item.title;
    card.querySelector('p').textContent=item.description;
    card.querySelector('.news-note').textContent=item.levels.join(' · ');
    card.querySelector('strong').textContent='콘텐츠 열기 →';
   });
  }catch(error){console.warn('News feed unavailable; keeping published notices.');}
 }
 document.addEventListener('DOMContentLoaded',refresh);
 window.addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
