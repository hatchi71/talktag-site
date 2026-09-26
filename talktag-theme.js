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
    const header = document.querySelector('header.topbar, header.top, header.site-head, header.site-header');
    if (!header) return;
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
    apply(root.dataset.appearance);
  });
})();
