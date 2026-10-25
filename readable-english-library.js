(function () {
  'use strict';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const params = new URLSearchParams(location.search);
  const selected = levels.includes(params.get('level')) ? params.get('level') : '';
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
  const key = story => 'readable:en:' + story.id;
  const done = story => Boolean(window.TalkTagCompletion?.getManual(key(story)));
  const href = story => `readable-chapter.html?level=${encodeURIComponent(story.level)}`;
  const labelCompletionButtons = () => list.querySelectorAll('.tt-completion-button').forEach(button => {
    button.textContent = 'Complete';
    button.setAttribute('aria-label', 'Mark chapter complete');
  });
  let stories = [];
  document.body.dataset.audioView = selected ? 'lessons' : 'levels';
  if (selected) {
    title.textContent = `리더블 · ${selected}`;
    description.textContent = '영어로 읽고, 가린 뒤 기억해서 요약하고, 글을 다듬어 내 말로 다시 이야기해 보세요.';
    document.title = `${selected} 영어 리더블 · TalkTag`;
    levelsNav.hidden = true;
    method.hidden = true;
    back.hidden = false;
    list.hidden = false;
  }
  function render() {
    const completed = stories.filter(done);
    const inLevel = selected ? stories.filter(story => story.level === selected) : stories;
    document.getElementById('readableProgress').textContent = selected && !inLevel.length ? `${selected} · 새 챕터 준비 중` : `리더블 · ${inLevel.filter(done).length}/${inLevel.length} completed`;
    for (const anchor of levelsNav.querySelectorAll('[data-level]')) {
      const entries = stories.filter(story => story.level === anchor.dataset.level);
      const count = entries.filter(done).length;
      anchor.classList.toggle('is-level-complete', entries.length > 0 && count === entries.length);
      anchor.innerHTML = `<span>${esc(anchor.dataset.level)}</span><small class="guided-level-count">${count}/${entries.length} completed</small><span class="guided-level-meter" aria-hidden="true"><span style="width:${entries.length ? count / entries.length * 100 : 0}%"></span></span>`;
      anchor.setAttribute('aria-label', `${anchor.dataset.level}, ${count} of ${entries.length} chapters completed, open level`);
    }
    if (selected) {
      const current = stories.filter(story => story.level === selected && !done(story));
      list.innerHTML = current.length ? current.map(story => {
        const preview = String(story.paragraphs?.[0]?.en || '').slice(0, 130) + '…';
        return `<article class="lesson-card" data-completion-manual-only="true" data-completion-id="${esc(key(story))}"><a class="audio-lesson-open" href="${esc(href(story))}"><span class="audio-lesson-number">${esc(story.number)}</span><div class="lesson-copy"><h2>${esc(story.title)}</h2><p>${esc(story.genre)} · ${esc(preview)}</p><div class="lesson-meta"><span>Read · Recall · Revise · Retell</span></div></div><span class="audio-lesson-arrow" aria-hidden="true">↗</span></a><div class="lesson-card-actions" data-completion-actions><a class="audio-start-button" href="${esc(href(story))}" aria-label="Start ${esc(story.title)}">START <span aria-hidden="true">→</span></a></div></article>`;
      }).join('') : (stories.some(story => story.level === selected)
        ? '<div class="readable-empty"><strong>All chapters complete.</strong>Reopen a chapter in your completed shelf, or undo completion to return it here.</div>'
        : '<div class="readable-empty"><strong>Chapters are in preparation.</strong>Choose another level for now.</div>');
      window.TalkTagCompletion?.mount(list);
      labelCompletionButtons();
    }
    document.getElementById('readableMissionCount').textContent = String(completed.length);
    shelf.innerHTML = `<p class="audio-mission-bin-intro">Completed chapters stay in their level bins.</p>${levels.map(level => {
      const items = completed.filter(story => story.level === level);
      return `<details class="audio-mission-bin" data-level="${level}" ${selected === level && items.length ? 'open' : ''}><summary><strong>${level}</strong><span>${items.length} completed</span><i aria-hidden="true">⌄</i></summary><div class="audio-mission-bin-list">${items.length ? items.map(story => `<div class="audio-mission-row"><a href="${esc(href(story))}"><small>${esc(story.id)}</small><strong>${esc(story.title)}</strong></a><button type="button" data-undo="${esc(story.id)}" aria-label="Undo completion for ${esc(story.title)}">Undo</button></div>`).join('') : '<p class="audio-mission-bin-empty">No completed chapters yet.</p>'}</div></details>`;
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
    window.TalkTagCompletion?.set('readable:en:' + button.dataset.undo, false);
    notice.textContent = 'Chapter returned to its level list.';
  });
  window.addEventListener('talktag:completion-change', event => {
    if (String(event.detail.id).startsWith('readable:en:')) render();
  });
  window.addEventListener('pageshow', () => { render(); queueMicrotask(labelCompletionButtons); });
  window.addEventListener('storage', () => queueMicrotask(labelCompletionButtons));
  Promise.all(levels.map(level => fetch(`content/readable/en-${level.toLowerCase()}-001.json`, { cache: 'no-store' }).then(response => {
    if (!response.ok) throw Error(`${level} Readable unavailable`);
    return response.json();
  }))).then(data => {
    stories = data.filter(story => story.status === 'published' && story.paragraphs?.length && story.title && levels.includes(story.level));
    render();
  }).catch(() => {
    list.hidden = false;
    list.innerHTML = '<div class="readable-empty"><strong>Unable to load Readable.</strong>Please try again when the connection returns.</div>';
  });
})();
