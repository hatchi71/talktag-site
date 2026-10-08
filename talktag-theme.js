/* Shared appearance preference. Does not touch learning or audio state. */
(() => {
  if (!document.querySelector('script[src*="/pwa.js"]')) {
    const pwa = document.createElement('script');
    pwa.src = '/pwa.js?v=20261008-unified';
    document.head.append(pwa);
  }

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
    const path = location.pathname;
    const topLanding = path === '/' || path === '/index.html' || path === '/japanese/' || path === '/japanese/index.html' || /\/korean\.html$/.test(path);
    if (!topLanding && !document.querySelector('.tt-route-tools')) {
      const japanese = path.startsWith('/japanese/');
      const routes = japanese ? [
        [/story-camp/, '/japanese/story-camp.html', 'Story Camp'],
        [/vocal/, '/japanese/vocal-camp.html', 'Vocal Camp'],
        [/(?:guided|listen-repeat|audio-essays)/, '/japanese/listen-repeat.html', 'Listen & Repeat'],
        [/readable/, '/japanese/readable.html', 'Readable'],
        [/(?:jlpt|jpt|test-preppers)/, '/japanese/test-preppers.html', '시험대비'],
        [/discussions/, '/japanese/discussions.html', '토론'],
        [/snowballing|bootcamp/, '/japanese/snowballing.html', '스노우볼링'],
        [/.*/, '/japanese/', '일본어 홈']
      ] : [
        [/storycamp|story-camp/, '/story-camp.html', 'Story Camp'],
        [/vocal/, '/vocal-camp.html', 'Vocal Camp'],
        [/(?:audio-library|audio-player|listen-repeat)/, '/listen-repeat.html', 'Listen & Repeat'],
        [/readable/, '/readable.html', 'Readable'],
        [/toeic/, '/toeic/', 'TOEIC RC'],
        [/test-preppers/, '/test-preppers.html', 'Test Preppers'],
        [/discussions/, '/discussions.html', 'Discussions'],
        [/snowballing|bootcamp/, '/snowballing-studio.html', 'Snowballing Studio'],
        [/.*/, '/', 'TalkTag 홈']
      ];
      const route = routes.find(([pattern]) => pattern.test(path));
      const tools = document.createElement('nav');
      tools.className = 'tt-route-tools';
      tools.setAttribute('aria-label', '페이지 이동');
      const previous = document.createElement('button');
      previous.type = 'button';
      previous.className = 'tt-route-previous';
      previous.innerHTML = '<span aria-hidden="true">←</span><b>이전으로</b>';
      previous.addEventListener('click', () => {
        if (history.length > 1) history.back();
        else location.href = route[1];
      });
      const category = document.createElement('a');
      category.className = 'tt-route-category';
      category.href = route[1];
      category.innerHTML = `<span aria-hidden="true">⌂</span><b>${route[2]}</b>`;
      tools.append(previous, category);
      const header = document.querySelector('body > header, main > header, .workspace > header');
      const main = document.querySelector('main');
      if (header) header.insertAdjacentElement('afterend', tools);
      else if (main) main.prepend(tools);
      else document.body.prepend(tools);
    }

    document.querySelectorAll('.levels, .level-tabs, .filter-bar, .ja-grid, .vb-level-grid').forEach(group => {
      const links = [...group.querySelectorAll(':scope > a')];
      const levelLinks = links.filter(link => /(?:^|[-_/])(a1|a2|b1|b2|c1|c2|n[1-5])(?:[-_.?/]|$)/i.test(link.getAttribute('href') || '') || /[?&]level=(?:A1|A2|B1|B2|C1|C2|N[1-5])(?:&|$)/i.test(link.getAttribute('href') || '') || /^(?:A1|A2|B1|B2|C1|C2|N[1-5])(?:\b|\s|·)/.test(link.textContent.trim()));
      if (levelLinks.length && levelLinks.length === links.length) group.classList.add('tt-level-postits');
    });

    const japaneseNav = document.querySelector('.ja-mode-nav');
    if (japaneseNav) {
      const file = location.pathname.split('/').pop() || 'index.html';
      const section = file === 'index.html' ? 'home'
        : file === 'myspace.html' ? 'myspace'
        : file === 'talktag.html' ? 'talktag'
        : file === 'discussions.html' ? 'discussions'
        : /^(?:test-preppers|jlpt|jpt)/.test(file) ? 'tests'
        : 'studio';
      const items = [
        ['home', 'index.html', '⌂', '홈'],
        ['myspace', 'myspace.html', '◉', '마이스페이스'],
        ['talktag', 'talktag.html', '#', '톡&태그'],
        ['studio', 'snowballing.html', '↗', '스튜디오'],
        ['discussions', 'discussions.html', '◌', '토론'],
        ['tests', 'test-preppers.html', '◇', '시험대비']
      ];
      japaneseNav.replaceChildren(...items.map(([keyName, href, icon, label]) => {
        const link = document.createElement('a');
        link.href = href;
        if (keyName === section) link.setAttribute('aria-current', 'page');
        const iconSpan = document.createElement('span');
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = icon;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        link.append(iconSpan, labelSpan);
        return link;
      }));
    }
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
