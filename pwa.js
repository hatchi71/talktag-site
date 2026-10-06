(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  let reloadAfterUpdate = false;

  const showUpdate = worker => {
    if (!worker || document.querySelector('.tt-pwa-update')) return;
    const notice = document.createElement('div');
    notice.className = 'tt-pwa-update';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<span>새로운 TalkTag가 준비되었습니다.</span><button type="button">업데이트</button>';
    Object.assign(notice.style, {
      position: 'fixed', left: '16px', right: '16px', top: 'max(16px, env(safe-area-inset-top))',
      zIndex: '2147483647', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      maxWidth: '520px', margin: '0 auto', padding: '10px 10px 10px 16px', border: '1px solid #56718f',
      borderRadius: '16px', background: '#0b172b', color: '#f4f7fc', boxShadow: '0 12px 36px #0005',
      font: '700 14px/1.4 system-ui, sans-serif'
    });
    const button = notice.querySelector('button');
    Object.assign(button.style, {
      minWidth: '88px', minHeight: '44px', border: '1px solid #87b9ff', borderRadius: '12px',
      background: '#245bad', color: '#fff', font: '800 14px system-ui, sans-serif', cursor: 'pointer'
    });
    button.addEventListener('click', () => {
      reloadAfterUpdate = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
    document.body.append(notice);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadAfterUpdate) location.reload();
  });

  addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      if (registration.waiting) showUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
        });
      });
    } catch (error) {
      console.warn('TalkTag PWA registration failed.', error);
    }
  });
})();
