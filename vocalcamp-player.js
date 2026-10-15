(() => {
  'use strict';
  const units = window.TalkTagVocalPilots || [window.TalkTagVocalPilot].filter(Boolean);
  const requested = new URLSearchParams(location.search).get('unit');
  const unit = units.find(item => item.id === requested) || units[0];
  const app = document.getElementById('pilotApp');
  if (!unit || !app) return;
  const koreanLearning = new URLSearchParams(location.search).get('lang') === 'ko';
  const pauseLabel=koreanLearning?'PAUSE':(document.documentElement.lang==='ko'?'PAUSE':'무음 구간');
  const scriptLanguage = koreanLearning ? 'KR' : 'EN';
  const meaningLanguage = koreanLearning ? 'EN' : 'KR';
  const scriptName = 'Script';
  const meaningName = 'Meaning';
  const scriptLang = koreanLearning ? 'ko' : 'en';
  const meaningLang = koreanLearning ? 'en' : 'ko';
  const lines = unit.fullText || [];
  const REPEAT_TARGET = 10;
  const PAUSE_OPTIONS = [2, 2.5, 3, 3.5];
  const pauseKey = 'talktag-speaking-pause-multiplier';
  let silenceMultiplier = 2.5;
  try { const saved = Number(localStorage.getItem(pauseKey)); if (PAUSE_OPTIONS.includes(saved)) silenceMultiplier = saved; } catch (_) {}
  document.title = `${unit.familyNumber} · ${unit.level} · ${unit.title} | TalkTag Vocal Camp`;

  const key = `talktag-vocal-pilot-simple-${unit.id}`;
  const state = { card: 0, counts: lines.map(() => 0) };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    state.card = Number.isFinite(saved.card) ? saved.card : 0;
    if (Array.isArray(saved.counts) && saved.counts.length === lines.length) state.counts = saved.counts.map(value => Math.max(0, Number(value) || 0));
  } catch (_) {}

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const copy = koreanLearning ? {
    soundLabel:'1 · SOUND', soundTitle:'Build the story through sound', soundGuide:'Listen to the native Korean audio and repeat. Each step adds one more line to the story.', soundStart:'Press the first sound to begin cumulative practice.', one:'One sentence', cumulative:'Cumulative', reps:'reps',
    writeLabel:'2 · SAY & WRITE', writeTitle:'Speak first, then write it down.', writeGuide:'Say what you just heard from the beginning, then write what you remember in your notes.', writeHint:'Open the reference only when you need it.',
    storyLabel:'3 · MY STORY', storyTitle:'Make the same flow your own', storyGuide:'Keep the flow of the situation, then change the people, place, choice and result to fit your own experience.', storyText:'Tell your own version, then write a short note.',
    shareLabel:'4 · SHARE', shareTitle:'Tell a partner your story', shareGuide:'Do not look at your notes or phone. Share your new story naturally with a real person.', shareText:'Do not explain the language. Tell it as you would in that situation.', win:'You started with sound and finished with your own real story.',
    pause:'Speak back what you just heard.'
  } : {
    soundLabel:'1 · SOUND', soundTitle:'소리가 조금씩 자랍니다', soundGuide:'원어민의 음성을 듣고 따라하세요, 한 문장씩 소리가 자라납니다. 이야기의 끝까지 따라가 보세요!', soundStart:'Press the first sound to begin cumulative practice.', one:'One sentence', cumulative:'Cumulative', reps:'reps',
    writeLabel:'2 · SAY & WRITE', writeTitle:'이제 휴대폰을 내려놓으세요', writeGuide:'Say what you just heard from the beginning, then write what you remember in your notes.', writeHint:'Open the reference only when you need it.',
    storyLabel:'3 · MY STORY', storyTitle:'같은 흐름을 나의 이야기로', storyGuide:'방금 익힌 사건의 흐름을 유지하면서 인물, 장소, 선택과 결과를 자신의 실제 경험으로 바꾸어 봅니다.', storyText:'나의 이야기로 다시 말하고 노트에 간단히 정리합니다.',
    shareLabel:'4 · SHARE', shareTitle:'파트너에게 이야기해 주세요', shareGuide:'노트도 휴대폰도 보지 않습니다. 새로 만든 나의 이야기를 실제 사람에게 자연스럽게 전달합니다.', shareText:'설명하려 하지 말고, 그 상황에서 정말 하듯 이야기하세요.', win:'소리에서 시작해 나의 실제 이야기로 끝냈습니다.',
    pause:'들은 내용을 직접 말해 보세요.'
  };
  const cards = [
    {
      label: copy.soundLabel,
      title: copy.soundTitle,
      guide: copy.soundGuide,
      body: `<div class="vocal-pause-control"><label for="vocalPauseRange">${koreanLearning ? 'Speaking pause' : '말하기 간격'} <output id="vocalPauseValue"></output></label><input id="vocalPauseRange" type="range" min="0" max="3" step="1" aria-label="${koreanLearning ? 'Speaking pause: 2, 2.5, 3 or 3.5 times the voice length' : '말하기 간격: 음성 길이의 2배, 2.5배, 3배, 3.5배'}"><div class="vocal-pause-marks" aria-hidden="true"><span>2.0×</span><span>2.5×</span><span>3.0×</span><span>3.5×</span></div><small>${koreanLearning ? 'At least 3 seconds. Voice speed stays natural.' : '최소 3초. 음성 속도는 그대로 유지합니다.'}</small></div><div class="sound-ladder" id="soundLadder">${lines.map((_, index) => `<button class="sound-step" type="button" data-sound-step="${index}"><span class="sound-shape" aria-hidden="true">${Array.from({length:index+1},()=>'<i></i>').join('')}</span><strong>${index === 0 ? copy.one : `${copy.cumulative} 1–${index+1}`}</strong><small><b data-repeat-count="${index}">0</b> / ${REPEAT_TARGET} ${copy.reps}</small><em>▶</em></button>`).join('')}</div><p class="sound-note" id="soundStatus" aria-live="polite">${copy.soundStart}</p>`
    },
    {
      label: copy.writeLabel,
      title: copy.writeTitle,
      guide: copy.writeGuide,
      body: `<div class="offline-card"><span aria-hidden="true">✦</span><p>Speak first,<br>then write it down.</p><small>${copy.writeHint}</small></div><div class="reference-actions"><button class="action reference-button" type="button" data-reference="script" aria-expanded="false">${scriptLanguage} · ${scriptName}</button><button class="action reference-button" type="button" data-reference="meaning" aria-expanded="false">${meaningLanguage} · ${meaningName}</button></div><section class="reference-panel" lang="${scriptLang}" id="scriptPanel" hidden><p class="reference-label">SCRIPT</p>${unit.fullText.map(line=>`<p>${esc(line)}</p>`).join('')}</section><section class="reference-panel${meaningLang === 'ko' ? ' camp-kr-panel' : ''}" lang="${meaningLang}" id="meaningPanel" hidden><p class="reference-label">MEANING &amp; NOTE</p>${unit.translation.map(line=>`<p>${esc(line)}</p>`).join('')}<div class="reference-note">${esc(unit.note)}</div></section>`
    },
    {
      label: copy.storyLabel,
      title: copy.storyTitle,
      guide: copy.storyGuide,
      body: `<div class="flow-cues" aria-label="${koreanLearning ? 'My story flow' : '내 이야기 흐름'}">${unit.storyFlow.map((cue,index)=>`${index?'<i>→</i>':''}<span>${esc(cue)}</span>`).join('')}</div><div class="offline-card warm"><span aria-hidden="true">↗</span><p>${copy.storyText}</p></div>`
    },
    {
      label: copy.shareLabel,
      title: copy.shareTitle,
      guide: copy.shareGuide,
      body: `<div class="share-stage"><div class="share-people" aria-hidden="true"><span>YOU</span><i></i><span>PARTNER</span></div><p>${copy.shareText}</p></div><div class="win"><strong>VOCAL CAMP</strong><p>${copy.win}</p></div>`
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
      <button class="pilot-nav-button" id="prevButton" type="button">← Previous</button>
      <button class="pilot-nav-button primary" id="nextButton" type="button">Next →</button>
      <button class="pilot-nav-button pilot-reset-button" id="resetButton" type="button" aria-label="Reset current Vocal Camp practice">↻ Reset</button>
    </nav>`;

  const deck = [...document.querySelectorAll('.pilot-card')];
  const count = document.getElementById('cardCount');
  const name = document.getElementById('cardName');
  const progress = document.getElementById('progressBar');
  const previous = document.getElementById('prevButton');
  const next = document.getElementById('nextButton');
  const menu = document.getElementById('pilotMenu');
  const pauseRange = document.getElementById('vocalPauseRange');
  const pauseValue = document.getElementById('vocalPauseValue');
  const updatePauseLabel = () => { pauseRange.value = String(PAUSE_OPTIONS.indexOf(silenceMultiplier)); pauseValue.textContent = silenceMultiplier.toFixed(1) + '×'; };
  updatePauseLabel();
  pauseRange.addEventListener('input', () => {
    silenceMultiplier = PAUSE_OPTIONS[Number(pauseRange.value)];
    updatePauseLabel();
    try { localStorage.setItem(pauseKey, String(silenceMultiplier)); } catch (_) {}
  });
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
    next.textContent = state.card === cards.length - 1 ? 'Finish practice' : 'Next →';
    save();
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  function waitForRecall(index, button, token, audioDurationMs) {
    const status = document.getElementById('soundStatus');
    const waitMs=Math.max(3000,Math.round(audioDurationMs*silenceMultiplier));
    const finishAt=Date.now()+waitMs;
    let completed=false;
    playbackPhase='recall';
    button.classList.remove('is-playing');
    button.classList.add('is-waiting');
    button.querySelector('em').textContent='…';
    const update=()=>{
      const seconds=Math.max(0,Math.ceil((finishAt-Date.now())/1000));
      status.textContent=`${pauseLabel} · ${copy.pause} ${koreanLearning ? `${seconds}s` : `${seconds}초`}`;
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
          status.textContent=`Step ${index+1} complete · moving to the next cumulative step.`;
          activeIndex=nextIndex;
          nextButton.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
          speakRound(nextIndex,nextButton,token);
        }else{
          activeIndex=-1;
          status.textContent='All cumulative sound practice is complete. Put your phone down and speak from the beginning.';
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
    button.textContent=button.dataset.reference === 'script' ? (open ? `${scriptLanguage} · Close` : `${scriptLanguage} · ${scriptName}`) : (open ? `${meaningLanguage} · Close` : `${meaningLanguage} · ${meaningName}`);
  }));
  previous.addEventListener('click',()=>showCard(state.card-1));
  next.addEventListener('click',()=>{if(state.card===cards.length-1){if(unit.id?.startsWith('family-')&&window.TalkTagCampProgress){stopSound();window.TalkTagCampProgress.set(koreanLearning?'ko-vocal':'vocal',unit.level,unit.familyNumber,true);state.card=0;save();location.href=(koreanLearning?'K-korean-vocal-camp.html':'vocal-camp.html')+'?level='+unit.level;return}menu.open=true;return}showCard(state.card+1)});
  function resetTraining(){stopSound();state.card=0;state.counts=lines.map(()=>0);document.querySelectorAll('[data-repeat-count]').forEach(node=>node.textContent='0');document.querySelectorAll('.sound-step').forEach(button=>{button.classList.remove('is-complete');button.querySelector('em').textContent='▶'});menu.open=false;save();showCard(0)}
  document.getElementById('restartButton').addEventListener('click',resetTraining);
  document.getElementById('resetButton').addEventListener('click',resetTraining);
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
  document.getElementById('soundStatus').textContent=unit.audioStatus==='audio-pending'?'Audio is being prepared. Cumulative practice will begin after upload.':'Press the first sound to begin cumulative practice.';
  if(!unit.translation.length)document.querySelector('[data-reference="meaning"]').hidden=true;
  const back=document.querySelector('.pilot-back');back.href=(koreanLearning?'K-korean-vocal-camp.html':'vocal-camp.html')+'?level='+unit.level;back.textContent='← '+unit.level+' Vocal Camp';back.setAttribute('aria-label',koreanLearning?'Back to Korean Vocal Camp '+unit.level:unit.level+' Vocal Camp 목록으로');
  menu.querySelectorAll('a').forEach(a=>a.remove());
  const menuLinks=[[koreanLearning?'Back to '+unit.level+' Korean Vocal Camp':unit.level+' Vocal Camp 목록으로',back.href]];
  if(!koreanLearning||unit.familyNumber==='001')menuLinks.push([koreanLearning?'Same episode · Korean Story Camp →':'같은 번호 · 같은 레벨 Story Camp →','storycamp-reader.html?family='+unit.familyNumber+'&level='+unit.level+(koreanLearning?'&lang=ko':'')]);
  for(const [label,href] of menuLinks){const a=document.createElement('a');a.href=href;a.textContent=label;menu.querySelector('.pilot-menu-panel').append(a);}
  showCard(Number(state.card)||0);
})();
