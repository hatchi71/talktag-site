(function () {
  'use strict';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const params = new URLSearchParams(location.search);
  const selected = levels.includes(params.get('level')) ? params.get('level') : '';
  const localPreview = ['localhost', '127.0.0.1', ''].includes(location.hostname) && params.get('preview') === '1';
  const all = window.TalkTagKoreanReadable || [];
  const lessons = all.filter(item => item.status === 'published' || localPreview);
  const title = document.getElementById('readableTitle');
  const description = document.getElementById('readableDescription');
  const list = document.getElementById('readableList');
  const levelsNav = document.getElementById('readableLevels');
  const method = document.getElementById('readableMethod');
  const back = document.getElementById('changeLevel');
  const shelf = document.getElementById('readableMissionList');
  const toggle = document.getElementById('readableMissionsToggle');
  const notice = document.getElementById('readableMissionNotice');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const done = item => item.status === 'published' && Boolean(window.TalkTagCompletion?.getManual('readable:' + item.id));
  const href = item => 'K-korean-readable-chapter.html?id=' + encodeURIComponent(item.id) + (localPreview ? '&preview=1' : '');
  if (localPreview) {
    for (const anchor of levelsNav.querySelectorAll('[data-level]')) {
      anchor.href += '&preview=1';
    }
    back.href += '?preview=1';
  }
  document.body.dataset.audioView = selected ? 'lessons' : 'levels';
  if (!selected) levelsNav.after(document.getElementById('readableMissions'));
  if (selected) {
    title.textContent = `Readable · ${selected}`;
    description.textContent = 'Read Korean first. Close the text to recall and retell in your own words.';
    document.title = `${selected} Korean Readable · TalkTag`;
    levelsNav.hidden = true;
    method.hidden = true;
    back.hidden = false;
    list.hidden = false;
  }
  function render() {
    const completed = lessons.filter(done);
    document.getElementById('readableProgress').textContent = `Readable · ${completed.length}/${lessons.filter(item => item.status === 'published').length} completed`;
    for (const anchor of levelsNav.querySelectorAll('[data-level]')) {
      const entries = lessons.filter(item => item.level === anchor.dataset.level && item.status === 'published');
      const count = entries.filter(done).length;
      anchor.classList.toggle('is-level-complete', entries.length > 0 && count === entries.length);
      anchor.innerHTML = `<span>${esc(anchor.dataset.level)}</span><small class="guided-level-count">${count}/${entries.length} completed</small><span class="guided-level-meter" aria-hidden="true"><span style="width:${entries.length ? count / entries.length * 100 : 0}%"></span></span>`;
      anchor.setAttribute('aria-label', `${anchor.dataset.level}, ${count} of ${entries.length} chapters completed, open level`);
    }
    if (selected) {
      const current = lessons.filter(item => item.level === selected && !done(item));
      list.innerHTML = current.length ? current.map(item => {
        const published = item.status === 'published';
        return `<article class="lesson-card" ${published ? `data-completion-manual-only="true" data-completion-id="readable:${esc(item.id)}"` : ''}><a class="audio-lesson-open${item.artwork ? ' has-readable-artwork' : ''}" href="${esc(href(item))}"><span class="audio-lesson-number">${String(item.unit).padStart(2, '0')}</span><div class="lesson-copy"><h2 lang="ko">${esc(item.nativeTitle)}</h2><p class="readable-english-title" lang="en">${esc(item.title)}</p><p>${esc(item.situation)}</p><div class="lesson-meta"><span>${esc(item.readingMinutes)} min reading target</span><span>${published ? 'Read · Recall · Retell' : 'Local review draft'}</span></div></div>${item.artwork ? `<img class="readable-cover-thumb" src="${esc(item.artwork)}" alt="${esc(item.artworkAlt)}" width="720" height="480" loading="lazy">` : ''}<span class="audio-lesson-arrow" aria-hidden="true">↗</span></a><div class="lesson-card-actions"${published ? ' data-completion-actions' : ''}><a class="audio-start-button" href="${esc(href(item))}" aria-label="${published ? 'Start' : 'Preview'} ${esc(item.title)}">${published ? 'START' : 'PREVIEW'} <span aria-hidden="true">→</span></a></div></article>`;
      }).join('') : (lessons.some(item => item.level === selected && item.status === 'published')
        ? '<div class="readable-empty"><strong>All chapters complete.</strong>Reopen a chapter in your completed shelf, or undo completion to return it here.</div>'
        : '<div class="readable-empty"><strong>Chapters are in preparation.</strong>We are checking original Korean text and level fit before opening this collection.</div>');
      window.TalkTagCompletion?.mount(list);
    }
    document.getElementById('readableMissionCount').textContent = String(completed.length);
    shelf.innerHTML = `<p class="audio-mission-bin-intro">Completed chapters stay in their level bins.</p>${levels.map(level => {
      const items = completed.filter(item => item.level === level);
      return `<details class="audio-mission-bin" data-level="${level}" ${selected === level && items.length ? 'open' : ''}><summary><strong>${level}</strong><span>${items.length} completed</span><i aria-hidden="true">⌄</i></summary><div class="audio-mission-bin-list">${items.length ? items.map(item => `<div class="audio-mission-row"><a href="${esc(href(item))}"><small>${String(item.unit).padStart(2, '0')}</small><strong>${esc(item.title)}</strong></a><button type="button" data-undo="${esc(item.id)}" aria-label="Undo completion for ${esc(item.title)}">Undo</button></div>`).join('') : '<p class="audio-mission-bin-empty">No completed chapters yet.</p>'}</div></details>`;
    }).join('')}`;
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    shelf.hidden = !open;
  });
  shelf.addEventListener('click', event => {
    const button = event.target.closest('[data-undo]');
    if (!button) return;
    window.TalkTagCompletion?.set('readable:' + button.dataset.undo, false);
    notice.textContent = 'Chapter returned to its level list.';
  });
  window.addEventListener('talktag:completion-change', event => {
    if (String(event.detail.id).startsWith('readable:')) render();
  });
  window.addEventListener('pageshow', render);
  render();
})();
