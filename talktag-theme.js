/* Shared appearance preference. Does not touch learning or audio state. */
(() => {
  const key = 'talktag-appearance';
  const root = document.documentElement;
  const valid = value => value === 'dark' ? 'dark' : 'bright';
  let preference = 'bright';
  try { preference = valid(localStorage.getItem(key)); } catch (_) {}
  function apply(value) {
    root.dataset.appearance = valid(value);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === root.dataset.appearance));
    });
  }
  apply(preference);
  window.addEventListener('storage', event => { if (event.key === key) apply(event.newValue); });
  document.addEventListener('DOMContentLoaded', () => {
    // These spaces currently display examples, not saved personal records.
    for (const id of ['myspace', 'talktag', 'discussions', 'leader']) {
      const view = document.getElementById(id);
      if (!view || view.querySelector('.tt-preview-notice')) continue;
      const notice = document.createElement('p');
      notice.className = 'tt-preview-notice';
      notice.textContent = '준비 중 · Coming soon — 현재는 화면 미리보기입니다. 개인 기록 저장, 진도 추적, 대화 참여 기능은 아직 제공되지 않습니다.';
      view.prepend(notice);
    }
    const headers = document.querySelectorAll('header.topbar, header.top, header.site-head, header.site-header, header.toeicLandingHeader, header.examBar');
    for (const header of headers) {
    header.classList.add('tt-themed-header');
    const group = document.createElement('div');
    group.className = 'tt-theme-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Display mode');
    for (const [value, label] of [['bright', '☀ Bright'], ['dark', '☾ Dark']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.themeChoice = value;
      button.textContent = label;
      button.addEventListener('click', () => {
        apply(value);
        try { localStorage.setItem(key, value); } catch (_) {}
      });
      group.append(button);
    }
    (header.querySelector('.top-actions, .head-links') || header).append(group);
    }
    apply(root.dataset.appearance);
  });
})();
