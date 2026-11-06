// Presentation-only Korean course navigation. Lesson data remains protected.
(() => {
 const view=new URLSearchParams(location.search).get('view')||'home';
 if(!['talktag','discussions','tests'].includes(view)) return;
 const home=document.getElementById('kr-home'),other=document.getElementById('kr-other');
 if(!home||!other)return;
 home.hidden=true;other.hidden=false;
 const titles={talktag:'Talk & Tag',discussions:'Discussions',tests:'Test Preppers'};
 const panel=document.createElement('section');panel.className='kr-panel';
 const title=document.createElement('h1');title.textContent=titles[view];
 const message=document.createElement('p');message.textContent='Coming soon';
 panel.append(title,message);other.replaceChildren(panel);
 document.body.dataset.krPage=view;
 document.querySelectorAll('[data-kr-nav]').forEach(link=>{
  if(link.dataset.krNav===view)link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
 });
 document.title=titles[view]+' · TalkTag Korean';
})();
