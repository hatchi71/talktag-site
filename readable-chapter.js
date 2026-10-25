(() => {
  'use strict';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const requestedLevel = (new URLSearchParams(location.search).get('level') || 'A1').toUpperCase();
  const level = levels.includes(requestedLevel) ? requestedLevel : 'A1';
  const key = `talktag-readable-en-${level.toLowerCase()}-001-v1`;
  const completionKey = `readable:en:${level}-001`;
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
    if (data.id !== `${level}-001` || data.status !== 'published' || !data.paragraphs?.length) throw new Error('Chapter mismatch');
    $('#brandLevel').textContent = `리더블 · ${level}`;
    $('#chapterEyebrow').textContent = `리더블 · ${level} · 001`;
    $('#levelList').href = `readable.html?level=${encodeURIComponent(level)}`;
    $('#levelList').textContent = `${level} 목록으로`;
    $('#title').textContent = data.title;
    $('#description').textContent = data.description;
    document.title = `${data.title} · 영어 리더블 ${level} · TalkTag`;
    const source = $('#source');
    source.append('Adapted from ');
    const link = document.createElement('a');
    link.href = data.source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${data.source.title} by ${data.source.author} (${data.source.year})`;
    source.append(link, `. Original ${level} adaptation, not a verbatim excerpt.`);
    const tasks = {
      A1: ['Write three or four short English sentences from memory.', 'Where did Peter go? What did he lose? How did he get home?', 'Add one missing event and make the order clear.', 'Retell Peter’s journey aloud. Use first, then, and at last.', 'What could Peter do differently next time?'],
      A2: ['Write four or five English sentences from memory. Include a choice and its result.', 'Why did Peter enter the garden? What changed after Mr. McGregor saw him?', 'Connect Peter’s choice to one consequence, then check the sequence.', 'Retell the problem and solution aloud in your own words.', 'When have you had to change a plan?'],
      B1: ['Write a short English paragraph from memory. Include events and feelings.', 'How did Peter’s feelings change? What helped him find the gate?', 'Make the cause and turning point clear without copying the story.', 'Retell the event aloud and explain Peter’s change of approach.', 'Was Peter brave, careless, or both?'],
      B2: ['Summarize the chase and explain two different viewpoints.', 'How might Peter and Mr. McGregor describe the same encounter?', 'Show why Peter’s strategy changed and which details support your view.', 'Retell the story aloud from one viewpoint, then briefly acknowledge the other.', 'How should we judge Peter’s decision to enter?'],
      C1: ['Summarize the story and its implied judgment in a concise paragraph.', 'How does the garden change in Peter’s eyes? What does the ending imply?', 'Distinguish what happens from how the narrator invites us to interpret it.', 'Retell the story with a clear stance, then qualify that stance.', 'Can a story warn us and still admire its main character?'],
      C2: ['Summarize the narrative, then identify a tension the ending leaves open.', 'What competing interpretations of curiosity and ownership does the story allow?', 'Refine your argument by acknowledging a credible alternative reading.', 'Retell the story with nuance, using only the details that serve your interpretation.', 'What does the quiet ending leave for the reader to decide?']
    }[level];
    $('#summaryGuide').textContent = `The chapter is hidden. ${tasks[0]}`;
    $('#recallPrompt').textContent = tasks[1];
    $('#revisionGuide').textContent = `${tasks[2]} AI feedback is not active yet.`;
    $('#retellGuide').textContent = `The story and your revised text are hidden. ${tasks[3]}`;
    $('#discussPrompt').textContent = `AI discussion is not available yet. For now, ask yourself: ${tasks[4]}`;
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
  fetch(`content/readable/en-${level.toLowerCase()}-001.json`, { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('chapter unavailable'); return response.json(); })
    .then(render)
    .catch(() => {
      $('#title').textContent = 'Chapter unavailable';
      $('#description').textContent = 'Please try again later.';
      document.querySelectorAll('.panel button').forEach(button => { button.disabled = true; });
    });
})();
