/* Navigation trial: presentation only; never changes learning records. */
(() => {
  const init = () => {
    if(document.querySelector('.tt-spaces-trigger'))return;
    const header=document.querySelector('header.topbar,header.top,header.site-head,header.site-header,header.toeicLandingHeader,header.examBar');
    if(!header)return;
    const css=document.createElement('link');css.rel='stylesheet';css.href='/spaces-nav.css?v=20261011-trial';document.head.append(css);
    const path=location.pathname,ja=path.startsWith('/japanese/'),ko=path.startsWith('/korean');
    const home=ja?'/japanese/':ko?'/korean.html':'/';
    const routes=ja?['/japanese/','/japanese/myspace.html','/japanese/talktag.html','/japanese/snowballing.html','/japanese/discussions.html','/japanese/test-preppers.html']:ko?['/korean.html','/korean.html?view=myspace','/korean.html?view=talktag','/korean-learning.html','/korean.html?view=discussions','/korean.html?view=tests']:['/','/?view=myspace','/?view=talktag','/snowballing-studio.html','/discussions.html','/test-preppers.html'];
    const labels=['Home','MySpace','Talk & Tag','Studio','Discussions','Tests'];
    const icons=['⌂','◉','#','↗','◌','✓'];
    const view=new URLSearchParams(location.search).get('view');
    let active=view==='myspace'?1:view==='talktag'?2:view==='discussions'?4:view==='tests'?5:/myspace/.test(path)?1:/talktag\.html/.test(path)?2:/discussion/.test(path)?4:/test|toeic|jlpt|jpt/.test(path)?5:([home,'/index.html','/japanese/index.html'].includes(path)?0:3);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='tt-spaces-trigger';trigger.innerHTML='<span aria-hidden="true">▦</span> Spaces';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    (header.querySelector('.top-actions,.head-links')||header).append(trigger);
    const dialog=document.createElement('dialog');dialog.className='tt-spaces-dialog';dialog.setAttribute('aria-labelledby','tt-spaces-title');
    const bar=document.createElement('div');bar.className='tt-spaces-bar';
    const heading=document.createElement('h2');heading.id='tt-spaces-title';heading.textContent='Your spaces';
    const close=document.createElement('button');close.type='button';close.className='tt-spaces-close';close.textContent='×';close.setAttribute('aria-label','Close navigation');bar.append(heading,close);dialog.append(bar);
    const note=document.createElement('p');note.className='tt-spaces-note';note.textContent='Choose where to go next.';dialog.append(note);
    const grid=document.createElement('nav');grid.className='tt-spaces-grid';grid.setAttribute('aria-label','TalkTag spaces');
    labels.forEach((label,i)=>{const a=document.createElement('a');a.href=routes[i];const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=icons[i];a.append(icon,document.createTextNode(label));if(i===active)a.setAttribute('aria-current','page');grid.append(a)});dialog.append(grid);document.body.append(dialog);
    const safe=href=>{try{const u=new URL(href,location.origin);return u.origin===location.origin&&!/backstage|offline|api/.test(u.pathname)&&(ja?u.pathname.startsWith('/japanese/'):ko?u.pathname.startsWith('/korean'):!/^\/(japanese|korean)/.test(u.pathname))?u:null}catch{return null}};
    function resume(){dialog.querySelector('.tt-spaces-resume')?.remove();try{const records=Object.values(JSON.parse(localStorage.getItem('talktag-myspace-activity:v1')||'{}'));const lesson=records.filter(x=>x.checkpoint&&safe(x.href)&&/player|reader|learning/.test(x.href)).sort((a,b)=>(b.visitedAt||0)-(a.visitedAt||0))[0];if(!lesson)return;const a=document.createElement('a');a.className='tt-spaces-resume';a.href=safe(lesson.href).href;const small=document.createElement('small');small.textContent='Continue training →';const title=document.createElement('strong');title.textContent=lesson.title;a.append(small,title);grid.before(a)}catch{}}
    trigger.onclick=()=>{resume();dialog.showModal();trigger.setAttribute('aria-expanded','true');document.body.classList.add('tt-spaces-open')};
    close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');document.body.classList.remove('tt-spaces-open');trigger.focus()});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    document.body.classList.add('tt-spaces-trial');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
