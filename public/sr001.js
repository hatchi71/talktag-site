/* SR001 collection page. Public metadata controls links; private card bodies stay protected. */
(() => {
  'use strict';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const tracks = [
    { key: 'glr', name: '듣고 따라 말하기', label: 'SOUND CHECK · GLR', description: '대사를 한 줄씩 듣고, 자연스러운 말하기 간격에 따라 말해요.' },
    { key: 'mini', name: '미니토크', label: 'SOUND CHECK · MINI TALKS', description: '짧은 대화를 듣고 질문과 응답이 이어지는 흐름을 익혀요.' },
    { key: 'vocal', name: '보컬 캠프', label: 'BOOT CAMP · VOCAL', description: '같은 상황을 누적해 말하고 기억에서 다시 꺼내요.' },
    { key: 'story', name: '스토리 캠프', label: 'BOOT CAMP · STORY', description: '누가 무엇을 원했는지 재구성하고 내 말로 설명해요.' },
    { key: 'readable', name: '리더블', label: 'READABLE', description: '창가 자리 이야기에 이어, 카페에서 자리를 나누는 짧은 소설을 읽어요.' }
  ];
  const levelNotes = {
    A1: '짧은 부탁과 응답을 익숙한 표현으로 시작합니다.',
    A2: '창가 자리를 둘러싼 부탁과 응답을 연결합니다. SR001의 추천 시작점입니다.',
    B1: '상황과 이유를 덧붙여 대화를 이어갑니다.',
    B2: '서로의 선호와 제약을 비교하며 조율합니다.',
    C1: '오해를 줄이면서 제안을 섬세하게 다듬습니다.',
    C2: '같은 장면에서 말투와 맥락의 미묘한 차이를 다룹니다.'
  };
  const catalog = Array.isArray(window.TalkTagSR001Catalog?.cards) ? window.TalkTagSR001Catalog.cards : [];
  const published = new Set(catalog.filter(item => item?.available === true).map(item => item.id));
  const buttons = [...document.querySelectorAll('.sr-levels [data-level]')];
  const list = document.getElementById('sr-track-list');
  const current = document.getElementById('sr-current-level');
  const note = document.getElementById('sr-level-note');
  const total = document.getElementById('sr-ready-total');
  const artwork = document.getElementById('sr-artwork');
  const validLevel = value => levels.includes(String(value || '').toUpperCase()) ? String(value).toUpperCase() : 'A2';
  const cardId = (level, track) => `en-sr001-${level.toLowerCase()}-${track}`;

  function render(level, changeUrl) {
    const chosen = validLevel(level);
    const artCard = catalog.find(item => item?.id === cardId(chosen, 'glr'));
    artwork.hidden = true;
    artwork.onload = () => { artwork.hidden = false; };
    artwork.onerror = () => { artwork.hidden = true; };
    artwork.src = artCard?.artwork || `/assets/images/sr001/${chosen.toLowerCase()}.webp`;
    artwork.alt = artCard?.artworkAlt || `카페 창가 자리에서 대화하는 Maya와 Ben · ${chosen}`;
    buttons.forEach(button => {
      const selected = button.dataset.level === chosen;
      button.setAttribute('aria-pressed', String(selected));
      const ready = tracks.filter(track => published.has(cardId(button.dataset.level, track.key))).length;
      button.querySelector('small').textContent = ready ? `${ready} / ${tracks.length} 공개` : '준비 중';
    });
    current.textContent = `${chosen} · SR001`;
    note.textContent = levelNotes[chosen];
    const readyCount = tracks.filter(track => published.has(cardId(chosen, track.key))).length;
    total.textContent = readyCount ? `${readyCount} / ${tracks.length} 공개` : '카드 준비 중';
    list.replaceChildren();
    tracks.forEach(track => {
      const id = cardId(chosen, track.key);
      const ready = published.has(id);
      const card = catalog.find(item => item?.id === id);
      const li = document.createElement('li');
      li.className = `sr-track-card${ready ? ' is-ready' : ''}`;
      li.dataset.cardId = id;
      const thumbnail = document.createElement('span');
      thumbnail.className = 'sr-track-thumbnail';
      if (ready && card?.artwork) {
        const picture = document.createElement('img');
        picture.src = card.artwork;
        picture.alt = '';
        picture.loading = 'lazy';
        thumbnail.append(picture);
      }
      const copy = document.createElement('span');
      copy.className = 'sr-track-copy';
      const label = document.createElement('small');
      label.textContent = ready ? track.name : track.label;
      const title = document.createElement('strong');
      title.textContent = ready && card?.title ? card.title : track.name;
      const description = document.createElement('span');
      description.textContent = ready && card?.description ? card.description : track.description;
      copy.append(label, title, description);
      const action = document.createElement('span');
      action.className = 'sr-track-action';
      action.textContent = ready ? '연습 시작 ↗' : '준비 중';
      const surface = document.createElement(ready ? 'a' : 'div');
      surface.className = 'sr-track-surface';
      if (ready) surface.href = `/protected-card.html?id=${encodeURIComponent(id)}`;
      surface.append(thumbnail, copy, action);
      li.append(surface);
      list.append(li);
    });
    if (changeUrl) {
      const url = new URL(location.href);
      url.searchParams.set('level', chosen);
      history.replaceState(null, '', url);
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => render(button.dataset.level, true)));
  window.addEventListener('popstate', () => render(new URLSearchParams(location.search).get('level'), false));
  render(new URLSearchParams(location.search).get('level'), false);
})();
