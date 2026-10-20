/* Navigation trial: presentation only; never changes learning records. */
(() => {
  const init = () => {
    if(document.querySelector('.tt-spaces-trigger'))return;
    const header=document.querySelector('header.topbar,header.top,header.site-head,header.site-header,header.toeicLandingHeader,header.examBar');
    if(!header)return;
    const css=document.createElement('link');css.rel='stylesheet';css.href='/spaces-nav.css?v=20261011-language-badge';document.head.append(css);
    const path=location.pathname,params=new URLSearchParams(location.search),ja=path.startsWith('/japanese/'),ko=path==='/'||path==='/index.html'||path.startsWith('/K-korean')||params.get('lang')==='ko';
    const home=ja?'/japanese/J-index.html':ko?'/':'/E-english.html';
    const routes=ja?['/japanese/J-index.html','/japanese/J-myspace.html','/japanese/J-talktag.html','/japanese/J-snowballing.html','/japanese/J-discussions.html','/japanese/J-test-preppers.html']:ko?['/','/K-korean.html?view=myspace','/K-korean.html?view=talktag','/K-korean-learning.html','/K-korean.html?view=discussions','/K-korean.html?view=tests']:['/E-english.html','/E-english.html?view=myspace','/E-english.html?view=talktag','/snowballing-studio.html','/discussions.html','/test-preppers.html'];
    const labels=ko?['Home','MySpace','Talk & Tag','Studio','Discussions','Tests']:['홈','마이스페이스','톡&태그','스튜디오','토론','시험대비'];
    const icons=['⌂','◉','#','↗','◌','✓'];
    const view=new URLSearchParams(location.search).get('view');
    let active=view==='myspace'?1:view==='talktag'?2:view==='discussions'?4:view==='tests'?5:/myspace/.test(path)?1:/talktag\.html/.test(path)?2:/discussion/.test(path)?4:/test|toeic|jlpt|jpt/.test(path)?5:([home,'/index.html','/K-korean.html','/japanese/J-index.html'].includes(path)?0:3);
    const languageCode=ja?'J':ko?'K':'E',languageName=ja?'Japanese':ko?'Korean':'English';
    const trigger=document.createElement('button');trigger.type='button';trigger.className='tt-spaces-trigger';trigger.innerHTML='<span class="tt-spaces-symbol" aria-hidden="true">▦<i class="tt-spaces-language">'+languageCode+'</i></span> Spaces';trigger.title='Current language: '+languageName;trigger.setAttribute('aria-label','Spaces · '+languageName);trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    (header.querySelector('.top-actions,.head-links')||header).append(trigger);
    const dialog=document.createElement('dialog');dialog.className='tt-spaces-dialog';dialog.setAttribute('aria-labelledby','tt-spaces-title');
    const bar=document.createElement('div');bar.className='tt-spaces-bar';
    const heading=document.createElement('h2');heading.id='tt-spaces-title';heading.textContent='Your spaces';
    const close=document.createElement('button');close.type='button';close.className='tt-spaces-close';close.textContent='×';close.setAttribute('aria-label','Close navigation');bar.append(heading,close);dialog.append(bar);
    const note=document.createElement('p');note.className='tt-spaces-note';note.textContent='Choose where to go next.';dialog.append(note);
    const languages=document.createElement('nav');languages.className='tt-spaces-languages';languages.setAttribute('aria-label','Learning language');
    [['ENGLISH','/E-english.html','english'],['KOREAN','/K-korean.html','korean'],['日本語','/japanese/J-index.html','japanese']].forEach(([label,href,language],i)=>{const link=document.createElement('a');link.textContent=label;link.href=href;link.dataset.targetLanguage=language;link.lang=['en','en','ja'][i];if(i===(ja?2:ko?1:0))link.setAttribute('aria-current','page');languages.append(link)});dialog.append(languages);
    const grid=document.createElement('nav');grid.className='tt-spaces-grid';grid.setAttribute('aria-label','TalkTag spaces');
    labels.forEach((label,i)=>{const a=document.createElement('a');a.href=routes[i];const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=icons[i];a.append(icon,document.createTextNode(label));if(i===active)a.setAttribute('aria-current','page');grid.append(a)});dialog.append(grid);document.body.append(dialog);
    const safe=href=>{try{const u=new URL(href,location.origin);return u.origin===location.origin&&!/backstage|offline|api/.test(u.pathname)&&(ja?u.pathname.startsWith('/japanese/'):ko?u.pathname.startsWith('/K-korean'):!/^\/(japanese|K-korean)/.test(u.pathname))?u:null}catch{return null}};
    function resume(){dialog.querySelector('.tt-spaces-resume')?.remove();try{const records=Object.values(JSON.parse(localStorage.getItem('talktag-myspace-activity:v1')||'{}'));const lesson=records.filter(x=>x.checkpoint&&safe(x.href)&&/player|reader|learning/.test(x.href)).sort((a,b)=>(b.visitedAt||0)-(a.visitedAt||0))[0];if(!lesson)return;const a=document.createElement('a');a.className='tt-spaces-resume';a.href=safe(lesson.href).href;const small=document.createElement('small');small.textContent='Continue training →';const title=document.createElement('strong');title.textContent=lesson.title;a.append(small,title);grid.before(a)}catch{}}
    const panelKey='talktag-spaces-open:v1';
    function rememberOpen(open){try{if(open)sessionStorage.setItem(panelKey,'1');else sessionStorage.removeItem(panelKey)}catch{}}
    function openPanel(){resume();if(!dialog.open)dialog.showModal();trigger.setAttribute('aria-expanded','true');document.body.classList.add('tt-spaces-open');rememberOpen(true)}
    trigger.onclick=openPanel;
    languages.addEventListener('click',e=>{if(e.target.closest('a'))rememberOpen(false)});
    grid.addEventListener('click',e=>{if(e.target.closest('a'))rememberOpen(false)});
    dialog.addEventListener('click',e=>{if(e.target.closest('.tt-spaces-resume'))rememberOpen(false)});
    close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{rememberOpen(false);trigger.setAttribute('aria-expanded','false');document.body.classList.remove('tt-spaces-open');trigger.focus()});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    document.body.classList.add('tt-spaces-trial');
    function alignHeader(){
      let actions=header.querySelector('.tt-header-controls');if(!actions){actions=document.createElement('div');actions.className='tt-header-controls';header.append(actions)}
      const theme=header.querySelector('.tt-theme-switch');
      let share=header.querySelector('#shareSpaceBtn,#shareButton,#kr-share,button.share,.tt-header-share');
      if(!share){share=document.createElement('button');share.type='button';share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);share.setAttribute('aria-label','Link copied');setTimeout(()=>share.setAttribute('aria-label','Share this page'),2000)}}catch{}};}
      share.classList.add('tt-header-share');share.setAttribute('aria-label','Share this page');share.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0-12-4 4m4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>';
      if(theme)actions.append(theme);actions.append(trigger,share);
      header.classList.add('tt-compact-header');
    }
    document.addEventListener('talktag-header-ready',alignHeader);alignHeader();
    try{if(sessionStorage.getItem(panelKey)==='1')openPanel()}catch{}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
