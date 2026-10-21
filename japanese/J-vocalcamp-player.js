(() => {
  'use strict';
  const app = document.getElementById('pilotApp');
  const params = new URLSearchParams(location.search);
  const level = (params.get('level') || '').toUpperCase();
  const family = params.get('family') || '001';
  const manifest = window.TalkTagJapaneseVocal001Variants;
  const preview = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const catalog = `J-vocal-camp.html?level=${encodeURIComponent(level)}`;
  const back = document.querySelector('.pilot-back');
  if (back) { back.href = catalog; back.textContent = `← ${level || ''} Vocal Camp`; }
  if (!['A1','A2','B1','B2','C1','C2'].includes(level) || family !== '001' || !manifest) {
    app.innerHTML = '<div class="pilot-loading">에피소드 자료를 찾을 수 없습니다. 레벨 목록으로 돌아가 주세요.</div>';
    return;
  }
  if (manifest.status !== 'published' && !preview) {
    app.innerHTML = '<div class="pilot-loading">일본어 Vocal Camp 001 음원을 검수하고 있습니다. 검수가 끝나면 이 카드가 열립니다.</div>';
    return;
  }
  const lesson = manifest.cards.find(card => card.id === `japanese-vocalcamp-001-${level}`);
  if (!lesson || !lesson.lines.length || lesson.steps.length !== lesson.lines.length ||
      lesson.steps.some((step, index) => step.step !== index + 1 || step.variants.length !== 4)) {
    app.innerHTML = '<div class="pilot-loading">음원과 대본이 일치하지 않습니다. 이 카드는 아직 열 수 없습니다.</div>';
    return;
  }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const REPEATS = /^A[12]$/.test(level) ? 10 : /^B[12]$/.test(level) ? 15 : 21;
  const RATIOS = [2, 2.5, 3, 3.5];
  const stateKey = `talktag-japanese-vocalcamp:001:${level}:v1`;
  const pauseKey = 'talktag-speaking-pause-multiplier';
  const state = {card: 0, counts: lesson.lines.map(() => 0)};
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey) || '{}');
    if (Number.isInteger(saved.card)) state.card = Math.max(0, Math.min(3, saved.card));
    if (Array.isArray(saved.counts) && saved.counts.length === lesson.lines.length)
      state.counts = saved.counts.map(n => Math.max(0, Math.min(REPEATS, Number(n) || 0)));
  } catch (_) {}
  let ratio = 2.5;
  try { const saved = Number(localStorage.getItem(pauseKey)); if (RATIOS.includes(saved)) ratio = saved; } catch (_) {}
  const storyFlow = {
    A1:['인사','질문','대답','함께 앉기'],
    A2:['수업을 알게 됨','오늘의 느낌','솔직한 대답','다음 약속'],
    B1:['참여한 이유','듣기 어려움','도움 요청','대화 이어 가기'],
    B2:['활동 제안','부담 줄이기','짝 연습','모두의 발언'],
    C1:['자유롭게 말하기','피드백 시점','자신감 지키기','다음 수업에 적용'],
    C2:['참여의 구조','대화의 균형','생각할 시간','다음 운영에 반영']
  };
  document.title = `001 · ${level} · First Community Class | TalkTag 日本語`;
  app.innerHTML = `
    <section class="pilot-intro">
      <p class="pilot-kicker">001 · ${esc(level)} · 일본어 VOCAL CAMP <span aria-label="일본 표준어">🇯🇵</span></p>
      <h1>First Community Class</h1>
      <p class="pilot-english-title" lang="ja">初めての地域クラス</p>
      <p class="pilot-mission">두 사람의 대화를 소리로 익히고, 기억해서 내 이야기로 만들어 보세요.</p>
      ${manifest.status !== 'published' ? '<p class="j-vocal-preview">로컬 음원 검수 미리보기 · 아직 공개되지 않았습니다.</p>' : ''}
    </section>
    <div class="pilot-status"><strong id="cardCount"></strong><span id="cardName"></span></div>
    <div class="pilot-track" aria-hidden="true"><span id="progressBar"></span></div>
    <section id="cardDeck">
      <article class="pilot-card" data-card="0"><p class="card-label">1 · SOUND</p><h2>소리부터 이야기까지</h2><p class="card-guide">두 화자의 대화를 한 줄씩 더하며 듣고 따라 말해 보세요. 각 단계는 앞의 모든 대사를 포함합니다.</p>
        <div class="vocal-pause-control"><label for="vocalPauseRange">말하기 간격 <output id="vocalPauseValue"></output></label><input id="vocalPauseRange" type="range" min="0" max="3" step="1" aria-label="말하기 간격: 음성 길이의 2배, 2.5배, 3배, 3.5배"><div class="vocal-pause-marks" aria-hidden="true"><span>2.0×</span><span>2.5×</span><span>3.0×</span><span>3.5×</span></div><small>누적 대화 전체가 끝난 뒤 최소 3초. 원어민 음성 속도는 바뀌지 않습니다.</small></div>
        <div class="sound-ladder" id="soundLadder">${lesson.lines.map((line, index) => `<button class="sound-step" type="button" data-step="${index}" aria-label="${index + 1}단계, ${index + 1}개 대사 누적 재생"><span class="sound-shape" aria-hidden="true">${Array.from({length:index + 1}, () => '<i></i>').join('')}</span><strong>${index ? `1–${index + 1} 누적` : '첫 대사'}</strong><small><b data-count="${index}">0</b> / ${REPEATS}회</small><em>▶</em></button>`).join('')}</div>
        <p class="sound-note" id="soundStatus" role="status" aria-live="polite">첫 소리 버튼을 누르면 누적 연습이 시작됩니다.</p>
      </article>
      <article class="pilot-card" data-card="1"><p class="card-label">2 · SAY &amp; WRITE</p><h2>먼저 말하고, 나중에 확인하세요</h2><p class="card-guide">휴대폰을 잠시 내려놓고 처음부터 말한 뒤, 기억나는 대사를 적어 보세요. 필요할 때만 대본을 여세요.</p><div class="offline-card"><span aria-hidden="true">✦</span><p>기억해서 말하고<br>직접 적어 보세요.</p><small>대본은 마지막에 확인합니다.</small></div>
        <div class="reference-actions j-vocal-reference-actions" role="group" aria-label="대본 표시 방식"><button class="action reference-button" type="button" data-mode="ja" aria-pressed="false">일본어</button><button class="action reference-button" type="button" data-mode="ruby" aria-pressed="false">후리가나</button><button class="action reference-button" type="button" data-mode="ko" aria-pressed="false">한국어 뜻</button></div>
        <section class="reference-panel j-vocal-script" id="referencePanel" hidden aria-live="polite"></section>
      </article>
      <article class="pilot-card" data-card="2"><p class="card-label">3 · MY STORY</p><h2>같은 흐름을 나의 이야기로</h2><p class="card-guide">상황의 흐름은 유지하되, 인물·장소·선택을 실제 경험에 맞게 바꾸어 일본어로 말해 보세요.</p><div class="flow-cues" aria-label="이야기 흐름">${storyFlow[level].map((cue, index) => `${index ? '<i aria-hidden="true">→</i>' : ''}<span>${esc(cue)}</span>`).join('')}</div><div class="offline-card warm"><span aria-hidden="true">↗</span><p>대본을 보지 않고<br>내 이야기로 다시 말해 보세요.</p></div></article>
      <article class="pilot-card" data-card="3"><p class="card-label">4 · SHARE</p><h2>파트너에게 들려주세요</h2><p class="card-guide">노트나 휴대폰을 보지 않고, 실제 사람에게 내 이야기를 자연스럽게 전해 보세요.</p><div class="share-stage"><div class="share-people" aria-hidden="true"><span>나</span><i></i><span>파트너</span></div><p>서로의 언어로 묻고 듣고 말해 보세요.</p></div><div class="win"><strong>VOCAL CAMP</strong><p>소리에서 시작해 나의 실제 이야기로 마쳤습니다.</p></div></article>
    </section>
    <nav class="pilot-nav" aria-label="훈련 카드 이동"><details class="pilot-menu" id="pilotMenu"><summary aria-label="훈련 메뉴">•••</summary><div class="pilot-menu-panel"><button type="button" id="restartButton">처음부터 다시 시작</button><a href="${catalog}">${esc(level)} Vocal Camp 목록으로</a></div></details><button class="pilot-nav-button" id="prevButton" type="button">← 이전</button><button class="pilot-nav-button primary" id="nextButton" type="button">다음 →</button><button class="pilot-nav-button pilot-reset-button" id="resetButton" type="button">↻ 초기화</button></nav>`;

  const deck = [...app.querySelectorAll('.pilot-card')];
  const soundStatus = app.querySelector('#soundStatus');
  const player = new Audio(); player.preload = 'auto'; player.playsInline = true;
  let runToken = 0, activeStep = -1;
  function save() { try { localStorage.setItem(stateKey, JSON.stringify(state)); } catch (_) {} }
  function setPauseLabel() {
    const range = app.querySelector('#vocalPauseRange');
    range.value = String(RATIOS.indexOf(ratio));
    app.querySelector('#vocalPauseValue').textContent = `${ratio.toFixed(1)}×`;
  }
  setPauseLabel();
  app.querySelector('#vocalPauseRange').addEventListener('input', event => {
    ratio = RATIOS[Number(event.target.value)]; setPauseLabel();
    try { localStorage.setItem(pauseKey, String(ratio)); } catch (_) {}
    if (activeStep >= 0) soundStatus.textContent = `다음 반복부터 말하기 간격 ${ratio.toFixed(1)}배가 적용됩니다.`;
  });
  function paintSteps() {
    for (const button of app.querySelectorAll('[data-step]')) {
      const index = Number(button.dataset.step), complete = state.counts[index] >= REPEATS;
      button.querySelector(`[data-count="${index}"]`).textContent = state.counts[index];
      button.classList.toggle('is-complete', complete);
      button.querySelector('em').textContent = complete ? '✓' : '▶';
    }
  }
  function stopSound(message) {
    runToken++;
    player.pause(); player.onended = null; player.onerror = null; player.ontimeupdate = null;
    player.removeAttribute('src'); player.load();
    activeStep = -1;
    app.querySelectorAll('[data-step]').forEach(button => button.classList.remove('is-playing','is-waiting'));
    paintSteps();
    if (message) soundStatus.textContent = message;
  }
  function playStep(index, token) {
    if (token !== runToken) return;
    const variant = lesson.steps[index].variants.find(item => Number(item.ratio) === ratio);
    if (!variant || variant.cues.length !== index + 1) {
      stopSound('이 단계의 음원 또는 대본이 일치하지 않습니다.'); return;
    }
    const button = app.querySelector(`[data-step="${index}"]`);
    app.querySelectorAll('[data-step]').forEach(item => item.classList.remove('is-playing','is-waiting'));
    button.classList.add('is-playing'); button.querySelector('em').textContent = '■';
    soundStatus.textContent = `${index + 1}단계 · ${state.counts[index] + 1}/${REPEATS}회 듣는 중`;
    let phase = '';
    player.ontimeupdate = () => {
      if (token !== runToken) return;
      const cue = variant.cues.find(item => item.start <= player.currentTime && player.currentTime < item.pauseEnd);
      if (!cue) return;
      const waiting = cue === variant.cues.at(-1) && player.currentTime >= cue.voiceEnd;
      const nextPhase = `${cue.lineId}:${waiting}`;
      if (nextPhase === phase) return;
      phase = nextPhase;
      button.classList.toggle('is-waiting', waiting);
      button.classList.toggle('is-playing', !waiting);
      soundStatus.textContent = waiting
        ? `PAUSE · 방금 들은 누적 대화 전체를 말해 보세요. ${Math.max(0, Math.ceil(cue.pauseEnd - player.currentTime))}초`
        : `${cue.speaker === 'Mina' ? '미나' : '유우'} · ${index + 1}단계 · ${state.counts[index] + 1}/${REPEATS}회`;
    };
    player.onended = () => {
      if (token !== runToken) return;
      state.counts[index] = Math.min(REPEATS, state.counts[index] + 1);
      save(); paintSteps();
      if (state.counts[index] < REPEATS) { playStep(index, token); return; }
      button.classList.remove('is-playing','is-waiting');
      if (index + 1 < lesson.steps.length) {
        const next = app.querySelector(`[data-step="${index + 1}"]`);
        activeStep = index + 1;
        next.scrollIntoView({block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
        playStep(index + 1, token);
      } else { activeStep = -1; soundStatus.textContent = '누적 소리 연습을 마쳤습니다. 이제 처음부터 기억해서 말해 보세요.'; }
    };
    player.onerror = () => { if (token === runToken) stopSound('음원을 불러오지 못했습니다. 연결을 확인하고 다시 눌러 주세요.'); };
    player.src = manifest.status === 'published' ? variant.audio : variant.localAudio;
    player.currentTime = 0;
    player.play().catch(() => { if (token === runToken) stopSound('브라우저가 재생을 막았습니다. 같은 단계를 다시 눌러 주세요.'); });
  }
  app.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (activeStep === index) { stopSound('반복을 멈췄습니다. 같은 단계를 눌러 다시 시작하세요.'); return; }
    stopSound();
    if (state.counts[index] >= REPEATS) state.counts[index] = 0;
    save(); paintSteps(); activeStep = index;
    playStep(index, runToken);
  }));
  const reference = app.querySelector('#referencePanel');
  let referenceMode = '';
  function showReference(mode) {
    referenceMode = referenceMode === mode ? '' : mode;
    for (const button of app.querySelectorAll('[data-mode]'))
      button.setAttribute('aria-pressed', String(button.dataset.mode === referenceMode));
    reference.hidden = !referenceMode;
    if (!referenceMode) return;
    const title = referenceMode === 'ko' ? '한국어 뜻' : referenceMode === 'ruby' ? '일본어 · 후리가나' : '일본어 대본';
    reference.lang = referenceMode === 'ko' ? 'ko' : 'ja';
    reference.innerHTML = `<p class="reference-label">${title}</p><ol class="j-vocal-script-list">${lesson.lines.map(line => {
      const text = referenceMode === 'ko' ? esc(line.korean)
        : referenceMode === 'ruby' ? window.TalkTagJapaneseFurigana.render(line.japanese, line.reading)
        : esc(line.japanese);
      return `<li><span class="j-vocal-speaker">${line.speaker === 'Mina' ? '미나' : '유우'}</span><span>${text}</span></li>`;
    }).join('')}</ol>`;
  }
  app.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => showReference(button.dataset.mode)));
  function showCard(index) {
    stopSound();
    state.card = Math.max(0, Math.min(3, index)); save();
    deck.forEach((card, i) => { card.classList.toggle('is-active', i === state.card); card.setAttribute('aria-hidden', String(i !== state.card)); });
    app.querySelector('#cardCount').textContent = `${state.card + 1} / 4`;
    app.querySelector('#cardName').textContent = ['SOUND','SAY & WRITE','MY STORY','SHARE'][state.card];
    app.querySelector('#progressBar').style.width = `${(state.card + 1) * 25}%`;
    app.querySelector('#prevButton').disabled = state.card === 0;
    app.querySelector('#nextButton').textContent = state.card === 3 ? '연습 완료' : '다음 →';
    scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
  app.querySelector('#prevButton').addEventListener('click', () => showCard(state.card - 1));
  app.querySelector('#nextButton').addEventListener('click', () => {
    if (state.card < 3) { showCard(state.card + 1); return; }
    stopSound();
    window.TalkTagCampProgress?.set('ja-vocal', level, '001', true);
    location.href = catalog;
  });
  function resetTraining() {
    stopSound(); state.card = 0; state.counts = lesson.lines.map(() => 0); save();
    app.querySelector('#pilotMenu').open = false;
    showCard(0);
    soundStatus.textContent = '이 카드의 누적 연습 기록을 처음부터 다시 시작합니다.';
  }
  app.querySelector('#restartButton').addEventListener('click', resetTraining);
  app.querySelector('#resetButton').addEventListener('click', resetTraining);
  addEventListener('pagehide', () => { stopSound(); save(); });
  paintSteps(); showCard(state.card);
})();
