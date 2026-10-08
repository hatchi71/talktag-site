(() => {
  'use strict';
  const vocal = document.body.dataset.camp === 'vocal';
  const prefix = vocal ? 'vocalcamp-family:' : 'storycamp-family:';
  const familyRoute = vocal ? 'vocalcamp-family.html' : 'storycamp-family.html';
  const choose = document.getElementById(vocal ? 'vocal-camp' : 'story-camp');
  const shelf = document.createElement('section');
  const leafArt = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M38 7C39 25 31 39 15 37C7 36 6 29 9 23C13 14 26 14 38 7Z" fill="#C78A45"/><path d="M38 7C35 24 26 32 12 39M28 22L20 21M23 29L24 19M18 34L12 30" stroke="#80572F" stroke-width="1.7" stroke-linecap="round"/></svg>';
  shelf.className = 'story-leaf-shelf';
  shelf.innerHTML = `<button class="story-leaf-toggle" type="button" aria-expanded="false" aria-controls="storyLeafList"><span class="story-leaf-art">${leafArt}</span><span><strong>완료한 미션</strong><small>내 안에 쌓인 이야기</small></span><span class="story-leaf-count"></span><span class="story-leaf-chevron" aria-hidden="true">⌄</span></button><div id="storyLeafList" class="story-leaf-list" hidden></div><p class="story-leaf-status" role="status"></p>`;
  choose.appendChild(shelf);
  const toggle = shelf.querySelector('button');
  const list = shelf.querySelector('.story-leaf-list');
  let timer;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function refresh() {
    renderCatalog();
    const completed = families.filter(item => window.TalkTagCompletion.get(`${prefix}${item.number}`));
    shelf.querySelector('.story-leaf-count').textContent = `${completed.length}`;
    list.innerHTML = completed.map(item => `<div class="story-leaf-row"><span class="story-leaf-mini">${leafArt}</span><a href="${familyRoute}?family=${item.number}"><small>${item.number}</small><strong>${escape(item.title)}</strong></a><button type="button" data-undo="${item.number}" aria-label="${escape(item.title)} 완료 취소">완료 취소</button></div>`).join('') || '<p class="story-leaf-empty">한 편을 마치면, 작은 낙엽 하나가 이곳에 남습니다.</p>';
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-undo]');
    if (!button) return;
    window.TalkTagCompletion.set(`${prefix}${button.dataset.undo}`, false);
    toggle.focus();
  });
  window.addEventListener('talktag:completion-change', event => {
    if (!event.detail.id.startsWith(prefix)) return;
    clearTimeout(timer);
    if (event.detail.completed) {
      const card = [...catalog.querySelectorAll('.tt-completion-card')].find(node => node.dataset.completionId === event.detail.id);
      if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const from = card.getBoundingClientRect(), to = toggle.getBoundingClientRect();
        const leaf = document.createElement('span');
        leaf.className = 'story-falling-leaf'; leaf.innerHTML = leafArt; leaf.setAttribute('aria-hidden', 'true');
        document.body.appendChild(leaf);
        leaf.style.left = `${from.left + from.width / 2}px`; leaf.style.top = `${from.top + from.height / 2}px`;
        leaf.animate([{transform:'translate(-50%,-50%) rotate(-20deg)',opacity:1},{transform:`translate(${to.left+32-from.left-from.width/2}px,${Math.min(to.top+30,innerHeight-44)-from.top-from.height/2}px) rotate(140deg) scale(.7)`,opacity:.2}],{duration:650,easing:'cubic-bezier(.3,.05,.4,1)'}).finished.then(()=>leaf.remove());
        card.classList.add('story-leaf-departing');
        timer=setTimeout(()=>{refresh();toggle.focus({preventScroll:true});},650);
      } else refresh();
      shelf.querySelector('.story-leaf-status').textContent='미션을 완료했습니다. 완료한 미션에서 다시 확인할 수 있습니다.';
    } else {
      refresh(); shelf.querySelector('.story-leaf-status').textContent='완료를 취소했습니다. 원래 번호의 카드로 돌아왔습니다.';
    }
  });
  window.addEventListener('storage', refresh);
  window.addEventListener('pageshow', refresh);
  refresh();
})();
