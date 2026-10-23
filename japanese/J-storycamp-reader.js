(() => {
  'use strict';
  const allowed = ['A1','A2','B1','B2','C1','C2'];
  const params = new URLSearchParams(location.search);
  const level = allowed.includes(params.get('level')?.toUpperCase()) ? params.get('level').toUpperCase() : 'A1';
  const familyNumber = params.get('family') || '001';
  const main = document.getElementById('storyMain');
  const family = window.TALKTAG_STORYCAMP_JAPANESE?.families?.find(item => item.number === familyNumber);
  const data = family?.levels?.[level];
  if (familyNumber !== '001' || !data || !['lines','readings','meanings'].every(key => Array.isArray(data[key]) && data[key].length === 5)) {
    main.innerHTML = '<p class="story-error">현재 공개된 일본어 Story Camp 카드는 001 한 편입니다. <a href="J-story-camp.html">목록으로 돌아가기</a></p>';
    return;
  }
  document.title = `001 · ${level} · ${family.title} | TalkTag 日本語`;
  const art = window.TalkTagBootCampArtwork?.get('story','001',level,'ja');
  const key = `talktag-ja-story-001-${level}:short-v3`;
  const link = `J-story-camp.html?level=${level}`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const initial = Number(localStorage.getItem(key) || 0);
  let stage = Number.isFinite(initial) && initial >= 0 && initial < 5 ? initial : 0;
  let reading = false, meaning = false;
  main.innerHTML = `<section class="story-hero"><div><p class="story-eyebrow">STORY CAMP · ${level} · 001</p><h1>${esc(family.title)}</h1><p class="story-subtitle" lang="ja">${esc(family.japaneseTitle)}</p><p class="story-lead">다섯 개의 짧은 의미 단위를 처음부터 다시 쌓습니다. 매 단계에서 이야기를 읽고 가린 뒤, 기억한 내용을 일본어로 적어 보세요.</p></div>${art ? `<figure><img src="${esc(art.src)}" alt="${esc(art.alt)}" width="720" height="480"></figure>` : ''}</section><section class="story-card" aria-label="Story Camp cumulative card"><div class="story-status"><strong id="storyCount"></strong><span>001 · ${level}</span></div><div class="story-meter" aria-hidden="true"><i id="storyMeter"></i></div><nav class="story-stage-tabs" aria-label="누적 단계" id="storyTabs"></nav><div class="story-stage"><p class="story-stage-kicker">READ → COVER → WRITE → RETELL</p><h2 id="storyTitle"></h2><div class="story-lines" id="storyLines" lang="ja"></div><div class="story-toggles"><button type="button" id="showReading" aria-pressed="false">후리가나 읽기 보기</button><button type="button" id="showMeaning" aria-pressed="false">한국어 뜻 보기</button></div><div class="story-cue"><strong>내 말로 다시 만들기</strong><span id="storyCue"></span></div></div><div class="story-actions"><button type="button" id="storyPrev">← 이전</button><button type="button" class="primary" id="storyNext">다음 →</button></div><p class="story-complete" id="storyComplete" hidden>완료한 이야기는 Story Camp 보관함에서 다시 열거나 완료를 취소할 수 있습니다.</p></section>`;
  const tabs = document.getElementById('storyTabs'), lines = document.getElementById('storyLines');
  const count = document.getElementById('storyCount'), meter = document.getElementById('storyMeter');
  const title = document.getElementById('storyTitle'), cue = document.getElementById('storyCue');
  const prev = document.getElementById('storyPrev'), next = document.getElementById('storyNext');
  const readingButton = document.getElementById('showReading'), meaningButton = document.getElementById('showMeaning');
  for (let index = 0; index < 5; index += 1) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = String(index + 1);
    button.setAttribute('aria-label',`누적 단계 ${index + 1}`);
    button.addEventListener('click',() => show(index)); tabs.append(button);
  }
  function show(index) {
    stage = Math.max(0,Math.min(4,index));
    try { localStorage.setItem(key,String(stage)); } catch {}
    count.textContent = `${stage + 1} / 5 · 누적 단계`;
    meter.style.width = `${(stage + 1) * 20}%`;
    title.textContent = stage === 4 ? '이야기 완성' : `처음부터 ${stage + 1}단위까지`;
    lines.replaceChildren();
    for (let part = 0; part <= stage; part += 1) {
      const card = document.createElement('article'); card.className = 'story-line';
      for (const [className, content, visible] of [['jp',data.lines[part],true],['reading',data.readings[part],reading],['meaning',data.meanings[part],meaning]]) {
        const paragraph = document.createElement('p'); paragraph.className = className; paragraph.textContent = content;
        if (className === 'reading') paragraph.lang = 'ja';
        if (className === 'meaning') paragraph.lang = 'ko';
        paragraph.hidden = !visible; card.append(paragraph);
      }
      lines.append(card);
    }
    [...tabs.children].forEach((button,part) => button.setAttribute('aria-current',part === stage ? 'step' : 'false'));
    cue.textContent = stage === 4
      ? '원문과 해석을 가리고 다섯 단위의 처음부터 끝까지 노트에 다시 써 보세요. 마지막에는 글을 보지 않고 소리 내어 이야기해 보세요.'
      : '원문을 가리고 첫 단위부터 여기까지 노트에 다시 써 보세요. 새 단위만 쓰지 않습니다.';
    prev.disabled = stage === 0;
    next.textContent = stage === 4 ? '이야기 완료' : '다음 →';
    document.getElementById('storyComplete').hidden = !window.TalkTagCampProgress?.done('ja-story',level,'001');
  }
  readingButton.addEventListener('click',() => { reading = !reading; readingButton.setAttribute('aria-pressed',String(reading)); show(stage); });
  meaningButton.addEventListener('click',() => { meaning = !meaning; meaningButton.setAttribute('aria-pressed',String(meaning)); show(stage); });
  prev.addEventListener('click',() => show(stage - 1));
  next.addEventListener('click',() => {
    if (stage < 4) { show(stage + 1); return; }
    window.TalkTagCampProgress?.set('ja-story',level,'001',true);
    try { localStorage.removeItem(key); } catch {}
    location.href = link;
  });
  show(stage);
})();
