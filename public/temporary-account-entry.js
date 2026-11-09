// Compact account status for the temporary TalkTag site only.
(() => {
  if (/\/account(?:\.html)?$/.test(location.pathname)) return;
  const path = location.pathname;
  const language = /\/picture-talk(?:\.html)?$/.test(path) ? (new URLSearchParams(location.search).get('first') === 'ko' ? 'ko' : 'en') : /^\/japanese(?:\/|$)/.test(path) ? 'ja'
    : /^\/E-english(?:\.html|\/|$)/.test(path) ? 'en'
    : path === '/' || path === '/index.html' || /^\/K-korean(?:\.html|[-/]|$)/.test(path) ? 'ko'
    : null;
  if (language) {
    try { localStorage.setItem('talktag-last-used-language', language); } catch { /* Continue without saved preference. */ }
  }
  // English and Japanese courses address Korean-speaking learners; the
  // Korean course addresses English-speaking learners.
  const interfaceLanguage = language === 'ko' ? 'en' : 'ko';
  const entry = document.querySelector('#tt-temp-account-entry') || document.createElement('a');
  entry.id = 'tt-temp-account-entry';
  entry.dataset.language = interfaceLanguage;
  entry.href = `/account.html?ui=${interfaceLanguage}&preview=1${language ? `&from=${language}` : ''}`;
  entry.setAttribute('aria-label', interfaceLanguage === 'en' ? 'Checking account status' : '계정 상태 확인 중');
  if (!entry.querySelector('[data-account-label]')) entry.innerHTML = `<span class="tt-account-dot" aria-hidden="true"></span><span data-account-label>${interfaceLanguage === 'en' ? 'Log in' : '로그인'}</span>`;
  const header = document.querySelector('header.topbar,header.top,header.site-head,header.site-header,header.toeicLandingHeader,header.examBar,header');
  function place() {
    if (!header) { document.body.prepend(entry); return; }
    const landing = ['/', '/index.html', '/E-english', '/E-english.html', '/K-korean', '/K-korean.html'].includes(path);
    if (landing) header.classList.add('tt-account-landing');
    // Spaces replaces the original action row. Its controls are the visible row.
    const controls = header.querySelector('.tt-header-controls') || header.querySelector('.top-actions, .head-links');
    if (controls) {
      controls.prepend(entry);
      header.classList.toggle('tt-account-integrated', controls.classList.contains('top-actions') || controls.classList.contains('head-links'));
    } else if (header.classList.contains('site-header') && header.querySelector('.language-tabs')) {
      header.append(entry);
      header.classList.add('tt-account-integrated');
    } else header.after(entry);
  }
  place();
  document.addEventListener('talktag-header-ready', place);
  addEventListener('load', place, { once: true });
  setTimeout(place, 800);
  addEventListener('resize', place, { passive: true });
})();
