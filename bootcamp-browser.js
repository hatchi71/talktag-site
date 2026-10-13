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
    const english = language === 'ko', japanese = language === 'ja';
    const title = camp === 'vocal' ? 'Vocal Camp' : 'Story Camp';
    const families = language === 'ko' && camp === 'vocal'
      ? (window.TALKTAG_VOCALCAMP_KOREAN?.families || []).filter(f => ['audio-qc', 'published'].includes(f.status))
      : language === 'en' ? (window[`TALKTAG_${camp.toUpperCase()}CAMP_MANIFEST`]?.families || []).filter(f => f.status === 'published') : [];
    const params = new URLSearchParams(location.search);
    const preferenceKey = `talktag-camp-level:${language}`;
    let remembered; try { remembered = localStorage.getItem(preferenceKey); } catch {}
    let level = LEVELS.includes(params.get('level')?.toUpperCase()) ? params.get('level').toUpperCase() : LEVELS.includes(remembered) ? remembered : 'A1';
    if (params.has('level')) try { localStorage.setItem(preferenceKey, level); } catch {}
    let term = '', page = 1;
    const PAGE_SIZE = 12;
    const words = english ? {
      choose:'Choose your level', help:'Choose a level, then make one story your own.',
      search:'Find an episode', placeholder:'Episode number or title', episodes:'episodes', completed:'completed',
      start:'Start practice', complete:'Mark complete', undo:'Undo', shelf:'Completed missions', emptyShelf:'Finished lessons will appear here. Reopen one or undo completion.',
      noMatch:'No matching episodes. Try a different title or clear your search.', allDone:'All episodes in this level are complete. Reopen one below or undo completion.',
      pending:'Coming soon', pendingText:camp === 'story' ? 'Level-based Korean stories are coming soon. Try the existing starter stories below.' : 'Korean Vocal Camp recordings are being prepared.',
      prev:'Previous', next:'Next', levelLabel:'Practice level', clear:'Clear search',
      guide:'A1–C2 are learning-difficulty guides, not an official assessment or a TOPIK conversion.'
    } : {
      choose:'훈련할 레벨을 선택하세요', help:'레벨을 고르고, 이야기를 한 편씩 내 것으로 만드세요.',
      search:'에피소드 찾기', placeholder:'번호 또는 제목', episodes:'개', completed:'완료',
      start:'연습 시작', complete:'완료로 표시', undo:'완료 취소', shelf:'완료한 미션', emptyShelf:'완료한 이야기가 이곳에 모입니다. 다시 열거나 완료를 취소할 수 있습니다.',
      noMatch:'일치하는 이야기가 없습니다. 다른 제목을 입력하거나 검색어를 지워 보세요.', allDone:'이 레벨의 이야기를 모두 완료했습니다. 아래에서 다시 열거나 완료를 취소할 수 있습니다.',
      pending:'준비 중', pendingText:`${japanese ? '일본어' : '영어'} ${title}의 이 레벨 자료를 준비하고 있습니다.`,
      prev:'이전', next:'다음', levelLabel:'학습 레벨', clear:'검색어 지우기',
      guide:`A1–C2는 학습 난이도 안내이며 공식 등급 판정${japanese ? '이나 JLPT 등급 환산' : ''}이 아닙니다.`
    };
    const done = f => Boolean(window.TalkTagCampProgress?.done(camp, level, f.number));
    const route = f => `${camp === 'story' ? 'storycamp-reader' : 'vocalcamp-player'}.html?level=${level}&family=${f.number}${language === 'ko' ? '&lang=ko' : ''}`;
    const summary = l => {
      const items = families.filter(f => f.levels?.includes(l));
      const completed = items.filter(f => window.TalkTagCampProgress?.done(camp, l, f.number)).length;
      return { total: items.length, completed };
    };
    host.innerHTML = `<div class="camp-resume"></div><div class="camp-level-heading"><span class="camp-kicker">LEVEL → EPISODE → PRACTICE</span><h2>${words.choose}</h2><p>${words.help}</p></div><nav class="camp-levels" aria-label="${words.levelLabel}"></nav><section class="camp-episodes" aria-labelledby="campEpisodeHeading"><div class="camp-episode-heading"><h2 id="campEpisodeHeading"></h2><p id="campProgress" role="status"></p></div><form class="camp-search" role="search"><label for="campSearch">${words.search}</label><div><input id="campSearch" type="search" placeholder="${words.placeholder}" autocomplete="off"><button type="button" id="campClear" hidden>${words.clear}</button></div></form><div class="camp-episode-list"></div><nav class="camp-pagination" aria-label="${english ? 'Episode pages' : '에피소드 페이지'}"><button type="button" data-page="previous">← ${words.prev}</button><span></span><button type="button" data-page="next">${words.next} →</button></nav><details class="camp-completed"><summary><span>${words.shelf}</span><span class="camp-shelf-count"></span></summary><div class="camp-completed-list"></div></details></section><div class="camp-starters"></div><p class="camp-notice">${words.guide}</p>`;
    const levels = host.querySelector('.camp-levels'), input = host.querySelector('#campSearch'), list = host.querySelector('.camp-episode-list');
    function card(f, finished) {
      const ready = camp !== 'vocal' || f.audioStatus === 'ready';
      return `<article class="camp-episode${finished ? ' is-completed' : ''}" data-episode="${f.number}"><a class="camp-episode-link" href="${route(f)}"><span class="camp-kicker">${level} · ${english ? 'EPISODE' : '이야기'} ${f.number}</span><h3>${esc(f.title)}</h3><p>${esc(f.theme)}</p><span class="camp-start">${ready ? words.start : (english ? 'Recording in preparation' : '음원 준비 중')} <span aria-hidden="true">→</span></span></a><div class="camp-episode-actions"><button type="button" data-complete="${f.number}" data-finished="${finished}" aria-label="${esc(f.title)} · ${finished ? words.undo : words.complete}">${finished ? words.undo : words.complete}</button>${finished ? `<span class="camp-complete-mark">✓ ${words.completed}</span>` : ''}</div></article>`;
    }
    function renderStarters() {
      const section = host.querySelector('.camp-starters');
      if (!starters.length || camp !== 'story') return;
      const completed = starters.filter(starterDone), active = starters.filter(x => !starterDone(x));
      const starterCard = (x, finished) => `<article class="camp-episode${finished ? ' is-completed' : ''}"><a class="camp-episode-link" href="korean-starter.html?id=${x.id}&type=story&level=${level}"><span class="camp-kicker">STARTER · ${x.id} · NOT LEVEL-ASSIGNED</span><h3>${esc(x.title)}</h3><p>${esc(x.goal)}</p><span class="camp-start">Remember and retell →</span></a>${finished ? `<div class="camp-episode-actions"><button type="button" data-starter-undo="${x.id}">Undo</button></div>` : ''}</article>`;
      section.innerHTML = `<div class="camp-level-heading"><span class="camp-kicker">AVAILABLE NOW · STARTER COLLECTION</span><h2>Start with a short Korean story.</h2><p>These six existing starters are not assigned A1–C2 levels. Their stories, notes and shared starter progress are unchanged.</p><p>${completed.length} / ${starters.length} starter missions completed</p></div><div class="camp-episode-list">${active.map(x => starterCard(x, false)).join('')}</div><details class="camp-completed"><summary><span>Completed starter missions</span><span>${completed.length}</span></summary><div class="camp-completed-list">${completed.map(x => starterCard(x, true)).join('') || '<p>No completed starter missions yet.</p>'}</div></details>`;
    }
    function render() {
      const resume = host.querySelector('.camp-resume'); resume.innerHTML = '';
      if (language === 'en') try {
        const records = Object.values(JSON.parse(localStorage.getItem('talktag-myspace-activity:v1') || '{}'));
        const last = records.filter(record => {
          const u = new URL(record.href, location.origin), f = families.find(item => item.number === u.searchParams.get('family'));
          return u.origin === location.origin && u.pathname === '/' + (camp === 'story' ? 'storycamp-reader.html' : 'vocalcamp-player.html') && u.searchParams.get('level') === level && record.checkpoint && f && !done(f);
        }).sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0))[0];
        if (last) { const f = families.find(item => item.number === new URL(last.href, location.origin).searchParams.get('family')); resume.innerHTML = `<a href="${route(f)}"><small>${level} · 이어서 학습</small><strong>${esc(f.title)}</strong><span>${esc(last.checkpoint.label || '계속하기')} →</span></a>`; }
      } catch {}
      levels.innerHTML = LEVELS.map(l => { const s = summary(l); return `<a href="?${new URLSearchParams({...Object.fromEntries(params), level:l})}" data-level="${l}" data-group="${l[0]}"${l === level ? ' aria-current="page"' : ''}${s.total && s.completed === s.total ? ' class="is-level-complete"' : ''}><strong>${l}</strong><small>${s.total ? `${s.completed} / ${s.total} ${words.completed}` : words.pending}</small><span class="camp-level-meter" aria-hidden="true"><i style="width:${s.total ? s.completed / s.total * 100 : 0}%"></i></span></a>`; }).join('');
      const available = families.filter(f => f.levels?.includes(level)), filtered = available.filter(f => !term || `${f.number} ${f.title}`.toLowerCase().includes(term)), active = filtered.filter(f => !done(f)), completed = filtered.filter(done), totalDone = available.filter(done).length;
      const pages = Math.max(1, Math.ceil(active.length / PAGE_SIZE)); page = Math.max(1, Math.min(page, pages));
      host.querySelector('#campEpisodeHeading').textContent = `${level} · ${title}`;
      host.querySelector('#campProgress').textContent = available.length ? `${totalDone} / ${available.length} ${words.completed}` : words.pending;
      input.disabled = !available.length;
      host.querySelector('.camp-search').hidden = !available.length;
      host.querySelector('#campClear').hidden = !term;
      list.innerHTML = active.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(f => card(f, false)).join('') || `<div class="camp-empty"><h3>${available.length ? (term ? words.noMatch : words.allDone) : words.pending}</h3>${!available.length ? `<p>${words.pendingText}</p>${language !== 'en' && !(english && camp === 'story') ? `<a href="${english ? 'korean-audio-library.html?type=guided' : 'guided.html'}">${english ? 'Try published Korean GLR' : '공개된 일본어 GLR 연습하기'} →</a>` : ''}` : ''}</div>`;
      const pagination = host.querySelector('.camp-pagination'); pagination.hidden = pages <= 1;
      pagination.querySelector('span').textContent = `${page} / ${pages}`;
      pagination.querySelector('[data-page="previous"]').disabled = page === 1;
      pagination.querySelector('[data-page="next"]').disabled = page === pages;
      const shelf = host.querySelector('.camp-completed');
      shelf.hidden = !available.length;
      shelf.querySelector('.camp-shelf-count').textContent = totalDone;
      shelf.querySelector('.camp-completed-list').innerHTML = completed.map(f => card(f, true)).join('') || `<p>${term ? words.noMatch : words.emptyShelf}</p>`;
      renderStarters();
    }
    function select(next, updateHistory = true) {
      if (!LEVELS.includes(next)) return;
      level = next; page = 1; term = ''; input.value = '';
      if (updateHistory) { const url = new URL(location.href); url.searchParams.set('level', level); history.pushState(null, '', url); }
      try { localStorage.setItem(preferenceKey, level); } catch {}
      render();
      levels.querySelector(`[data-level="${level}"]`)?.focus({preventScroll:true});
    }
    host.addEventListener('click', event => {
      const levelLink = event.target.closest('[data-level]');
      if (levelLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); select(levelLink.dataset.level); return; }
      const button = event.target.closest('button'); if (!button) return;
      if (button.hasAttribute('data-page')) { page += button.dataset.page === 'next' ? 1 : -1; render(); host.querySelector('#campEpisodeHeading').scrollIntoView({block:'start'}); }
      if (button.hasAttribute('data-complete')) {
        const n = button.dataset.complete, finished = button.dataset.finished === 'true';
        window.TalkTagCampProgress?.set(camp, level, n, !finished);
        render();
        if (!finished) host.querySelector('.camp-completed').open = true;
        const target = host.querySelector(`[data-complete="${n}"]`); target?.focus({preventScroll:true});
      }
      if (button.hasAttribute('data-starter-undo')) { starterUndo(button.dataset.starterUndo); renderStarters(); }
    });
    input.addEventListener('input', () => { term = input.value.trim().toLowerCase(); page = 1; render(); });
    host.querySelector('form').addEventListener('submit', e => e.preventDefault());
    host.querySelector('#campClear').addEventListener('click', () => { input.value = ''; term = ''; page = 1; render(); input.focus(); });
    addEventListener('popstate', () => select(new URLSearchParams(location.search).get('level')?.toUpperCase() || 'A1', false));
    addEventListener('talktag:completion-change', render);
    addEventListener('storage', render);
    addEventListener('pageshow', render);
    render();
  }
  window.TalkTagCampBrowser = { mount };
  function init() {
    const file = location.pathname.split('/').pop();
    if (!['story-camp.html', 'vocal-camp.html'].includes(file)) return;
    const camp = file.startsWith('vocal') ? 'vocal' : 'story';
    if (location.pathname.startsWith('/japanese/')) {
      const main = document.querySelector('main');
      document.body.classList.add('ja-bootcamp-shell');
      document.body.classList.add('ja-studio-aligned');
      const brand = document.querySelector('.ja-brand span'); if (brand) brand.textContent = camp === 'vocal' ? 'Vocal Camp' : 'Story Camp';
      const category = document.querySelector('.tt-route-category'); if (category) { category.href = 'snowballing.html#boot-camp'; category.innerHTML = '<span aria-hidden="true">⌂</span><b>Studio</b>'; }
      main.innerHTML = `<section class="ja-hero"><p class="ja-kicker">BOOT CAMP · ${camp === 'vocal' ? 'BUILD' : 'REBUILD'}</p><h1>${camp === 'vocal' ? 'Vocal Camp' : 'Story Camp'}</h1><p>${camp === 'vocal' ? '이야기를 소리로 익히고, 나의 말로 전달합니다.' : '이야기를 쌓고, 기억해서 말하고, 나의 이야기로 바꿉니다.'}</p></section><section id="campBrowser"></section><nav class="ja-related" aria-label="Studio 학습 공간"><a href="snowballing.html#sound-check">01 · Sound Check</a><a href="snowballing.html#boot-camp">02 · Boot Camp</a><a href="readable.html">03 · Readable</a></nav>`;
      mount(main.querySelector('#campBrowser'), {camp, language:'ja'});
    } else mount(document.getElementById(`${camp}-camp`), {camp, language:'en'});
  }
  // Deferred scripts run while readyState is interactive; wait for the shared header first.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init); else init();
})();
