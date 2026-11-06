(() => {
  if (window.__talktagPwaBooted || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.__talktagPwaBooted = true;
  const english=location.pathname.startsWith('/K-korean');
  const wording=(en,ko)=>english?en:ko;
  const APPLIED_KEY='talktag-site-update-applied:v1';
  let registration, pendingWorker, pendingVersion, applying=false, deferredReload=false, lastCheck=0;
  const protectedState=()=>navigator.mediaSession?.playbackState==='playing'||document.body.classList.contains('exam-active')||[...document.querySelectorAll('audio,video')].some(media=>!media.paused&&!media.ended)||[...document.querySelectorAll('textarea,input[type="text"]')].some(field=>field.value?.trim());
  const appliedVersion=()=>{try{return JSON.parse(localStorage.getItem(APPLIED_KEY)||'{}').version;}catch{return null;}};
  const workerVersion=worker=>new Promise(resolve=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),2000);
    channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data?.version||null);};
    try{worker.postMessage({type:'GET_VERSION'},[channel.port2]);}catch{clearTimeout(timer);resolve(null);}
  });
  const removeNotice=()=>document.querySelector('.tt-pwa-update')?.remove();
  const showUpdate=async worker=>{
    if(!worker||applying)return;
    pendingWorker=worker;pendingVersion=await workerVersion(worker);
    if(pendingVersion&&appliedVersion()===pendingVersion)return;
    if(document.querySelector('.tt-pwa-update'))return;
    const notice=document.createElement('div');notice.className='tt-pwa-update';notice.setAttribute('role','status');
    notice.innerHTML='<span><strong></strong><small></small></span><button type="button"></button>';
    notice.querySelector('strong').textContent=wording('A new TalkTag update is ready.','새로운 TalkTag가 준비되었습니다.');
    notice.querySelector('small').textContent=wording('Refresh to use the latest version. Your account records are kept.','새로고침하면 최신 버전이 적용됩니다. 계정 기록은 유지됩니다.');
    notice.querySelector('button').textContent=wording('Update','업데이트');
    Object.assign(notice.style,{position:'fixed',left:'16px',right:'16px',top:'max(16px, env(safe-area-inset-top))',zIndex:'2147483647',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',maxWidth:'520px',margin:'0 auto',padding:'14px 12px 14px 16px',border:'1px solid var(--tt-border,#d8e0e8)',borderRadius:'18px',background:'var(--tt-card,#fffdf7)',color:'var(--tt-text,#183455)',boxShadow:'0 12px 36px #10284026',font:'700 14px/1.45 system-ui,sans-serif'});
    Object.assign(notice.querySelector('strong').style,{display:'block',fontSize:'14px'});
    Object.assign(notice.querySelector('small').style,{display:'block',marginTop:'3px',fontSize:'11px',fontWeight:'500',color:'var(--tt-muted,#687b92)'});
    const button=notice.querySelector('button');
    Object.assign(button.style,{flex:'0 0 auto',minWidth:'88px',minHeight:'44px',padding:'0 12px',border:'0',borderRadius:'12px',background:'#183b62',color:'#fff',font:'800 13px system-ui,sans-serif',cursor:'pointer'});
    button.addEventListener('click',async()=>{
      if(applying)return;
      if(!navigator.onLine){notice.querySelector('small').textContent=wording('Connect to the internet, then update.','인터넷에 연결한 뒤 업데이트해 주세요.');return;}
      applying=true;button.disabled=true;button.textContent=wording('Applying…','적용 중');
      let timer,listener;
      try{
        // A different tab may already have activated the worker. Never wait for
        // controllerchange on an active/redundant worker: that event has passed.
        const waiting=registration?.waiting;
        if(waiting && waiting.state!=='activated' && waiting.state!=='redundant'){
          await new Promise(resolve=>{
            listener=()=>resolve();
            navigator.serviceWorker.addEventListener('controllerchange',listener,{once:true});
            timer=setTimeout(resolve,4000);
            try{waiting.postMessage({type:'SKIP_WAITING'});}catch{resolve();}
          });
        }
        const active=navigator.serviceWorker.controller||registration?.active;
        const version=active?await workerVersion(active):pendingVersion;
        try{localStorage.setItem(APPLIED_KEY,JSON.stringify({version:version||pendingVersion,at:Date.now()}));}catch{}
        location.reload();
      }catch{
        notice.querySelector('small').textContent=wording('Please refresh the page to finish updating.','페이지를 새로고침해서 업데이트를 마쳐 주세요.');
      }finally{
        clearTimeout(timer);if(listener)navigator.serviceWorker.removeEventListener('controllerchange',listener);
        applying=false;button.disabled=false;button.textContent=wording('Refresh','새로고침');
      }
    });
    document.body.appendChild(notice);
  };
  const check=async(force=false)=>{
    if(!registration||applying||(!force&&Date.now()-lastCheck<30000))return;
    lastCheck=Date.now();try{await registration.update();if(registration.waiting)showUpdate(registration.waiting);}catch{}
    if(deferredReload&&!protectedState()){deferredReload=false;location.reload();}
  };
  addEventListener('storage',event=>{
    if(event.key!==APPLIED_KEY||!event.newValue||applying)return;
    removeNotice();
    if(protectedState())deferredReload=true;else location.reload();
  });
  addEventListener('focus',()=>check());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(true);});
  addEventListener('pageshow',event=>{if(event.persisted)check(true);});
  const boot=async()=>{
    try{
      registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      if(registration.waiting)showUpdate(registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(worker);});
      });
      check(true);
    }catch(error){console.warn('TalkTag PWA registration failed.',error);}
  };
  if(document.readyState==='complete')boot();else addEventListener('load',boot,{once:true});
})();
