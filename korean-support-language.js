/* Shared support-language preference and availability for Korean-learning cards. */
(function () {
  'use strict';
  const languages = Object.freeze({en:'English',vi:'Tiếng Việt',ne:'नेपाली',km:'ខ្មែរ',my:'မြန်မာ',th:'ไทย'});
  const key = 'talktag:korean:support-language';
  const oldKey = 'talktag:korean-glr:support-language';
  const listeners = new Set();
  window.TalkTagKoreanTranslations ||= Object.create(null);
  let preferred = 'en';
  try {
    const saved = localStorage.getItem(key) || localStorage.getItem(oldKey);
    if (Object.hasOwn(languages, saved)) preferred = saved;
    if (!localStorage.getItem(key)) localStorage.setItem(key, preferred);
  } catch (_) { /* Private browsing can disable storage. */ }
  function set(code) {
    if (!Object.hasOwn(languages, code)) return;
    preferred = code;
    try { localStorage.setItem(key, code); } catch (_) {}
    listeners.forEach(fn => fn(code));
  }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  window.addEventListener('storage', event => {
    if (event.key !== key || !Object.hasOwn(languages, event.newValue)) return;
    preferred = event.newValue;
    listeners.forEach(fn => fn(preferred));
  });
  function validLines(source, translated) {
    return Array.isArray(source) && Array.isArray(translated) && source.length === translated.length &&
      translated.every(line => typeof line === 'string' && line.trim());
  }
  function mount(anchor, {source, english, translations = {}, onChange, label = 'Meaning in'}) {
    if (!anchor || !validLines(source, english)) return null;
    const available = {en: english};
    const reviewStatus = {};
    const legacyPilot = translations.legacyPilot === true;
    const aligned = legacyPilot || (Array.isArray(translations.source) &&
      translations.source.length === source.length && translations.source.every((line,index) => line === source[index]));
    const translated = legacyPilot ? translations.translations : translations.translations || {};
    Object.keys(languages).filter(code => code !== 'en').forEach(code => {
      const status = legacyPilot ? 'legacy-pilot' : translations.review?.[code]?.status;
      if (aligned && ['legacy-pilot','reviewed','ai-reviewed'].includes(status) &&
          validLines(source, translated[code])) {
        available[code] = translated[code];
        reviewStatus[code] = status;
      }
    });
    const box = document.createElement('div');
    box.className = 'ko-support-selector';
    const caption = document.createElement('label');
    caption.textContent = label;
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Support language');
    caption.append(select);
    Object.entries(languages).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.lang = code;
      option.textContent = !available[code] ? `${name} · pending` : ['ai-reviewed','legacy-pilot'].includes(reviewStatus[code]) ? `${name} · AI draft` : name;
      select.append(option);
    });
    const notice = document.createElement('p');
    notice.className = 'ko-support-pending';
    notice.setAttribute('role', 'status');
    box.append(caption, notice);
    anchor.append(box);
    function render() {
      const wanted = preferred;
      const shown = available[wanted] ? wanted : 'en';
      select.value = wanted;
      notice.textContent = wanted !== shown ? `${languages[wanted]} meaning is being prepared. Showing English for now.` :
        ['ai-reviewed','legacy-pilot'].includes(reviewStatus[shown]) ? 'AI draft. A native speaker has not yet verified this translation.' : '';
      notice.hidden = !notice.textContent;
      onChange?.(available[shown], shown, wanted);
    }
    select.addEventListener('change', () => set(select.value));
    const unsubscribe = subscribe(render);
    render();
    return {element:box, refresh:render, destroy:unsubscribe};
  }
  window.TalkTagKoreanSupport = Object.freeze({languages, get:() => preferred, set, subscribe, validLines, mount});
})();
