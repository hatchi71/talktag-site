/* Vocal Camp catalog: level-first landing and a numbered lesson list.
   New lessons are appended in TalkTagVocalPilots and keep the next number. */
(() => {
  'use strict';
  const root = document.getElementById('vocalRoot');
  const lessons = Array.isArray(window.TalkTagVocalPilots) ? window.TalkTagVocalPilots : [];
  if (!root) return;

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const params = new URLSearchParams(location.search);
  const requestedLevel = (params.get('level') || '').toUpperCase();
  const selectedLevel = levels.includes(requestedLevel) ? requestedLevel : '';
  const E = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className || '';
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const A = (text, href, className) => {
    const link = E('a', className, text);
    link.href = href;
    return link;
  };

  document.body.classList.add('vocal-browser-page');
  root.replaceChildren();
  root.hidden = false;
  root.classList.add('vocal-browser');

  if (!selectedLevel) {
    const heading = E('header', 'vb-catalog-head');
    heading.append(
      E('span', 'vb-eyebrow', 'VOCAL CAMP · LEVELS'),
      E('h1', '', '나에게 맞는 레벨을 선택하세요.'),
      E('p', '', '짧고 단순한 이야기부터 시작해, 소리로 기억하고 내 말로 확장합니다.')
    );
    const grid = E('nav', 'vb-level-grid');
    grid.setAttribute('aria-label', 'Vocal Camp 레벨 선택');
    levels.forEach((level) => {
      const count = lessons.filter((lesson) => lesson.level === level).length;
      const card = A('', `vocal-camp.html?level=${level}`, 'vb-level-card');
      card.append(
        E('span', 'vb-level-name', level),
        E('strong', '', `${count}개 음원`),
        E('small', '', count ? '목록 열기 →' : '준비 중')
      );
      if (!count) card.setAttribute('aria-disabled', 'true');
      grid.append(card);
    });
    root.append(heading, grid);
    document.title = 'Vocal Camp · TalkTag Boot Camp';
    return;
  }

  const levelLessons = lessons.filter((lesson) => lesson.level === selectedLevel);
  const heading = E('header', 'vb-list-head');
  heading.append(
    A('← 레벨 선택', 'vocal-camp.html', 'vb-back'),
    E('span', 'vb-eyebrow', `VOCAL CAMP · ${selectedLevel}`),
    E('h1', '', `${selectedLevel} 음원`),
    E('p', '', '1번부터 순서대로 듣고, 누적해서 따라 말해 보세요.')
  );
  const list = E('ol', 'vb-audio-list');
  levelLessons.forEach((lesson, index) => {
    const item = E('li', 'vb-audio-item');
    const card = A('', `vocal-a1-pilot.html?unit=${encodeURIComponent(lesson.id)}`, 'vb-audio-card');
    const number = String(index + 1).padStart(2, '0');
    const copy = E('span', 'vb-audio-copy');
    copy.append(
      E('strong', '', lesson.title),
      E('small', '', lesson.englishTitle || ''),
      E('span', '', lesson.difficultyLabel || '')
    );
    card.append(E('span', 'vb-audio-number', number), copy, E('span', 'vb-audio-arrow', '→'));
    item.append(card);
    list.append(item);
  });
  root.append(heading, levelLessons.length ? list : E('p', 'vb-empty', '이 레벨의 음원을 준비하고 있습니다.'));
  document.title = `${selectedLevel} Vocal Camp · TalkTag`;
})();
