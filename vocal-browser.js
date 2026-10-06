/* Local B-design preview. Example episodes are not published learning content.
   Stage definitions and legacy lesson data remain unchanged in vocal-camp-data.js. */
(() => {
  'use strict';
  const root = document.getElementById('vocalRoot');
  const data = window.TalkTagVocalCamp;
  if (!root || !data) return;
  document.body.classList.add('vocal-browser-page');
  const topics = [
    {id:'daily', name:'일상', symbol:'☕', description:'익숙한 하루에서 이야기를 시작하세요.'},
    {id:'travel', name:'여행', symbol:'✈', description:'새로운 장소에서 만나는 순간들.'},
    {id:'people', name:'관계', symbol:'↔', description:'사람과 사람 사이의 작은 이야기.'}
  ];
  const episodes = [
    {id:'cafe', topic:'daily', title:'카페에서 생긴 작은 실수', description:'주문이 바뀐 순간부터 문제를 해결하기까지.'},
    {id:'morning', topic:'daily', title:'바쁜 아침의 약속', description:'분주한 아침, 약속을 지키기 위한 선택.'},
    {id:'train', topic:'travel', title:'놓칠 뻔한 기차', description:'뜻밖의 지연 속에서 다음 행동을 결정하는 이야기.'},
    {id:'colleague', topic:'people', title:'새 동료와의 첫 만남', description:'첫 인사에서 함께하는 계획으로 이어지는 이야기.'}
  ];
  const params = new URLSearchParams(location.search);
  const topic = topics.find(t => t.id === params.get('topic'));
  const episode = episodes.find(e => e.id === params.get('episode'));
  const stage = data.stages.find(s => s.id === params.get('stage'));
  const E = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls || ''; if(text) n.textContent = text; return n; };
  const url = (t,e,s) => 'vocal-camp.html' + (t ? '?topic='+t : '') + (e ? '&episode='+e : '') + (s ? '&stage='+s : '');
  const A = (text, href, cls) => {const a = E('a',cls,text); a.href = href; return a;};
  root.replaceChildren(); root.hidden = false; root.classList.add('vocal-browser');
  if (!topic && !episode && !stage) {
    const pilotSection=E('section','vb-pilot-section');
    const pilotHead=E('div','vb-pilot-head');pilotHead.append(E('span','vb-pilot-kicker','V1 · A1–C2 · 18 AUDIO LESSONS'),E('h2','','소리로 시작하는 Vocal Camp'));
    const pilotCatalog=E('div','vb-pilot-catalog');
    const pilots=window.TalkTagVocalPilots||[];
    ['A1','A2','B1','B2','C1','C2'].forEach(level=>{
      const levelBlock=E('section','vb-level-block');
      const levelHead=E('div','vb-level-head');levelHead.append(E('h3','',level),E('p','','쉬움에서 도전까지 · 3개 음원'));
      const pilotList=E('div','vb-pilot-list');
      pilots.filter(item=>item.level===level).forEach(item=>{
        const pilot=A('',`vocal-a1-pilot.html?unit=${encodeURIComponent(item.id)}`,'vb-pilot');
        const pilotCopy=E('div','vb-pilot-copy');
        pilotCopy.append(E('span','vb-pilot-kicker',`${item.level} · ${item.difficultyLabel||''}`),E('h3','',item.title),E('small','vb-pilot-english',item.englishTitle||''),E('p','',item.mission));
        pilot.append(pilotCopy,E('strong','vb-pilot-open','훈련 시작 →'));pilotList.append(pilot);
      });
      levelBlock.append(levelHead,pilotList);pilotCatalog.append(levelBlock);
    });
    pilotSection.append(pilotHead,pilotCatalog);root.append(pilotSection);
  }
  const note = E('p','vb-notice','V1 정식 음원 · 한 번 시작하면 각 누적 단계를 10회 반복하고 자동으로 다음 단계로 이동합니다.');
  root.append(note);
  const selectedTopic = episode ? topics.find(t=>t.id===episode.topic) : topic;
  const nav = E('nav','vb-breadcrumb'); nav.setAttribute('aria-label','현재 위치');
  nav.append(A('주제 선택',url()));
  if(selectedTopic) nav.append(E('span','','/'),A(selectedTopic.name,url(selectedTopic.id)));
  if(episode) nav.append(E('span','','/'),A(episode.title,url(episode.topic,episode.id)));
  if(stage && episode) nav.append(E('span','','/ '+stage.id));
  root.append(nav);
  if(params.get('episode') && !episode || params.get('topic') && !topic || params.get('stage') && !stage) {
    root.append(E('h1','','선택한 내용을 찾을 수 없습니다.'),A('주제 다시 선택하기 →',url(),'vb-action')); return;
  }
  if(!episode) {
    root.append(E('div','ey','VOCAL CAMP · TOPIC → EPISODE → V1–V11'),E('h1','','관심 있는 주제부터 시작하세요.'),E('p','intro','주제를 고르고, 하나의 이야기를 선택하세요. 같은 이야기에 의미를 더하며 V1부터 V11까지 확장합니다.'));
    if(params.get('stage')) root.append(E('p','vb-notice','기존 단계 링크로 방문하셨습니다. 먼저 이야기 하나를 선택해 주세요.'));
    const choices = E('nav','vb-topics'); choices.setAttribute('aria-label','주제 선택');
    topics.forEach(t=>{const a=A('',url(t.id),'vb-topic');a.append(E('span','vb-symbol',t.symbol),E('strong','',t.name));if(topic?.id===t.id)a.setAttribute('aria-current','page');choices.append(a);});root.append(choices);
    if(topic) {
      root.append(E('h2','',topic.name+' → 에피소드'),E('p','intro',topic.description));
      const list = E('div','vb-episodes');
      episodes.filter(e=>e.topic===topic.id).forEach(e=>{const a=A('',url(topic.id,e.id),'vb-episode');a.append(E('span','vb-tag','예시 에피소드'),E('h3','',e.title),E('p','',e.description),E('span','vb-meta','V1–V11 · 한 이야기의 11개 세그먼트'),E('strong','vb-link','에피소드 선택 →'));list.append(a);});root.append(list);
    }else root.append(E('div','vb-empty','위에서 주제를 선택하면 에피소드가 나타납니다.'));
  } else {
    root.append(E('div','ey','EPISODE · '+selectedTopic.name),E('h1','',episode.title),E('p','intro','V1~V11은 이 이야기의 전개·확장 세그먼트입니다. 다른 주제나 영어 난이도 등급이 아닙니다.'));
    document.title=episode.title+' · '+(stage?.id || 'V1–V11')+' | Vocal Camp';
    if(!stage){
      root.append(A('V1부터 시작 →',url(episode.topic,episode.id,'V1'),'vb-action'));
      const list=E('div','vb-segments');
      data.stages.forEach(s=>{const a=A('',url(episode.topic,episode.id,s.id),'vb-segment');a.append(E('b','',s.id),E('h3','',s.title),E('p','',s.goal),E('span','vb-meta','음원 준비 중'));list.append(a);});root.append(list);
    }else{
      const links=E('nav','vb-stage-nav');links.setAttribute('aria-label','이 이야기의 세그먼트');
      data.stages.forEach(s=>{const a=A(s.id,url(episode.topic,episode.id,s.id));if(s===stage)a.setAttribute('aria-current','page');links.append(a);});root.append(links);
      const panel=E('section','vb-player');panel.append(E('div','ey',stage.id+' / V11 · '+stage.name),E('h2','',stage.title),E('p','',stage.goal),E('p','vb-empty','이 에피소드의 '+stage.id+' 음원을 준비하고 있습니다. 아직 재생할 수 없습니다.'));
      root.append(panel);
      const foot=E('nav','vb-footer');foot.setAttribute('aria-label','같은 이야기의 이전 다음 세그먼트');const i=data.stages.indexOf(stage);
      foot.append(A(i?'← '+data.stages[i-1].id:'← 전체 세그먼트',url(episode.topic,episode.id,i?data.stages[i-1].id:null)));
      foot.append(A(i<10?data.stages[i+1].id+' →':'다른 이야기 선택 →',i<10?url(episode.topic,episode.id,data.stages[i+1].id):url(episode.topic)));root.append(foot);
    }
  }
})();
