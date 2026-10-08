(() => {
  'use strict';
  const units = window.TalkTagVocalPilots || [window.TalkTagVocalPilot].filter(Boolean);
  const requested = new URLSearchParams(location.search).get('unit');
  const unit = units.find(item => item.id === requested) || units[0];
  const app = document.getElementById('pilotApp');
  if (!unit || !app) return;
  const lines = unit.fullText || [];
  const REPEAT_TARGET = 10;
  const SILENCE_MULTIPLIER = 2.5;
  document.title = `${unit.familyNumber} · ${unit.level} · ${unit.title} | TalkTag Vocal Camp`;

  const key = `talktag-vocal-pilot-simple-${unit.id}`;
  const state = { card: 0, counts: lines.map(() => 0) };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    state.card = Number.isFinite(saved.card) ? saved.card : 0;
    if (Array.isArray(saved.counts) && saved.counts.length === lines.length) state.counts = saved.counts.map(value => Math.max(0, Number(value) || 0));
  } catch (_) {}

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const cards = [
    {
      label: '1 · SOUND',
      title: '소리가 조금씩 자랍니다',
      guide: '원어민의 음성을 듣고 따라하세요, 한 문장씩 소리가 자라납니다. 이야기의 끝까지 따라가 보세요!',
      body: `<div class="sound-ladder" id="soundLadder">${lines.map((_, index) => `<button class="sound-step" type="button" data-sound-step="${index}"><span class="sound-shape" aria-hidden="true">${Array.from({length:index+1},()=>'<i></i>').join('')}</span><strong>${index === 0 ? '한 문장' : `1–${index+1} 누적`}</strong><small><b data-repeat-count="${index}">0</b> / ${REPEAT_TARGET}회</small><em>▶</em></button>`).join('')}</div><p class="sound-note" id="soundStatus" aria-live="polite">첫 소리를 누르면 전체 누적 훈련이 자동으로 이어집니다.</p>`
    },
    {
      label: '2 · SAY & WRITE',
      title: '이제 휴대폰을 내려놓으세요',
      guide: '방금 들은 내용을 처음부터 그대로 말해 보고, 기억나는 내용을 노트에 써 봅니다.',
      body: `<div class="offline-card"><span aria-hidden="true">✦</span><p>먼저 말하고,<br>그 다음 노트에 씁니다.</p><small>필요할 때만 아래 확인 자료를 엽니다.</small></div><div class="reference-actions"><button class="action reference-button" type="button" data-reference="script" aria-expanded="false">EN · 스크립트</button><button class="action reference-button" type="button" data-reference="meaning" aria-expanded="false">KR · 한글 해석</button></div><section class="reference-panel" id="scriptPanel" hidden><p class="reference-label">SCRIPT</p>${unit.fullText.map(line=>`<p>${esc(line)}</p>`).join('')}</section><section class="reference-panel camp-kr-panel" lang="ko" id="meaningPanel" hidden><p class="reference-label">MEANING &amp; NOTE</p>${unit.translation.map(line=>`<p>${esc(line)}</p>`).join('')}<div class="reference-note">${esc(unit.note)}</div></section>`
    },
    {
      label: '3 · MY STORY',
      title: '같은 흐름을 나의 이야기로',
      guide: '방금 익힌 사건의 흐름을 유지하면서 인물, 장소, 선택과 결과를 자신의 실제 경험으로 바꾸어 봅니다.',
      body: `<div class="flow-cues" aria-label="내 이야기 흐름">${unit.storyFlow.map((cue,index)=>`${index?'<i>→</i>':''}<span>${esc(cue)}</span>`).join('')}</div><div class="offline-card warm"><span aria-hidden="true">↗</span><p>나의 이야기로 다시 말하고<br>노트에 간단히 정리합니다.</p></div>`
    },
    {
      label: '4 · SHARE',
      title: '파트너에게 이야기해 주세요',
      guide: '노트도 휴대폰도 보지 않습니다. 새로 만든 나의 이야기를 실제 사람에게 자연스럽게 전달합니다.',
      body: `<div class="share-stage"><div class="share-people" aria-hidden="true"><span>YOU</span><i></i><span>PARTNER</span></div><p>설명하려 하지 말고,<br>그 상황에서 정말 하듯 이야기하세요.</p></div><div class="win"><strong>VOCAL CAMP</strong><p>소리에서 시작해 나의 실제 이야기로 끝냈습니다.</p></div>`
    }
  ];

  app.innerHTML = `
    <section class="pilot-intro">
      <p class="pilot-kicker">${esc(unit.familyNumber)} · ${esc(unit.level)} · SOUND FIRST</p>
      <h1>${esc(unit.title)}</h1>
      ${unit.englishTitle ? `<p class="pilot-english-title">${esc(unit.englishTitle)}</p>` : ''}
      <p class="pilot-mission">${esc(unit.mission)}</p>
    </section>
    <div class="pilot-status"><strong id="cardCount"></strong><span id="cardName"></span></div>
    <div class="pilot-track" aria-hidden="true"><span id="progressBar"></span></div>
    <section id="cardDeck">${cards.map((card,index)=>`<article class="pilot-card" data-index="${index}"><p class="card-label">${esc(card.label)}</p><h2>${esc(card.title)}</h2><p class="card-guide">${esc(card.guide)}</p>${card.body}</article>`).join('')}</section>
    <nav class="pilot-nav" aria-label="훈련 카드 이동">
      <details class="pilot-menu" id="pilotMenu"><summary aria-label="훈련 메뉴">•••</summary><div class="pilot-menu-panel"><button id="restartButton" type="button">처음부터 다시 시작</button>${units.filter(item=>item.level===unit.level).map(item=>`<a href="vocal-a1-pilot.html?unit=${encodeURIComponent(item.id)}">${esc(item.level)} · ${esc(item.difficultyLabel||'')} · ${esc(item.title)}</a>`).join('')}<a href="vocal-camp.html">전체 18개 목록으로</a></div></details>
      <button class="pilot-nav-button" id="prevButton" type="button">← 이전</button>
      <button class="pilot-nav-button primary" id="nextButton" type="button">다음 →</button>
    </nav>`;

  const deck = [...document.querySelectorAll('.pilot-card')];
  const count = document.getElementById('cardCount');
  const name = document.getElementById('cardName');
  const progress = document.getElementById('progressBar');
  const previous = document.getElementById('prevButton');
  const next = document.getElementById('nextButton');
  const menu = document.getElementById('pilotMenu');
  let runToken = 0;
  let repeatTimer = 0;
  let countdownTimer = 0;
  let activeIndex = -1;
  let playbackPhase = 'idle';
  let recallObjectUrl = '';
  const audioPlayer = new Audio();
  const recallPlayer = new Audio();
  const cuePlayer = new Audio();
  audioPlayer.preload = 'auto';
  recallPlayer.preload = 'auto';
  audioPlayer.playsInline = true;
  recallPlayer.playsInline = true;
  cuePlayer.playsInline = true;

  function playCue(kind, token, finish) {
    const url=kind==='start'?unit.audioCue?.startUrl:unit.audioCue?.endUrl;
    if (!url) { finish(); return; }
    playbackPhase='cue';
    const complete=()=>{if(token!==runToken)return;cuePlayer.onended=null;cuePlayer.onerror=null;finish();};
    const play=()=>{if(token!==runToken)return;cuePlayer.src=url;cuePlayer.currentTime=0;cuePlayer.play().catch(complete);};
    cuePlayer.onended=complete;
    cuePlayer.onerror=complete;
    play();
  }

  function setMediaPlaybackState(value) {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = value;
  }
  function releaseRecallAudio() {
    recallPlayer.pause();
    recallPlayer.removeAttribute('src');
    recallPlayer.load();
    if (recallObjectUrl) URL.revokeObjectURL(recallObjectUrl);
    recallObjectUrl = '';
  }
  function silentWavUrl(durationMs) {
    const sampleRate = 8000;
    const samples = Math.max(1, Math.ceil(sampleRate * durationMs / 1000));
    const buffer = new ArrayBuffer(44 + samples);
    const view = new DataView(buffer);
    const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, 36 + samples, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, samples, true);
    new Uint8Array(buffer, 44).fill(128);
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  }

  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} window.TalkTagMySpace?.record(); }
  function clearTimers() {
    window.clearTimeout(repeatTimer);
    window.clearInterval(countdownTimer);
    repeatTimer=0;
    countdownTimer=0;
    releaseRecallAudio();
  }
  function stopSound(message) {
    runToken+=1;
    clearTimers();
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    cuePlayer.pause();
    cuePlayer.removeAttribute('src');
    cuePlayer.load();
    playbackPhase='idle';
    setMediaPlaybackState('none');
    window.speechSynthesis?.cancel();
    document.querySelectorAll('.sound-step').forEach(button=>{
      button.classList.remove('is-playing','is-waiting');
      const icon=button.querySelector('em');
      if(icon)icon.textContent=state.counts[Number(button.dataset.soundStep)]>=REPEAT_TARGET?'✓':'▶';
    });
    activeIndex=-1;
    if(message){const status=document.getElementById('soundStatus');if(status)status.textContent=message;}
  }
  function showCard(index) {
    stopSound();
    state.card = Math.max(0, Math.min(cards.length - 1, index));
    deck.forEach((card,i) => { card.classList.toggle('is-active', i === state.card); card.setAttribute('aria-hidden', String(i !== state.card)); });
    count.textContent = `${state.card + 1} / ${cards.length}`;
    name.textContent = cards[state.card].label.split(' · ')[1];
    progress.style.width = `${((state.card + 1) / cards.length) * 100}%`;
    previous.disabled = state.card === 0;
    next.textContent = state.card === cards.length - 1 ? '훈련 마치기' : '다음 →';
    save();
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  function waitForRecall(index, button, token, audioDurationMs) {
    const status = document.getElementById('soundStatus');
    const waitMs=Math.max(500,Math.round(audioDurationMs*SILENCE_MULTIPLIER));
    const finishAt=Date.now()+waitMs;
    let completed=false;
    playbackPhase='recall';
    button.classList.remove('is-playing');
    button.classList.add('is-waiting');
    button.querySelector('em').textContent='…';
    const update=()=>{
      const seconds=Math.max(0,Math.ceil((finishAt-Date.now())/1000));
      status.textContent=`암묵기간 · 들은 내용을 직접 말해 보세요. ${seconds}초`;
    };
    update();
    countdownTimer=window.setInterval(update,500);
    const finishRecall=()=>{
      if(completed)return;
      completed=true;
      if(token!==runToken)return;
      clearTimers();
      button.classList.remove('is-waiting');
      if(state.counts[index]>=REPEAT_TARGET){
        button.classList.add('is-complete');
        button.querySelector('em').textContent='✓';
        const nextIndex=index+1;
        if(nextIndex<lines.length){
          const nextButton=document.querySelector(`[data-sound-step="${nextIndex}"]`);
          status.textContent=`${index+1}단계 10회 완료 · 다음 누적으로 이동합니다.`;
          activeIndex=nextIndex;
          nextButton.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
          speakRound(nextIndex,nextButton,token);
        }else{
          activeIndex=-1;
          status.textContent='모든 누적 소리훈련을 마쳤습니다. 이제 휴대폰을 내려놓고 처음부터 말해 보세요.';
          playCue('end',token,()=>{playbackPhase='idle';setMediaPlaybackState('none');});
        }
      }else{
        speakRound(index,button,token);
      }
    };
    recallObjectUrl=silentWavUrl(waitMs);
    recallPlayer.src=recallObjectUrl;
    recallPlayer.onended=finishRecall;
    recallPlayer.onerror=()=>{repeatTimer=window.setTimeout(finishRecall,Math.max(0,finishAt-Date.now()));};
    recallPlayer.play().then(()=>setMediaPlaybackState('playing')).catch(()=>{
      repeatTimer=window.setTimeout(finishRecall,Math.max(0,finishAt-Date.now()));
    });
  }
  function speakRound(index, button, token) {
    if(token!==runToken)return;
    const status=document.getElementById('soundStatus');
    playbackPhase='audio';
    document.querySelectorAll('.sound-step').forEach(item=>item.classList.remove('is-playing','is-waiting'));
    const track=unit.audioSteps?.[index];
    if(track?.url){
      audioPlayer.onplaying=()=>{if(token!==runToken)return;setMediaPlaybackState('playing');button.classList.add('is-playing');button.querySelector('em').textContent='■';status.textContent=`${index+1}단계 · ${state.counts[index]+1}/${REPEAT_TARGET}회 듣는 중`;};
      audioPlayer.onended=()=>{if(token!==runToken)return;const duration=Math.max(500,(Number(audioPlayer.duration)||Number(track.duration)||.5)*1000);state.counts[index]=Math.min(REPEAT_TARGET,state.counts[index]+1);document.querySelector(`[data-repeat-count="${index}"]`).textContent=state.counts[index];save();waitForRecall(index,button,token,duration);};
      audioPlayer.onerror=()=>{if(token!==runToken)return;stopSound('음원을 불러오지 못했습니다. 연결을 확인하고 다시 눌러 주세요.');};
      if(audioPlayer.src!==track.url)audioPlayer.src=track.url;
      audioPlayer.currentTime=0;
      audioPlayer.play().catch(()=>{if(token!==runToken)return;stopSound('브라우저에서 자동 재생을 막았습니다. 같은 단계를 다시 눌러 주세요.');});
      return;
    }
    const utterance = new SpeechSynthesisUtterance(lines.slice(0,index+1).join(' '));
    utterance.lang='en-US'; utterance.rate=.88; utterance.pitch=1;
    let startedAt=0;
    utterance.onstart=()=>{if(token!==runToken)return;startedAt=performance.now();button.classList.add('is-playing');button.querySelector('em').textContent='■';status.textContent=`${index+1}단계 · ${state.counts[index]+1}/${REPEAT_TARGET}회 듣는 중`;};
    utterance.onend=()=>{if(token!==runToken)return;const duration=Math.max(500,performance.now()-startedAt);state.counts[index]=Math.min(REPEAT_TARGET,state.counts[index]+1);document.querySelector(`[data-repeat-count="${index}"]`).textContent=state.counts[index];save();waitForRecall(index,button,token,duration);};
    utterance.onerror=()=>{if(token!==runToken)return;stopSound('음성을 재생하지 못했습니다. 다시 눌러 주세요.');};
    window.speechSynthesis.speak(utterance);
  }
  function startSound(index, button) {
    if(unit.audioStatus==='audio-pending'){document.getElementById('soundStatus').textContent='음원을 준비하고 있습니다.';return;}
    const status=document.getElementById('soundStatus');
    if(!unit.audioSteps?.[index]?.url&&!('speechSynthesis' in window)){status.textContent='이 브라우저에서는 음성 재생을 지원하지 않습니다.';return;}
    if(activeIndex===index){stopSound('자동 반복을 멈췄습니다. 같은 단계를 누르면 이어서 시작합니다.');return;}
    stopSound();
    if(state.counts[index]>=REPEAT_TARGET){state.counts[index]=0;document.querySelector(`[data-repeat-count="${index}"]`).textContent='0';button.classList.remove('is-complete');}
    activeIndex=index;
    const token=runToken;
    if(index===0&&state.counts[0]===0)playCue('start',token,()=>speakRound(index,button,token));
    else speakRound(index,button,token);
  }

  document.querySelectorAll('.sound-step').forEach(button => {
    const index=Number(button.dataset.soundStep);
    button.querySelector(`[data-repeat-count="${index}"]`).textContent=state.counts[index];
    if(state.counts[index]>=REPEAT_TARGET){button.classList.add('is-complete');button.querySelector('em').textContent='✓';}
    button.addEventListener('click',()=>startSound(index,button));
  });
  document.querySelectorAll('.reference-button').forEach(button => button.addEventListener('click', () => {
    const panel=document.getElementById(button.dataset.reference === 'script' ? 'scriptPanel' : 'meaningPanel');
    const open=panel.hidden;
    panel.hidden=!open;
    button.setAttribute('aria-expanded',String(open));
    button.textContent=button.dataset.reference === 'script' ? (open ? 'EN · 닫기' : 'EN · 스크립트') : (open ? 'KR · 닫기' : 'KR · 한글 해석');
  }));
  previous.addEventListener('click',()=>showCard(state.card-1));
  next.addEventListener('click',()=>{if(state.card===cards.length-1){menu.open=true;return}showCard(state.card+1)});
  document.getElementById('restartButton').addEventListener('click',()=>{stopSound();state.card=0;state.counts=lines.map(()=>0);document.querySelectorAll('[data-repeat-count]').forEach(node=>node.textContent='0');document.querySelectorAll('.sound-step').forEach(button=>button.classList.remove('is-complete'));menu.open=false;save();showCard(0)});
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: unit.englishTitle || unit.title,
      artist: `TalkTag Vocal Camp · ${unit.level}`,
      album: 'Vocal Camp'
    });
    const mediaAction = (name, handler) => { try { navigator.mediaSession.setActionHandler(name, handler); } catch (_) {} };
    mediaAction('play', () => {
      const player = playbackPhase === 'recall' ? recallPlayer : playbackPhase === 'cue' ? cuePlayer : audioPlayer;
      player.play().then(()=>setMediaPlaybackState('playing')).catch(()=>{});
    });
    mediaAction('pause', () => {
      audioPlayer.pause();
      recallPlayer.pause();
      cuePlayer.pause();
      setMediaPlaybackState('paused');
    });
    mediaAction('stop', () => stopSound('백그라운드 재생을 멈췄습니다.'));
  }
  window.addEventListener('pagehide',save);
  window.addEventListener('beforeunload',save);
  document.querySelectorAll('.sound-step').forEach(button=>{if(!unit.audioSteps?.[Number(button.dataset.soundStep)]?.url){button.disabled=true;button.querySelector('em').textContent='대기';}});
  document.getElementById('soundStatus').textContent=unit.audioStatus==='audio-pending'?'음원을 준비하고 있습니다. 업로드 후 누적 훈련이 시작됩니다.':'첫 소리를 누르면 누적 훈련이 이어집니다.';
  if(!unit.translation.length)document.querySelector('[data-reference="meaning"]').hidden=true;
  const back=document.querySelector('.pilot-back');back.href='vocalcamp-family.html?family='+unit.familyNumber;back.textContent='← '+unit.familyNumber;back.setAttribute('aria-label',unit.familyNumber+' '+unit.title+' 랜딩으로');
  menu.querySelectorAll('a').forEach(a=>a.remove());
  for(const [label,href] of [[unit.familyNumber+' '+unit.title+' 랜딩으로',back.href],['같은 번호 · 같은 레벨 Story Camp →','storycamp-reader.html?family='+unit.familyNumber+'&level='+unit.level]]){const a=document.createElement('a');a.href=href;a.textContent=label;menu.querySelector('.pilot-menu-panel').append(a);}
  showCard(Number(state.card)||0);
})();
