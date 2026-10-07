(() => {
  if (window.__talktagPwaBooted || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.__talktagPwaBooted = true;

  const CHECK_INTERVAL = 30_000;
  const FINGERPRINT_PREFIX = 'talktag-page-version:';
  let registration;
  let reloadAfterUpdate = false;
  let checking = false;
  let lastCheck = 0;

  const isProtectedLearningState = () => {
    const mediaPlaying = [...document.querySelectorAll('audio, video')]
      .some(media => !media.paused && !media.ended);
    const active = document.activeElement;
    const editing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)
      && !['button', 'range', 'checkbox', 'radio'].includes(active.type);
    const enteredText = [...document.querySelectorAll('textarea, input:not([type]) , input[type="text"]')]
      .some(field => field.value?.trim());
    const learningRoute = /(?:toeic|audio-player|vocal|storycamp|story-camp|jlpt-n4-audio-player)/i
      .test(location.pathname);
    return mediaPlaying || editing || enteredText || learningRoute || document.body.classList.contains('exam-active');
  };

  const showUpdate = ({ worker = null, message = '새로운 TalkTag가 준비되었습니다.' } = {}) => {
    const existing = document.querySelector('.tt-pwa-update');
    if (existing) return;

    const notice = document.createElement('div');
    notice.className = 'tt-pwa-update';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.innerHTML = `<span>${message}</span><button type="button">업데이트</button>`;
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
      if (worker) {
        reloadAfterUpdate = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      } else {
        location.reload();
      }
    });
    document.body.append(notice);
  };

  const applyContentUpdate = () => {
    if (isProtectedLearningState()) {
      showUpdate({ message: '새 버전이 준비되었습니다. 현재 학습을 마친 뒤 업데이트하세요.' });
      return;
    }
    location.reload();
  };

  const fingerprintKey = () => `${FINGERPRINT_PREFIX}${location.pathname}${location.search}`;

  const checkCurrentPage = async ({ force = false } = {}) => {
    const now = Date.now();
    if (checking || (!force && now - lastCheck < CHECK_INTERVAL)) return;
    checking = true;
    lastCheck = now;
    try {
      const response = await fetch(location.href, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'X-TalkTag-Update-Check': '1' }
      });
      if (!response.ok) return;
      const fingerprint = response.headers.get('etag') || response.headers.get('last-modified');
      if (!fingerprint) return;
      const key = fingerprintKey();
      const previous = localStorage.getItem(key);
      localStorage.setItem(key, fingerprint);
      if (previous && previous !== fingerprint) applyContentUpdate();
    } catch (_) {
      // Offline checks fail silently; the service worker keeps the current page usable.
    } finally {
      checking = false;
    }
  };

  const checkForUpdates = ({ force = false } = {}) => {
    registration?.update().catch(() => {});
    checkCurrentPage({ force });
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadAfterUpdate) location.reload();
  });

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'CONTENT_UPDATED') applyContentUpdate();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates({ force: true });
  });
  addEventListener('focus', () => checkForUpdates());
  addEventListener('pageshow', event => {
    if (event.persisted) checkForUpdates({ force: true });
  });

  addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      if (registration.waiting) showUpdate({ worker: registration.waiting });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate({ worker });
        });
      });
      checkCurrentPage({ force: true });
    } catch (error) {
      console.warn('TalkTag PWA registration failed.', error);
    }
  });
})();
