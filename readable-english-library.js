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
  const href = story => `bootcamp-story.html?mode=readable&level=${encodeURIComponent(story.level)}&id=${Number(story.id.split('-')[1])}`;
  const labelCompletionButtons = () => list.querySelectorAll('.tt-completion-button').forEach(button => {
    button.textContent = 'Complete';
    button.setAttribute('aria-label', 'Mark chapter complete');
  });
  let stories = [];
  document.body.dataset.audioView = selected ? 'lessons' : 'levels';
  if (selected) {
    title.textContent = `리더블 · ${selected}`;
    description.textContent = 'Read the English story, close it, then recall and retell it in your own words.';
    document.title = `${selected} 영어 리더블 · TalkTag`;
    levelsNav.hidden = true;
    method.hidden = true;
    back.hidden = false;
    list.hidden = false;
  }
  function render() {
    const completed = stories.filter(done);
    document.getElementById('readableProgress').textContent = `리더블 · ${completed.length}/${stories.length} completed`;
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
        const preview = String(story.content || '').split(/\n\s*\n/)[0];
        return `<article class="lesson-card" data-completion-manual-only="true" data-completion-id="${esc(key(story))}"><a class="audio-lesson-open" href="${esc(href(story))}"><span class="audio-lesson-number">${esc(story.id.split('-')[1])}</span><div class="lesson-copy"><h2>${esc(story.title)}</h2><p>${esc(story.genre)} · ${esc(preview)}</p><div class="lesson-meta"><span>Read · Recall · Retell</span></div></div><span class="audio-lesson-arrow" aria-hidden="true">↗</span></a><div class="lesson-card-actions" data-completion-actions></div></article>`;
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
  fetch('content/readable/readable-stories-A1-C2-60.json').then(response => {
    if (!response.ok) throw Error('Readable catalog unavailable');
    return response.json();
  }).then(data => {
    stories = data.filter(story => levels.includes(story.level) && story.content && story.title);
    render();
  }).catch(() => {
    list.hidden = false;
    list.innerHTML = '<div class="readable-empty"><strong>Unable to load Readable.</strong>Please try again when the connection returns.</div>';
  });
})();
