(() => {
  'use strict';
  const key = 'talktag-readable-en-a1-001-v1';
  const completionKey = 'readable:en:A1-001';
  const $ = (selector) => document.querySelector(selector);
  const state = { step: 1, summary: '', firstDraft: '', revision: '', complete: false, support: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved && typeof saved === 'object') {
      if (Number.isInteger(saved.step) && saved.step >= 1 && saved.step <= 5) state.step = saved.step;
      for (const field of ['summary', 'firstDraft', 'revision']) if (typeof saved[field] === 'string') state[field] = saved[field];
      state.complete = saved.complete === true;
      state.support = saved.support === true;
    }
  } catch (_) { /* The chapter remains usable when local storage is unavailable. */ }
  if (window.TalkTagCompletion) state.complete = Boolean(window.TalkTagCompletion.getManual(completionKey));
  if (!state.complete && state.step === 5) state.step = 4;
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} };
  const steps = [...document.querySelectorAll('.path span')];
  const panels = [...document.querySelectorAll('[data-step]')];
  const summary = $('#summary');
  const revision = $('#revision');
  const completion = $('#complete');
  const completionStatus = $('#completionStatus');

  function updateDrafts() {
    $('#originalDraft').textContent = state.firstDraft.trim() || 'Your first draft will appear here when you continue from Step 2.';
    $('#retellNotes').textContent = state.revision.trim() || state.firstDraft.trim() || 'No notes saved yet.';
  }
  function showStep(number) {
    state.step = number;
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.step) !== number; });
    steps.forEach((item, index) => {
      item.classList.toggle('current', index + 1 === number);
      item.classList.toggle('done', index + 1 < number);
    });
    updateDrafts();
    persist();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function setSupport(visible) {
    state.support = visible;
    document.querySelectorAll('.support').forEach(item => { item.hidden = !visible; });
    $('#enOnly').setAttribute('aria-pressed', String(!visible));
    $('#enKr').setAttribute('aria-pressed', String(visible));
    persist();
  }
  function render(data) {
    $('#title').textContent = data.title;
    $('#description').textContent = data.description;
    document.title = `${data.title} · 영어 리더블 A1 · TalkTag`;
    const source = $('#source');
    source.append('Adapted from ');
    const link = document.createElement('a');
    link.href = data.source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${data.source.title} by ${data.source.author} (${data.source.year})`;
    source.append(link, '. Original A1 adaptation, not a verbatim excerpt.');
    const chapter = $('#chapter');
    for (const block of data.paragraphs) {
      const section = document.createElement('div');
      section.className = 'paragraph';
      const english = document.createElement('p');
      english.textContent = block.en;
      const korean = document.createElement('p');
      korean.className = 'support';
      korean.textContent = block.kr;
      section.append(english, korean);
      chapter.append(section);
    }
    setSupport(state.support);
  }

  summary.value = state.summary;
  revision.value = state.revision;
  summary.addEventListener('input', () => {
    state.summary = summary.value;
    $('#summarySaved').textContent = 'Draft saved on this device.';
    persist();
  });
  revision.addEventListener('input', () => {
    state.revision = revision.value;
    $('#revisionSaved').textContent = 'Revision saved on this device.';
    persist();
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 3 && !state.firstDraft.trim()) state.firstDraft = state.summary;
    showStep(next);
  }));
  $('#enOnly').addEventListener('click', () => setSupport(false));
  $('#enKr').addEventListener('click', () => setSupport(true));
  $('#notesToggle').addEventListener('click', () => {
    const notes = $('#notes');
    notes.hidden = !notes.hidden;
    $('#notesToggle').textContent = notes.hidden ? 'Show my notes' : 'Hide my notes';
    $('#notesToggle').setAttribute('aria-expanded', String(!notes.hidden));
  });
  function updateCompletion() {
    completion.textContent = state.complete ? 'Undo completion' : 'Mark practice complete';
    completionStatus.textContent = state.complete ? 'Practice completed on this device. You can undo it.' : '';
  }
  completion.addEventListener('click', () => {
    state.complete = !state.complete;
    window.TalkTagCompletion?.set(completionKey, state.complete);
    updateCompletion();
    persist();
    if (state.complete) showStep(5);
  });
  window.addEventListener('talktag:completion-change', event => {
    if (event.detail.id !== completionKey) return;
    state.complete = Boolean(event.detail.completed);
    updateCompletion();
    persist();
  });
  updateCompletion();
  showStep(state.step);
  fetch('content/readable/en-a1-001.json', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('chapter unavailable'); return response.json(); })
    .then(render)
    .catch(() => {
      $('#title').textContent = 'Chapter unavailable';
      $('#description').textContent = 'Please try again later.';
      document.querySelectorAll('.panel button').forEach(button => { button.disabled = true; });
    });
})();
