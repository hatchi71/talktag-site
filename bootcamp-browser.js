/* Shared level → episode browser. Published content and existing storage keys stay intact. */
(() => {
  'use strict';
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(host, options = {}) {
    if (!host || host.dataset.campBrowserReady) return;
    host.dataset.campBrowserReady = 'true';
    host.classList.add('camp-browser');
    document.body.classList.add('tt-camp-level-first');
    const { camp = 'story', language = 'en', starters = [], starterDone = () => false, starterUndo = () => {} } = options;
    if (camp === 'story') host.classList.add('camp-story-leaf-archive');
    const english = language === 'ko', japanese = language === 'ja';
    const japaneseLocalPreview = japanese && ['localhost', '127.0.0.1'].includes(location.hostname);
    const title = camp === 'vocal' ? 'Vocal Camp' : 'Story Camp';
    const families = language === 'ko' && camp === 'vocal'
      ? (window.TALKTAG_VOCALCAMP_KOREAN?.families || []).filter(f => ['audio-qc', 'published'].includes(f.status))
      : language === 'ko' && camp === 'story'
        ? (window.TALKTAG_STORYCAMP_KOREAN?.families || []).filter(f => f.status === 'published')
      : language === 'ja' && camp === 'vocal'
        ? (window.TALKTAG_VOCALCAMP_JAPANESE?.families || []).filter(f => f.status === 'published' || (japaneseLocalPreview && f.status === 'audio-qc'))
      : language === 'ja' && camp === 'story'
        ? (window.TALKTAG_STORYCAMP_JAPANESE?.families || []).filter(f => f.status === 'published')
      : language === 'en' ? (window[`TALKTAG_${camp.toUpperCase()}CAMP_MANIFEST`]?.families || []).filter(f => f.status === 'published') : [];
    const familyLevels = family => Array.isArray(family.levels) ? family.levels : Object.keys(family.levels || {});
    const progressCamp = language === 'ko' ? `ko-${camp}` : language === 'ja' ? `ja-${camp}` : camp;
    const params = new URLSearchParams(location.search);
    const preferenceKey = `talktag-camp-level:${language}`;
    let remembered; try { remembered = localStorage.getItem(preferenceKey); } catch {}
    let level = LEVELS.includes(params.get('level')?.toUpperCase()) ? params.get('level').toUpperCase() : '';
    if (params.has('level')) try { localStorage.setItem(preferenceKey, level); } catch {}
    let term = '', page = 1;
    const PAGE_SIZE = 12;
    const words = english ? {
      choose:'Choose your level', help:'Choose a level, then make one story your own.',
      search:'Find an episode', placeholder:'Episode number or title', episodes:'episodes', completed:'completed',
      start:'Start practice', complete:'Mark complete', undo:'Undo', shelf:'Completed missions', emptyShelf:'Finished lessons will appear here. Reopen one or undo completion.',
      noMatch:'No matching episodes. Try a different title or clear your search.', allDone:'All episodes in this level are complete. Reopen one below or undo completion.',
      pending:'Coming soon', pendingText:camp === 'story' ? 'Level-based Korean stories are coming soon. Try the existing starter stories below.' : 'Korean Vocal Camp recordings are being prepared.',
      prev:'Previous', next:'Next', levelLabel:'Practice level', clear:'Clear search', changeLevel:'← Choose a level',
      guide:'A1–C2 are learning-difficulty guides, not an official assessment or a TOPIK conversion.'
    } : {
      choose:'훈련할 레벨을 선택하세요', help:'레벨을 고르고, 이야기를 한 편씩 내 것으로 만드세요.',
      search:'에피소드 찾기', placeholder:'번호 또는 제목', episodes:'개', completed:'완료',
      start:'연습 시작', complete:'완료로 표시', undo:'완료 취소', shelf:'완료한 미션', emptyShelf:'완료한 이야기가 이곳에 모입니다. 다시 열거나 완료를 취소할 수 있습니다.',
      noMatch:'일치하는 이야기가 없습니다. 다른 제목을 입력하거나 검색어를 지워 보세요.', allDone:'이 레벨의 이야기를 모두 완료했습니다. 아래에서 다시 열거나 완료를 취소할 수 있습니다.',
      pending:'준비 중', pendingText:`${japanese ? '일본어' : '영어'} ${title}의 이 레벨 자료를 준비하고 있습니다.`,
      prev:'이전', next:'다음', levelLabel:'학습 레벨', clear:'검색어 지우기', changeLevel:'← 레벨 선택',
      guide:`A1–C2는 학습 난이도 안내이며 공식 등급 판정${japanese ? '이나 JLPT 등급 환산' : ''}이 아닙니다.`
    };
    const done = f => Boolean(window.TalkTagCampProgress?.done(progressCamp, level, f.number));
    const route = (f, cardLevel = level) => japanese && camp === 'vocal'
      ? `J-vocalcamp-player.html?level=${cardLevel}&family=${f.number}`
      : japanese && camp === 'story'
      ? `J-storycamp-reader.html?level=${cardLevel}&family=${f.number}`
      : `${camp === 'story' ? 'storycamp-reader' : 'vocalcamp-player'}.html?level=${cardLevel}&family=${f.number}${language === 'ko' ? '&lang=ko' : ''}`;
    const summary = l => {
      const items = families.filter(f => familyLevels(f).includes(l));
      const completed = items.filter(f => window.TalkTagCampProgress?.done(progressCamp, l, f.number)).length;
      return { total: items.length, completed };
    };
    host.innerHTML = `<div class="camp-resume"></div><div class="camp-level-heading"><span class="camp-kicker">LEVEL → EPISODE → PRACTICE</span><h2>${words.choose}</h2><p>${words.help}</p></div><nav class="camp-levels" aria-label="${words.levelLabel}"></nav><section class="cefr camp-cefr-guide" id="campCefrGuide" aria-labelledby="campCefrTitle"><div class="camp-cefr-kicker">CEFR GUIDE · 설명 영역</div><h2 id="campCefrTitle">CEFR은 영어 레벨을 어떻게 나눌까요?</h2><p><strong>CEFR(Common European Framework of Reference for Languages)</strong>은 단순히 아는 단어 수나 시험 점수만으로 영어 수준을 정하지 않습니다. 실제 상황에서 영어를 얼마나 이해하고, 상호작용하고, 자신의 생각을 말하고 쓰며, 의미를 정확하게 전달할 수 있는지를 중심으로 A1부터 C2까지 여섯 단계로 설명합니다.</p><div class="camp-cefr-scale"><div><em>BASIC USER</em><b>A1 · 입문</b><span>익숙한 일상 표현과 매우 기본적인 문장을 이해하고 사용할 수 있는 단계.</span></div><div><em>BASIC USER</em><b>A2 · 초급</b><span>일상적인 정보와 익숙한 주제에 대해 간단한 문장으로 주고받을 수 있는 단계.</span></div><div><em>INDEPENDENT USER</em><b>B1 · 중급</b><span>익숙한 주제의 핵심 내용을 이해하고 경험·계획·의견을 연결해서 설명할 수 있는 단계.</span></div><div><em>INDEPENDENT USER</em><b>B2 · 중상급</b><span>복잡한 글의 주요 내용을 이해하고 비교적 자연스럽고 구체적으로 의견을 전개할 수 있는 단계.</span></div><div><em>PROFICIENT USER</em><b>C1 · 고급</b><span>길고 까다로운 글의 함축적 의미를 이해하고, 복잡한 생각을 유창하고 유연하게 구조화할 수 있는 단계.</span></div><div><em>PROFICIENT USER</em><b>C2 · 숙달</b><span>거의 모든 종류의 언어를 매우 높은 정확도로 이해하고, 미묘한 의미 차이까지 자연스럽고 정교하게 표현할 수 있는 단계.</span></div></div><div class="camp-cefr-note"><strong>중요:</strong> TalkTag Snowballing Studio의 A1–C2 표시는 학습 난이도를 CEFR 기술 방식에 맞추어 설계한 가이드입니다. 이 콘텐츠만으로 공식 CEFR 등급을 판정하지는 않습니다. 실제 수준은 듣기, 읽기, 말하기 상호작용, 말하기·쓰기 생산 등 여러 능력을 함께 보아야 합니다.</div></section><section class="camp-episodes" aria-labelledby="campEpisodeHeading"><div class="camp-episode-heading"><h2 id="campEpisodeHeading"></h2><p id="campProgress" role="status"></p></div><form class="camp-search" role="search"><label for="campSearch">${words.search}</label><div><input id="campSearch" type="search" placeholder="${words.placeholder}" autocomplete="off"><button type="button" id="campClear" hidden>${words.clear}</button></div></form><div class="camp-episode-list"></div><nav class="camp-pagination" aria-label="${english ? 'Episode pages' : '에피소드 페이지'}"><button type="button" data-page="previous">← ${words.prev}</button><span></span><button type="button" data-page="next">${words.next} →</button></nav><details class="camp-completed"><summary><span>${words.shelf}</span><span class="camp-shelf-count"></span></summary><div class="camp-completed-list"></div></details></section><div class="camp-starters"></div><p class="camp-notice">${words.guide}</p>`;
    if (!english) {
      const guide = host.querySelector('#campCefrGuide');
      guide.querySelector('h2').textContent = 'A1–C2 언어 레벨은 무엇을 뜻하나요?';
      guide.querySelector('h2 + p').innerHTML = '<strong>CEFR(Common European Framework of Reference for Languages)</strong>은 실제 상황에서 언어로 무엇을 이해하고 표현할 수 있는지 설명하는 틀입니다. TalkTag는 이를 참고해 학습 난이도를 A1부터 C2까지 여섯 단계로 안내합니다.';
    }
    if (english) {
      const guide = host.querySelector('#campCefrGuide');
      const bands = [
        ['BASIC USER', 'A1 · Beginner', 'Understand and use familiar everyday expressions and very basic sentences.'],
        ['BASIC USER', 'A2 · Elementary', 'Exchange simple information about familiar, everyday topics.'],
        ['INDEPENDENT USER', 'B1 · Intermediate', 'Understand main points on familiar topics and connect ideas about experiences, plans and opinions.'],
        ['INDEPENDENT USER', 'B2 · Upper intermediate', 'Understand the main ideas of complex texts and discuss views with detail and relative fluency.'],
        ['PROFICIENT USER', 'C1 · Advanced', 'Understand implied meaning in demanding texts and express complex ideas fluently and flexibly.'],
        ['PROFICIENT USER', 'C2 · Proficient', 'Understand a very wide range of language and express subtle distinctions precisely and naturally.']
      ];
      guide.querySelector('.camp-cefr-kicker').textContent = 'CEFR GUIDE · UNDERSTANDING LEVELS';
      guide.querySelector('h2').textContent = 'What do A1–C2 language levels mean?';
      guide.querySelector('h2 + p').innerHTML = '<strong>CEFR (Common European Framework of Reference for Languages)</strong> describes language ability across six levels, from A1 to C2. It is about what you can understand and do in real situations—not just vocabulary counts or test scores.';
      guide.querySelector('.camp-cefr-scale').innerHTML = bands.map(([group, label, description]) => `<div><em>${group}</em><b>${label}</b><span>${description}</span></div>`).join('');
      guide.querySelector('.camp-cefr-note').innerHTML = '<strong>Important:</strong> TalkTag uses A1–C2 as a learning-difficulty guide. It is not an official CEFR assessment or a conversion to TOPIK scores. Real ability includes listening, reading, interaction, speaking and writing.';
    } else if (japanese) {
      const guide = host.querySelector('#campCefrGuide');
      const bands = [
        ['BASIC USER', 'A1 · 입문', '인사와 자기소개처럼 익숙한 일본어 표현을 듣고 짧게 말할 수 있습니다.'],
        ['BASIC USER', 'A2 · 초급', '일상적인 상황에서 간단한 질문을 주고받고 경험을 몇 문장으로 이어 말할 수 있습니다.'],
        ['INDEPENDENT USER', 'B1 · 중급', '익숙한 주제의 요점을 이해하고 경험, 이유, 계획을 연결해 설명할 수 있습니다.'],
        ['INDEPENDENT USER', 'B2 · 중상급', '조금 더 복잡한 상황을 설명하고 상대의 의견에 반응하며 자신의 생각을 구체적으로 전할 수 있습니다.'],
        ['PROFICIENT USER', 'C1 · 고급', '긴 대화의 함축적 의미를 이해하고 맥락과 상대에 맞게 생각을 유연하게 표현할 수 있습니다.'],
        ['PROFICIENT USER', 'C2 · 숙달', '복잡한 논의를 이해하고 미묘한 의미 차이와 태도를 정교하게 전달할 수 있습니다.']
      ];
      guide.querySelector('.camp-cefr-kicker').textContent = 'LEVEL GUIDE · 일본어 학습 난이도';
      guide.querySelector('h2').textContent = '일본어 학습의 A1–C2는 무엇을 뜻하나요?';
      guide.querySelector('h2 + p').innerHTML = '<strong>CEFR(Common European Framework of Reference for Languages)</strong>은 실제 상황에서 언어로 무엇을 이해하고 표현할 수 있는지 설명하는 틀입니다. TalkTag는 그 기술 방식을 참고해 일본어 연습의 난이도를 A1부터 C2까지 여섯 단계로 안내합니다.';
      guide.querySelector('.camp-cefr-scale').innerHTML = bands.map(([group, label, description]) => `<div><em>${group}</em><b>${label}</b><span>${description}</span></div>`).join('');
      guide.querySelector('.camp-cefr-note').innerHTML = '<strong>중요:</strong> 이 표시는 TalkTag 일본어 콘텐츠의 학습 난이도 안내입니다. 공식 CEFR 능력 인증이나 JLPT 점수·등급으로의 환산이 아닙니다. 실제 언어 능력은 듣기, 읽기, 상호작용, 말하기와 쓰기를 함께 살펴야 합니다.';
    }
    const levels = host.querySelector('.camp-levels'), input = host.querySelector('#campSearch'), list = host.querySelector('.camp-episode-list');
    const levelLanding = document.createElement('section');
    levelLanding.className = 'camp-level-landing';
    levelLanding.id = 'campLevelLanding';
    levelLanding.hidden = true;
    levelLanding.innerHTML = `<a class="camp-change-level" href="?" data-change-level>${words.changeLevel}</a><span class="camp-kicker">BOOT CAMP · ${camp === 'vocal' ? 'BUILD' : 'REBUILD'}</span><h2 id="campLevelTitle"></h2><p id="campLevelDescription"></p>`;
    host.querySelector('#campCefrGuide').before(levelLanding);
    const allCompleted = document.createElement('section');
    allCompleted.className = 'camp-all-completed';
    allCompleted.setAttribute('aria-label', words.shelf);
    host.querySelector('.camp-episodes').after(allCompleted);
    function card(f, finished, cardLevel = level) {
      const ready = camp !== 'vocal' || f.audioStatus === 'ready';
      const art = ['ko', 'en', 'ja'].includes(language) ? window.TalkTagBootCampArtwork?.get(camp, f.number, cardLevel, language) : null;
      return `<article class="camp-episode${finished ? ' is-completed' : ''}" data-episode="${f.number}"><a class="camp-episode-link" href="${route(f, cardLevel)}"><span class="camp-kicker">${cardLevel} · ${english ? 'EPISODE' : '이야기'} ${f.number}</span><h3>${esc(f.title)}</h3>${art ? `<figure class="camp-episode-art"><img src="${esc(art.src)}" alt="${esc(art.alt)}" width="720" height="480" loading="lazy" decoding="async"></figure>` : ''}<p>${esc(f.theme)}</p><span class="camp-start">${ready ? words.start : (english ? 'Recording in preparation' : '음원 준비 중')} <span aria-hidden="true">→</span></span></a><div class="camp-episode-actions"><button type="button" data-complete="${f.number}" data-complete-level="${cardLevel}" data-finished="${finished}" aria-label="${esc(f.title)} · ${finished ? words.undo : words.complete}">${finished ? words.undo : words.complete}</button>${finished ? `<span class="camp-complete-mark">✓ ${words.completed}</span>` : ''}</div></article>`;
    }
    function renderStarters() {
      const section = host.querySelector('.camp-starters');
      if (!starters.length || camp !== 'story') return;
      const priorShelf = section.querySelector('.camp-completed');
      const completed = starters.filter(starterDone), active = starters.filter(x => !starterDone(x));
      const starterCard = (x, finished) => `<article class="camp-episode${finished ? ' is-completed' : ''}"><a class="camp-episode-link" href="K-korean-starter.html?id=${x.id}&type=story&level=${level}"><span class="camp-kicker">STARTER · ${x.id} · NOT LEVEL-ASSIGNED</span><h3>${esc(x.title)}</h3><p>${esc(x.goal)}</p><span class="camp-start">Remember and retell →</span></a>${finished ? `<div class="camp-episode-actions"><button type="button" data-starter-undo="${x.id}">Undo</button></div>` : ''}</article>`;
      section.innerHTML = `<div class="camp-level-heading"><span class="camp-kicker">AVAILABLE NOW · STARTER COLLECTION</span><h2>Start with a short Korean story.</h2><p>These six existing starters are not assigned A1–C2 levels. Their stories, notes and shared starter progress are unchanged.</p><p>${completed.length} / ${starters.length} starter missions completed</p></div><div class="camp-episode-list">${active.map(x => starterCard(x, false)).join('')}</div><details class="camp-completed"${completed.length && priorShelf?.open !== false ? ' open' : ''}><summary><span>Completed starter missions</span><span>${completed.length}</span></summary><div class="camp-completed-list">${completed.map(x => starterCard(x, true)).join('') || '<p>No completed starter missions yet.</p>'}</div></details>`;
    }
    function render() {
      const resume = host.querySelector('.camp-resume'); resume.innerHTML = '';
      const levelSelected = Boolean(level);
      document.body.classList.toggle('tt-camp-level-selected', levelSelected);
      host.querySelector('.camp-level-heading').hidden = levelSelected;
      levels.hidden = levelSelected;
      host.querySelector('#campCefrGuide').hidden = levelSelected;
      levelLanding.hidden = !levelSelected;
      host.querySelector('.camp-episodes').hidden = !levelSelected;
      if (levelSelected) {
        const base = new URL(location.href); base.searchParams.delete('level');
        levelLanding.querySelector('[data-change-level]').href = base.pathname + (base.search || '') + base.hash;
        host.querySelector('#campLevelTitle').textContent = `${title} · ${level}`;
        host.querySelector('#campLevelDescription').textContent = camp === 'vocal'
          ? (english ? 'Choose one episode and build the Korean story through cumulative listening and speaking.' : '한 편을 골라 누적 음원으로 듣고 따라 말해 보세요.')
          : (english ? 'Choose one episode, remember its flow, then rebuild it in your own Korean.' : '한 편을 골라 흐름을 기억하고 내 말로 다시 구성해 보세요.');
        document.title = `${level} · ${title} · TalkTag Boot Camp`;
      } else document.title = `${title} · TalkTag Boot Camp`;
      if (language === 'en') try {
        const records = Object.values(JSON.parse(localStorage.getItem('talktag-myspace-activity:v1') || '{}'));
        const last = records.filter(record => {
          const u = new URL(record.href, location.origin), f = families.find(item => item.number === u.searchParams.get('family'));
          return u.origin === location.origin && u.pathname === '/' + (camp === 'story' ? 'storycamp-reader.html' : 'vocalcamp-player.html') && u.searchParams.get('level') === level && record.checkpoint && f && !done(f);
        }).sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0))[0];
        if (last) { const f = families.find(item => item.number === new URL(last.href, location.origin).searchParams.get('family')); resume.innerHTML = `<a href="${route(f)}"><small>${level} · 이어서 학습</small><strong>${esc(f.title)}</strong><span>${esc(last.checkpoint.label || '계속하기')} →</span></a>`; }
      } catch {}
      levels.innerHTML = LEVELS.map(l => { const s = summary(l); return `<a href="?${new URLSearchParams({...Object.fromEntries(params), level:l})}" data-level="${l}" data-group="${l[0]}"${l === level ? ' aria-current="page"' : ''}${s.total && s.completed === s.total ? ' class="is-level-complete"' : ''}><strong>${l}</strong><small>${s.total ? `${s.completed} / ${s.total} ${words.completed}` : words.pending}</small><span class="camp-level-meter" aria-hidden="true"><i style="width:${s.total ? s.completed / s.total * 100 : 0}%"></i></span></a>`; }).join('');
      const priorBins = new Set([...allCompleted.querySelectorAll('.camp-mission-bin[open]')].map(bin => bin.dataset.level));
      const count = LEVELS.reduce((sum, l) => sum + summary(l).completed, 0);
      const expanded = allCompleted.querySelector('.camp-missions-toggle')?.getAttribute('aria-expanded') === 'true' || (!allCompleted.dataset.ready && count > 0);
      allCompleted.innerHTML = `<button class="camp-missions-toggle" type="button" aria-expanded="${expanded}" aria-controls="campMissionList"><span aria-hidden="true">${camp === 'story' ? '🍃' : '🍂'}</span><span>${camp === 'story' ? (english ? 'Story archive' : '이야기 보관함') : words.shelf}<small>${camp === 'story' ? (english ? 'Finished stories, ready to revisit' : '완료한 이야기를 다시 만나요') : title}</small></span><strong>${count}</strong></button><div class="camp-mission-list" id="campMissionList"${expanded ? '' : ' hidden'}><p class="camp-mission-intro">${english ? 'Completed cards are kept by level. Reopen one or undo completion.' : '완료한 카드는 레벨별 보관함에서 다시 열거나 완료를 취소할 수 있습니다.'}</p>${LEVELS.map(l => { const items = families.filter(f => familyLevels(f).includes(l) && window.TalkTagCampProgress?.done(progressCamp, l, f.number)); const open = priorBins.has(l) || (!allCompleted.dataset.ready && count > 0 && (l === level || l === LEVELS.find(x => summary(x).completed))); return `<details class="camp-mission-bin" data-level="${l}"${open ? ' open' : ''}><summary><strong>${l}</strong><span>${items.length}${english ? ' completed' : '개 완료'}</span><i aria-hidden="true">⌄</i></summary><div class="camp-mission-bin-list">${items.map(f => `<div class="camp-mission-row"><a href="${route(f, l)}"><small>${l} · ${f.number}</small><strong>${esc(f.title)}</strong></a><button type="button" data-complete="${f.number}" data-complete-level="${l}" data-finished="true" aria-label="${esc(f.title)} · ${words.undo}">${words.undo}</button></div>`).join('') || `<p class="camp-mission-empty">${english ? 'No completed cards yet.' : '아직 완료한 카드가 없습니다.'}</p>`}</div></details>`; }).join('')}</div>`;
      allCompleted.dataset.ready = 'true';
      const available = families.filter(f => familyLevels(f).includes(level)), filtered = available.filter(f => !term || `${f.number} ${f.title}`.toLowerCase().includes(term)), active = filtered.filter(f => !done(f)), completed = available.filter(done), totalDone = completed.length;
      const pages = Math.max(1, Math.ceil(active.length / PAGE_SIZE)); page = Math.max(1, Math.min(page, pages));
      host.querySelector('#campEpisodeHeading').textContent = `${level} · ${title}`;
      host.querySelector('#campProgress').textContent = available.length ? `${totalDone} / ${available.length} ${words.completed}` : words.pending;
      input.disabled = !available.length;
      host.querySelector('.camp-search').hidden = !available.length;
      host.querySelector('#campClear').hidden = !term;
      list.innerHTML = active.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(f => card(f, false)).join('') || `<div class="camp-empty"><h3>${available.length ? (term ? words.noMatch : words.allDone) : words.pending}</h3>${!available.length ? `<p>${words.pendingText}</p>${language !== 'en' && !(english && camp === 'story') ? `<a href="${english ? 'K-korean-audio-library.html?type=guided' : 'J-guided.html?type=guided'}">${english ? 'Try published Korean GLR' : '공개된 일본어 GLR 연습하기'} →</a>` : ''}` : ''}</div>`;
      const pagination = host.querySelector('.camp-pagination'); pagination.hidden = pages <= 1;
      pagination.querySelector('span').textContent = `${page} / ${pages}`;
      pagination.querySelector('[data-page="previous"]').disabled = page === 1;
      pagination.querySelector('[data-page="next"]').disabled = page === pages;
      host.querySelector('.camp-episodes > .camp-completed').hidden = true;
      renderStarters();
    }
    function select(next, updateHistory = true) {
      if (next && !LEVELS.includes(next)) return;
      level = next; page = 1; term = ''; input.value = '';
      if (updateHistory) { const url = new URL(location.href); if (level) url.searchParams.set('level', level); else url.searchParams.delete('level'); history.pushState(null, '', url); }
      try { if (level) localStorage.setItem(preferenceKey, level); } catch {}
      render();
      (level ? levels.querySelector(`[data-level="${level}"]`) : levelLanding.querySelector('[data-change-level]'))?.focus({preventScroll:true});
    }
    host.addEventListener('click', event => {
      const changeLevel = event.target.closest('[data-change-level]');
      if (changeLevel && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); select('', true); return; }
      const levelLink = event.target.closest('.camp-levels > a[data-level]');
      if (levelLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); select(levelLink.dataset.level); return; }
      const button = event.target.closest('button'); if (!button) return;
      if (button.classList.contains('camp-missions-toggle')) { const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(expanded)); allCompleted.querySelector('#campMissionList').hidden = !expanded; return; }
      if (button.hasAttribute('data-page')) { page += button.dataset.page === 'next' ? 1 : -1; render(); host.querySelector('#campEpisodeHeading').scrollIntoView({block:'start'}); }
      if (button.hasAttribute('data-complete')) {
        const n = button.dataset.complete, finished = button.dataset.finished === 'true';
        const completedLevel = button.dataset.completeLevel || level;
        window.TalkTagCampProgress?.set(progressCamp, completedLevel, n, !finished);
        render();
        if (!finished) { const toggle = allCompleted.querySelector('.camp-missions-toggle'); toggle.setAttribute('aria-expanded', 'true'); allCompleted.querySelector('#campMissionList').hidden = false; allCompleted.querySelector(`.camp-mission-bin[data-level="${completedLevel}"]`)?.setAttribute('open', ''); }
        const target = host.querySelector(`[data-complete="${n}"][data-complete-level="${completedLevel}"]`); target?.focus({preventScroll:true});
      }
      if (button.hasAttribute('data-starter-undo')) { starterUndo(button.dataset.starterUndo); renderStarters(); }
    });
    input.addEventListener('input', () => { term = input.value.trim().toLowerCase(); page = 1; render(); });
    host.querySelector('form').addEventListener('submit', e => e.preventDefault());
    host.querySelector('#campClear').addEventListener('click', () => { input.value = ''; term = ''; page = 1; render(); input.focus(); });
    addEventListener('popstate', () => { const next = new URLSearchParams(location.search).get('level')?.toUpperCase(); if (LEVELS.includes(next)) select(next, false); else { level = ''; render(); } });
    addEventListener('talktag:completion-change', render);
    addEventListener('storage', render);
    addEventListener('pageshow', render);
    render();
  }
  window.TalkTagCampBrowser = { mount };
  function init() {
    const originalFile = location.pathname.split('/').pop();
    const koreanLanding = /^K-korean-(?:story|vocal)-camp\.html$/.test(originalFile);
    const file = originalFile.replace(/^J-/,'').replace(/^K-korean-/,'');
    if (!['story-camp.html', 'vocal-camp.html'].includes(file)) return;
    const camp = file.startsWith('vocal') ? 'vocal' : 'story';
    if (koreanLanding) {
      mount(document.getElementById(`${camp}-camp`), {camp, language:'ko'});
    } else if (location.pathname.startsWith('/japanese/')) {
      const main = document.querySelector('main');
      document.body.classList.add('ja-bootcamp-shell');
      document.body.classList.add('ja-studio-aligned');
      const brand = document.querySelector('.ja-brand span'); if (brand) brand.textContent = camp === 'vocal' ? 'Vocal Camp' : 'Story Camp';
      const category = document.querySelector('.tt-route-category'); if (category) { category.href = 'J-snowballing.html#boot-camp'; category.innerHTML = '<span aria-hidden="true">⌂</span><b>Studio</b>'; }
      main.innerHTML = `<section class="ja-hero"><p class="ja-kicker">BOOT CAMP · ${camp === 'vocal' ? 'BUILD' : 'REBUILD'}</p><h1>${camp === 'vocal' ? 'Vocal Camp' : 'Story Camp'}</h1><p>${camp === 'vocal' ? '이야기를 소리로 익히고, 나의 말로 전달합니다.' : '이야기를 쌓고, 기억해서 말하고, 나의 이야기로 바꿉니다.'}</p></section><section id="campBrowser"></section><nav class="ja-related" aria-label="Studio 학습 공간"><a href="J-snowballing.html#sound-check">01 · Sound Check</a><a href="J-snowballing.html#boot-camp">02 · Boot Camp</a><a href="J-readable.html">03 · Readable</a></nav>`;
      mount(main.querySelector('#campBrowser'), {camp, language:'ja'});
    } else mount(document.getElementById(`${camp}-camp`), {camp, language:'en'});
  }
  // Deferred scripts run while readyState is interactive; wait for the shared header first.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init); else init();
})();
