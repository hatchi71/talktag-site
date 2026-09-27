/* Media is intentionally unconnected. Add approved R2 audio / video metadata later. */
(() => {
 const parts=[['사진 묘사','사진 속 행동과 상태를 소리로 연결합니다.','장면을 살펴보세요.','행동·상태 표현에 귀 기울이세요.','들리는 표현과 사진을 연결해 보세요.'],['질의응답','질문의 의도를 이해하고 자연스러운 응답을 찾아봅니다.','질문이 무엇을 묻는지 생각하세요.','응답이 상황에 맞는지 들어보세요.','다른 표현으로 답해 보세요.'],['짧은 대화','대화의 상황과 흐름 속에서 필요한 정보를 찾습니다.','등장인물과 상황을 파악하세요.','문제와 다음 행동을 정리하세요.','대화의 핵심을 요약해 보세요.'],['설명문','이어지는 발화의 목적과 세부 내용을 함께 이해합니다.','무엇을 위한 안내인지 생각하세요.','중요한 정보와 순서를 기억하세요.','들은 내용을 짧게 정리해 보세요.']];
 const root=document.getElementById('lcPart');const id=Number(new URLSearchParams(location.search).get('part'));const p=parts[id-1];
 const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;n.className=cls||'';return n;};
 if(!p){root.append(el('h1','파트를 찾을 수 없습니다.'));const a=el('a','LC 전체 파트로 돌아가기');a.href='lc.html';root.append(a);return;}
 document.title='LC Part '+id+' · '+p[0]+' | TalkTag';
 const nav=el('nav','','lc-nav');nav.setAttribute('aria-label','LC 파트 선택');parts.forEach((_,i)=>{const a=el('a','Part '+(i+1));a.href='lc-part.html?part='+(i+1);if(i+1===id)a.setAttribute('aria-current','page');nav.append(a);});
 root.append(nav,el('div','TOEIC LISTENING · PART '+id,'ey'),el('h1',p[0]),el('p',p[1],'intro'),el('p','임시 학습 안내 · 음원과 영상은 추후 연결됩니다.','lc-notice'));
 const guide=el('section','','lc-panel');guide.append(el('h2','이렇게 연습해 보세요'));const ol=el('ol','');p.slice(2).forEach(t=>ol.append(el('li',t)));guide.append(ol);root.append(guide);
 const grid=el('div','','camp-grid');[['듣기 자료','파트별 음원을 준비하고 있습니다. 등록 후 이곳에서 재생할 수 있습니다.'],['영상 가이드','필요한 학습 영상이 있는 경우 이곳에서 선택해 볼 수 있도록 연결할 예정입니다.']].forEach(([title,desc])=>{const s=el('section','','camp-card vocal');s.append(el('div','콘텐츠 준비 중','camp-kicker'),el('h2',title),el('p',desc));grid.append(s);});root.append(grid);
})();
