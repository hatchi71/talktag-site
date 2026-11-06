import { createClient } from '@supabase/supabase-js';

const workerOrigin = 'https://talktag-private-media-preview.ejkim2022.workers.dev';
const config = window.TalkTagAuthConfig || {};
const params = new URLSearchParams(location.search);
const language = params.get('language') || 'en';
const signInDestination = `/account.html?ui=${language === 'ko' ? 'en' : 'ko'}&from=${encodeURIComponent(language)}&next=${encodeURIComponent(location.pathname + location.search)}`;
const area = params.get('area') || 'guided-listen-repeat';
const level = params.get('level') || 'A0';
const areaNames = {
  'guided-listen-repeat': 'Guided Listen & Repeat',
  'mini-talks': 'Mini Talks',
  'vocal-camp': 'Vocal Camp',
  'story-camp': 'Story Camp',
  readable: 'Readable',
  'test-content': 'Test practice'
};
const ui = language === 'ko' ? 'en' : 'ko';
const labels = ui === 'ko'
  ? { choose: '레벨 선택', completed: '완료한 미션', signIn: '로그인 후 카드를 볼 수 있습니다.', start: '시작 →', unavailable: '아직 공개된 카드가 없습니다.' }
  : { choose: 'Choose your level', completed: 'Completed missions', signIn: 'Sign in to see your available cards.', start: 'START →', unavailable: 'No cards are available for this level yet.' };
const valid = ['en', 'ko', 'ja'].includes(language) && area in areaNames &&
  ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level);
const status = document.querySelector('#status');
const cards = document.querySelector('#cards');
const signIn = document.querySelector('#sign-in');
signIn.href = signInDestination;

function href(nextLevel) {
  const query = new URLSearchParams({ language, area, level: nextLevel });
  return `/protected-library.html?${query}`;
}

function renderLevels() {
  const nav = document.querySelector('#levels');
  for (const next of ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    const link = document.createElement('a');
    link.href = href(next);
    const name = document.createElement('strong');
    name.textContent = next === 'A0' && !(language === 'en' && area === 'guided-listen-repeat') ? 'Start Here · Level 0' : next;
    const progress = document.createElement('span');
    progress.className = 'level-progress';
    progress.textContent = ui === 'ko' ? '카드를 선택하세요' : 'Choose a card';
    const bar = document.createElement('span');
    bar.className = 'progress-bar';
    const arrow = document.createElement('span');
    arrow.className = 'level-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(name, progress, bar, arrow);
    if (next === level) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
}

async function run() {
  if (!valid) { status.textContent = 'This practice area is unavailable.'; return; }
  document.querySelector('#area-label').textContent = areaNames[area].toUpperCase();
  document.querySelector('#heading').textContent = areaNames[area];
  document.querySelector('#level-heading').textContent = labels.choose;
  document.querySelector('#completed-title').textContent = labels.completed;
  renderLevels();
  if (!config.url || !config.publishableKey) {
    status.textContent = 'Sign-in is unavailable right now.';
    return;
  }
  const client = createClient(config.url, config.publishableKey);
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session) {
    status.textContent = labels.signIn;
    signIn.hidden = false;
    return;
  }
  try {
    const response = await fetch(`${workerOrigin}/api/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ language, area, level }),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(String(response.status));
    const result = await response.json();
    if (!Array.isArray(result.cards)) throw new Error('invalid_payload');
    status.textContent = result.cards.length ? '' : labels.unavailable;
    const completed = document.querySelector('#completed-cards');
    const cardIds = result.cards.map(card => card.card_id);
    let remoteCompletions = null;
    if (cardIds.length) {
      const progress = await client.from('learning_progress').select('lesson_id')
        .eq('user_id', session.user.id).in('lesson_id', cardIds);
      if (!progress.error) remoteCompletions = new Set((progress.data || []).map(row => row.lesson_id));
    }
    for (const card of result.cards) {
      const link = document.createElement('a');
      link.href = `/protected-card.html?id=${encodeURIComponent(card.card_id)}`;
      const number = document.createElement('span');
      number.className = 'number';
      number.textContent = String(card.ordinal).padStart(3, '0');
      const title = document.createElement('strong');
      title.textContent = card.title || `${areaNames[area]} ${number.textContent}`;
      const start = document.createElement('span');
      start.className = 'start';
      start.textContent = labels.start;
      link.append(number, title, start);
      cards.append(link);
      try {
        const isDone = remoteCompletions
          ? remoteCompletions.has(card.card_id)
          : Boolean(localStorage.getItem(`talktag-guided-preview:completed:${card.card_id}`));
        if (isDone) {
          const done = document.createElement('a');
          done.href = link.href;
          done.textContent = `${number.textContent} · ${title.textContent} ✓`;
          completed.append(done);
        }
      } catch {}
    }
    cards.hidden = !result.cards.length;
    document.querySelector('#completed-missions').hidden = !completed.children.length;
  } catch {
    status.textContent = 'Cards could not load. Please try again shortly.';
  }
}

run();
