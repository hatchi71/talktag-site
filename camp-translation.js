(() => {
  const number=String(new URLSearchParams(location.search).get('family')||'001').padStart(3,'0');
  const data=window.TalkTagBootCampKorean?.families?.[number],theme=document.getElementById('familyTheme');
  if(!data||!theme)return;
  const wrap=document.createElement('div');wrap.className='camp-family-translation';
  const button=document.createElement('button');button.type='button';button.className='camp-kr-toggle';button.textContent='KR';button.setAttribute('aria-label','한글 제목과 소개 보기');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','familyKorean');
  const panel=document.createElement('section');panel.id='familyKorean';panel.className='camp-kr-panel';panel.lang='ko';panel.hidden=true;
  const title=document.createElement('strong');title.textContent=data.title;
  const text=document.createElement('p');text.textContent=data.theme;panel.append(title,text);wrap.append(button,panel);theme.after(wrap);
  button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
})();
