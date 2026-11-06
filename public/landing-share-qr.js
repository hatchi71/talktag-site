(() => {
  if (window.__talkTagQrShareInstalled) return;
  window.__talkTagQrShareInstalled = true;

  const shareButtonSelector = '#shareSpaceBtn, #shareButton, #kr-share, .floating-share, .tt-header-share';
  let modal;
  let qrLibraryPromise;
  let lastTrigger;
  let renderToken = 0;

  const cleanUrl = () => {
    const url = new URL(location.href);
    url.searchParams.delete('deploy');
    url.hash = '';
    return url.href;
  };

  function ensureModal() {
    if (modal?.isConnected) return modal;
    modal = document.getElementById('shareQrModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'shareQrModal';
      modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(8,30,60,.55);align-items:center;justify-content:center;padding:20px';
      modal.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="shareQrTitle" style="width:min(88vw,360px);background:#fff;border-radius:22px;padding:24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25)">
          <div id="shareQrTitle" style="font-size:21px;font-weight:900;color:#082b68">TalkTag를 함께 열어보세요</div>
          <div style="margin:7px 0 18px;font-size:13px;color:#71809a">옆 사람에게 이 QR 코드를 보여주세요.</div>
          <div id="shareQrBox" style="display:flex;justify-content:center;min-height:220px;align-items:center"></div>
          <div id="shareQrUrl" style="margin:12px 0 16px;font-size:12px;color:#71809a;word-break:break-all"></div>
          <div style="display:flex;gap:8px">
            <button id="shareQrCopy" type="button" style="flex:1;border:0;border-radius:12px;padding:12px;background:#eef5ff;color:#164b91;font-weight:800">링크 복사</button>
            <button id="shareQrNative" type="button" style="flex:1;border:0;border-radius:12px;padding:12px;background:#f28a3a;color:white;font-weight:800">공유하기</button>
          </div>
          <button id="shareQrClose" type="button" style="margin-top:14px;border:0;background:transparent;color:#8190a8;font-weight:700">닫기</button>
        </div>`;
      document.body.appendChild(modal);
    }

    modal.querySelector('#shareQrClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    modal.querySelector('#shareQrCopy')?.addEventListener('click', async event => {
      try {
        await navigator.clipboard.writeText(cleanUrl());
        const button = event.currentTarget;
        button.textContent = '복사됨';
        setTimeout(() => { if (button.isConnected) button.textContent = '링크 복사'; }, 1200);
      } catch {}
    });
    modal.querySelector('#shareQrNative')?.addEventListener('click', async () => {
      const url = cleanUrl();
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch {}
      } else {
        try { await navigator.clipboard.writeText(url); } catch {}
      }
    });
    return modal;
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    if (lastTrigger?.isConnected) lastTrigger.focus();
  }

  function loadQrLibrary() {
    if (window.QRCode) return Promise.resolve();
    if (qrLibraryPromise) return qrLibraryPromise;
    qrLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = resolve;
      script.onerror = () => {
        qrLibraryPromise = undefined;
        reject(new Error('QR library could not be loaded'));
      };
      document.head.appendChild(script);
    });
    return qrLibraryPromise;
  }

  async function openModal(event, trigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    lastTrigger = trigger;
    const activeModal = ensureModal();
    const box = activeModal.querySelector('#shareQrBox');
    const urlElement = activeModal.querySelector('#shareQrUrl');
    const token = ++renderToken;
    const url = cleanUrl();
    box.replaceChildren();
    urlElement.textContent = url;
    activeModal.style.display = 'flex';
    activeModal.querySelector('#shareQrClose')?.focus();

    try {
      await loadQrLibrary();
      if (token !== renderToken || activeModal.style.display === 'none') return;
      new window.QRCode(box, { text: url, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
    } catch {
      if (token === renderToken) box.textContent = 'QR 코드를 불러오지 못했습니다. 링크 복사를 이용해 주세요.';
    }
  }

  // Delegation is intentional: shared navigation and language headers are often
  // created or rearranged after this script loads on learner subpages.
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.(shareButtonSelector);
    if (trigger) openModal(event, trigger);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && modal.style.display !== 'none') closeModal();
  });
})();
