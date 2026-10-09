(() => {
 async function refresh(){
  const board=document.querySelector('.landing-news');if(!board)return;
  try{
   const response=await fetch('/home-news-feed.json',{cache:'no-store'});if(!response.ok)return;
   const feed=await response.json();
   const items=feed.items.filter(x=>x.href&&!x.href.includes('://')).slice(0,2);
   if(items.length!==2)return;
   const cards=[...board.querySelectorAll('.tt-news')];
   board.setAttribute('aria-label','TalkTag 게시판');
   cards[0].querySelector('.news-label').textContent='Talk & Tag · 모임 안내';
   items.forEach((item,i)=>{
    const card=cards[i+1];card.href=item.href;card.dataset.uploadId=item.id;
    card.querySelector('.news-label').textContent='새 콘텐츠 · '+(i===0?'최신 업로드':'이전 업로드');
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
