(() => {
  const button = document.querySelector('#shareSpaceBtn, #shareButton, .floating-share');
  if (!button) return;

  document.querySelectorAll('.share-menu, .share-toast').forEach(element => element.remove());

  let modal = document.getElementById('shareQrModal');
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

  const box = modal.querySelector('#shareQrBox');
  const urlElement = modal.querySelector('#shareQrUrl');
  const cleanUrl = () => {
    const url = new URL(location.href);
    url.searchParams.delete('deploy');
    url.hash = '';
    return url.href;
  };
  let qrLibraryPromise;
  const loadQrLibrary = () => {
    if (window.QRCode) return Promise.resolve();
    if (qrLibraryPromise) return qrLibraryPromise;
    qrLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return qrLibraryPromise;
  };
  const close = () => {
    modal.style.display = 'none';
    button.focus();
  };
  const open = async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = cleanUrl();
    box.innerHTML = '';
    urlElement.textContent = url;
    modal.style.display = 'flex';
    try {
      await loadQrLibrary();
      new window.QRCode(box, { text: url, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
    } catch {
      box.textContent = 'QR 코드를 불러오지 못했습니다.';
    }
  };

  button.addEventListener('click', open, true);
  modal.querySelector('#shareQrClose').onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.style.display !== 'none') close(); });
  modal.querySelector('#shareQrCopy').onclick = async function () {
    try {
      await navigator.clipboard.writeText(cleanUrl());
      this.textContent = '복사됨';
      setTimeout(() => { this.textContent = '링크 복사'; }, 1200);
    } catch {}
  };
  modal.querySelector('#shareQrNative').onclick = async () => {
    const url = cleanUrl();
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };
})();
