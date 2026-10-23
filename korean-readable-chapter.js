(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const item = (window.TalkTagKoreanReadable || []).find(entry => entry.id === params.get('id'));
  const localPreview = ['localhost', '127.0.0.1', ''].includes(location.hostname) && params.get('preview') === '1';
  if (!item || (item.status !== 'published' && !localPreview)) {
    document.getElementById('chapterUnavailable').hidden = false;
    return;
  }
  const root = document.getElementById('chapterRoot');
  root.hidden = false;
  if (item.status !== 'published') document.getElementById('chapterDraft').hidden = false;
  document.title = `${item.title} · Korean Readable · TalkTag`;
  document.getElementById('chapterTitle').textContent = item.nativeTitle;
  document.getElementById('chapterEnglishTitle').textContent = item.title;
  document.getElementById('chapterSituation').textContent = item.situation;
  if (item.artwork) {
    const cover = document.getElementById('chapterCover');
    const image = document.getElementById('chapterCoverImage');
    image.src = item.artwork;
    image.alt = item.artworkAlt || '';
    cover.hidden = false;
  }
  document.getElementById('chapterKicker').textContent = `${item.level} · UNIT ${String(item.unit).padStart(3, '0')} · READABLE`;
  const back = 'K-korean-readable.html?level=' + encodeURIComponent(item.level) + (localPreview ? '&preview=1' : '');
  document.getElementById('chapterBack').href = back;
  document.getElementById('chapterReturn').href = back;
  const text = document.getElementById('chapterText');
  const paragraphs = item.paragraphs.map(paragraph => {
    const article = document.createElement('article');
    const korean = document.createElement('p');
    korean.lang = 'ko';
    korean.textContent = paragraph.ko;
    const english = document.createElement('p');
    english.lang = 'en';
    english.className = 'chapter-en';
    english.textContent = paragraph.en;
    english.hidden = true;
    article.append(korean, english);
    return article;
  });
  text.append(...paragraphs);
  window.TalkTagKoreanSupport?.mount(document.getElementById('chapterLanguageAnchor'), {
    id: item.id,
    source: item.paragraphs.map(paragraph => paragraph.ko),
    english: item.paragraphs.map(paragraph => paragraph.en),
    translations: window.TalkTagKoreanTranslations?.[item.id] || {},
    onChange(lines, language) {
      paragraphs.forEach((article, index) => {
        const support = article.querySelector('.chapter-en');
        support.textContent = lines[index];
        support.lang = language;
      });
    }
  });
  document.getElementById('recallPrompts').replaceChildren(...item.prompts.recall.map(prompt => {
    const li = document.createElement('li');
    li.textContent = prompt;
    return li;
  }));
  const storageKey = 'talktag:readable:' + item.id + ':v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { saved = {}; }
  const original = document.getElementById('originalDraft');
  const revised = document.getElementById('revisedDraft');
  original.value = saved.original || '';
  revised.value = saved.revised || '';
  const meaning = document.getElementById('meaningToggle');
  const notes = document.getElementById('notesToggle');
  function persist() {
    saved = { step: saved.step || 1, original: original.value, revised: revised.value };
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch {
      document.querySelectorAll('.chapter-save-status').forEach(node => { node.textContent = 'Storage unavailable; copy your writing before leaving this page.'; });
    }
  }
  original.addEventListener('input', persist);
  revised.addEventListener('input', persist);
  meaning.addEventListener('click', () => {
    const shown = meaning.getAttribute('aria-pressed') !== 'true';
    meaning.setAttribute('aria-pressed', String(shown));
    meaning.textContent = shown ? 'Hide meaning' : 'Show meaning';
    text.querySelectorAll('.chapter-en').forEach(node => { node.hidden = !shown; });
  });
  notes.addEventListener('click', () => {
    const shown = notes.getAttribute('aria-expanded') !== 'true';
    notes.setAttribute('aria-expanded', String(shown));
    notes.textContent = shown ? 'Hide my notes' : 'Show my notes';
    document.getElementById('retellNotes').hidden = !shown;
  });
  function step(number) {
    saved.step = number;
    persist();
    document.querySelectorAll('[data-step-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.stepPanel) !== number; });
    document.querySelectorAll('.chapter-steps [data-step]').forEach(button => {
      if (Number(button.dataset.step) === number) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (number === 3) document.getElementById('originalSnapshot').textContent = original.value || 'Write your first summary in Step 2.';
    if (number === 4) {
      const note = revised.value || original.value;
      document.getElementById('retellNotes').textContent = note || 'No notes yet.';
      document.getElementById('retellNotes').hidden = true;
      notes.setAttribute('aria-expanded', 'false');
      notes.textContent = 'Show my notes';
    }
    document.querySelector(`[data-step-panel="${number}"] h2`)?.focus({preventScroll:true});
  }
  document.querySelectorAll('.chapter-steps [data-step], [data-next]').forEach(button => {
    button.addEventListener('click', () => step(Number(button.dataset.step || button.dataset.next)));
  });
  const complete = document.getElementById('chapterComplete');
  if (item.status !== 'published') {
    complete.disabled = true;
    complete.textContent = 'Completion opens after publication';
  } else {
    const key = 'readable:' + item.id;
    function update() {
      const done = Boolean(window.TalkTagCompletion?.getManual(key));
      complete.setAttribute('aria-pressed', String(done));
      complete.textContent = done ? 'Completed · undo' : 'Mark as completed';
    }
    complete.addEventListener('click', () => {
      window.TalkTagCompletion?.set(key, !window.TalkTagCompletion.getManual(key));
      update();
    });
    update();
  }
  step([1, 2, 3, 4, 5].includes(saved.step) ? saved.step : 1);
})();
