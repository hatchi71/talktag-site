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
    main.innerHTML = '<p class="story-error">현재 공개된 일본어 스토리 캠프 카드는 001 한 편입니다. <a href="J-story-camp.html">목록으로 돌아가기</a></p>';
    return;
  }
  document.title = `001 · ${level} · ${family.title} | TalkTag 일본어`;
  const art = window.TalkTagBootCampArtwork?.get('story','001',level,'ja');
  const key = `talktag-ja-story-001-${level}:short-v3`;
  const link = `J-story-camp.html?level=${level}`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const initial = Number(localStorage.getItem(key) || 0);
  let stage = Number.isFinite(initial) && initial >= 0 && initial < 9 ? initial : 0;
  let reading = false, meaning = false;
  main.innerHTML = `<section class="story-hero"><div><p class="story-eyebrow">스토리 캠프 · ${level} · 001</p><h1>${esc(family.title)}</h1><p class="story-subtitle" lang="ja">${esc(family.japaneseTitle)}</p><p class="story-lead">다섯 의미 단위를 누적해 읽은 뒤, 다시 쓰기 → 기억해서 말하기 → 나의 이야기 → 파트너에게 전달하기로 마칩니다.</p></div>${art ? `<figure><img src="${esc(art.src)}" alt="${esc(art.alt)}" width="720" height="480"></figure>` : ''}</section><section class="story-card" aria-label="스토리 캠프 practice cards"><div class="story-status"><strong id="storyCount"></strong><span>001 · ${level}</span></div><div class="story-meter" aria-hidden="true"><i id="storyMeter"></i></div><nav class="story-stage-tabs" aria-label="학습 단계" id="storyTabs"></nav><div class="story-stage"><p class="story-stage-kicker" id="storyKicker">READ → COVER → WRITE</p><h2 id="storyTitle"></h2><div class="story-lines" id="storyLines" lang="ja"></div><div class="story-toggles"><button type="button" id="showReading" aria-pressed="false">후리가나 읽기 보기</button><button type="button" id="showMeaning" aria-pressed="false">한국어 뜻 보기</button></div><div class="story-activity" id="storyActivity" hidden></div><div class="story-cue"><strong>내 말로 다시 만들기</strong><span id="storyCue"></span></div></div><div class="story-actions"><button type="button" id="storyPrev">← 이전</button><button type="button" class="primary" id="storyNext">다음 →</button></div><p class="story-complete" id="storyComplete" hidden>완료한 이야기는 스토리 캠프 보관함에서 다시 열거나 완료를 취소할 수 있습니다.</p></section>`;
  const tabs = document.getElementById('storyTabs'), lines = document.getElementById('storyLines');
  const count = document.getElementById('storyCount'), meter = document.getElementById('storyMeter');
  const title = document.getElementById('storyTitle'), cue = document.getElementById('storyCue');
  const prev = document.getElementById('storyPrev'), next = document.getElementById('storyNext');
  const readingButton = document.getElementById('showReading'), meaningButton = document.getElementById('showMeaning');
  const activity = document.getElementById('storyActivity'), toggles = main.querySelector('.story-toggles');
  const activityCards = [
    {title:'이야기 전체 다시 쓰기',guide:'완성된 글을 보지 않고 다섯 단위 전체를 노트에 다시 써 보세요.',task:'다 쓴 뒤에만 아래의 원문을 열어 빠진 부분을 확인하세요.',reference:true},
    {title:'기억해서 말하기',guide:'원문과 노트를 모두 덮고, 이야기 전체를 처음부터 끝까지 일본어로 말해 보세요.',task:'막히더라도 기억나는 표현으로 이어 가세요.'},
    {title:'나의 이야기 만들기',guide:'시작 → 변화 → 결과의 흐름은 유지하고, 인물·장소·선택·결과를 내 경험에 맞게 바꿔 쓰세요.',task:'원문의 문장을 베끼지 말고 나의 관점으로 다시 만드세요.'},
    {title:'파트너에게 전달하기',guide:'방금 만든 나의 이야기도 덮고, 실제 사람에게 자연스럽게 전해 보세요.',task:'노트를 읽지 말고 대화하듯 이야기하세요.'}
  ];
  for (let index = 0; index < 9; index += 1) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = String(index + 1);
    button.setAttribute('aria-label',index < 5 ? `누적 단계 ${index + 1}` : `${index + 1}단계 · ${activityCards[index - 5].title}`);
    button.addEventListener('click',() => show(index)); tabs.append(button);
  }
  function show(index) {
    stage = Math.max(0,Math.min(8,index));
    try { localStorage.setItem(key,String(stage)); } catch {}
    const building = stage < 5;
    count.textContent = `${stage + 1} / 9 · ${building ? '누적 읽기' : '다음 연습'}`;
    meter.style.width = `${((stage + 1) / 9) * 100}%`;
    title.textContent = building ? (stage === 4 ? '다섯 단위 이야기 완성' : `처음부터 ${stage + 1}단위까지`) : activityCards[stage - 5].title;
    document.getElementById('storyKicker').textContent = building ? 'READ → COVER → WRITE' : 'REMEMBER → CREATE → SHARE';
    lines.hidden = !building; toggles.hidden = !building; activity.hidden = building;
    lines.replaceChildren();
    for (let part = 0; part <= Math.min(stage,4) && building; part += 1) {
      const card = document.createElement('article'); card.className = 'story-line';
      for (const [className, content, visible] of [['jp',data.lines[part],true],['reading',data.readings[part],reading],['meaning',data.meanings[part],meaning]]) {
        const paragraph = document.createElement('p'); paragraph.className = className; paragraph.textContent = content;
        if (className === 'reading') paragraph.lang = 'ja';
        if (className === 'meaning') paragraph.lang = 'ko';
        paragraph.hidden = !visible; card.append(paragraph);
      }
      lines.append(card);
    }
    if (!building) {
      const card = activityCards[stage - 5];
      activity.innerHTML = `<p>${esc(card.guide)}</p><div class="story-activity-task">${esc(card.task)}</div>${card.reference ? `<details><summary>완성된 일본어 이야기 확인하기</summary><div lang="ja">${data.lines.map(line => `<p>${esc(line)}</p>`).join('')}</div></details>` : ''}`;
    }
    [...tabs.children].forEach((button,part) => button.setAttribute('aria-current',part === stage ? 'step' : 'false'));
    cue.textContent = !building ? '이 단계를 마친 뒤 다음 연습으로 이어 가세요.' : stage === 4
      ? '다섯 단위를 읽고 가린 뒤, 다음 카드에서 이야기 전체를 다시 써 보세요.'
      : '원문을 가리고 첫 단위부터 여기까지 노트에 다시 써 보세요. 새 단위만 쓰지 않습니다.';
    prev.disabled = stage === 0;
    next.textContent = stage === 8 ? '이야기 완료' : '다음 →';
    document.getElementById('storyComplete').hidden = !window.TalkTagCampProgress?.done('ja-story',level,'001');
  }
  readingButton.addEventListener('click',() => { reading = !reading; readingButton.setAttribute('aria-pressed',String(reading)); show(stage); });
  meaningButton.addEventListener('click',() => { meaning = !meaning; meaningButton.setAttribute('aria-pressed',String(meaning)); show(stage); });
  prev.addEventListener('click',() => show(stage - 1));
  next.addEventListener('click',() => {
    if (stage < 8) { show(stage + 1); return; }
    window.TalkTagCampProgress?.set('ja-story',level,'001',true);
    try { localStorage.removeItem(key); } catch {}
    location.href = link;
  });
  show(stage);
})();
