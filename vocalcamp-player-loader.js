(() => {
 const params=new URLSearchParams(location.search),number=params.get('family')||'001',level=(params.get('level')||'A1').toUpperCase(),app=document.getElementById('pilotApp');
 if(!/^[0-9]{3}$/.test(number)||!['A1','A2','B1','B2','C1','C2'].includes(level)){app.textContent='번호와 레벨을 확인해 주세요.';return;}
 const korean=new URLSearchParams(location.search).get('lang')==='ko';
 const sources=korean?['content/vocalcamp-korean-001.js?v=20261014-korean-vocal-audio-v2','content/vocalcamp-korean-002.js?v=20261015-korean-vocal-002-v1','content/vocalcamp-korean-003.js?v=20261017-korean-vocal-003-v1','audio/korean/vocalcamp/segments-001-002/manifest.js?v=20261017-cumulative-v2','audio/korean/vocalcamp/segments-003/manifest.js?v=20261017-korean-vocal-003-v1']:['content/vocalcamp/'+number+'.js?v=20261009-003'];
 const load=(index=0)=>{const script=document.createElement('script');script.src=sources[index];
 script.onload=()=>{if(index+1<sources.length){load(index+1);return;}const family=(korean?window.TALKTAG_VOCALCAMP_KOREAN:window.TALKTAG_VOCALCAMP)?.families.find(item=>item.number===number),data=korean?family?.levelsData?.[level]:family?.levels[level];if(!data){app.textContent='자료를 찾을 수 없습니다.';return;}
 if(korean){document.documentElement.lang='en';const brand=document.querySelector('.pilot-brand span'),home=document.querySelector('.pilot-brand'),back=document.querySelector('.pilot-back');if(brand)brand.textContent='Korean Vocal Camp';if(home){home.href='K-korean.html';home.setAttribute('aria-label','TalkTag Korean home');}if(back){back.href=`K-korean-vocal-camp.html?level=${level}`;back.textContent='← Korean Vocal Camp';}}
 const native=(korean?(number==='003'?window.TalkTagKoreanVocal003Variants:window.TalkTagKoreanVocal001002Variants):window.TalkTagVocal001002Variants)?.cards?.find(card=>card.id===`family-${number}-${level}`);
 const nativeReady=Boolean(native&&native.lines.length===data.lines.length&&native.lines.every((line,i)=>line.text===data.lines[i])&&native.steps.length===data.audioSteps.length&&native.steps.every(step=>step.variants?.length===4));
 if((korean?['001','002','003']:['001','002']).includes(number)&&!nativeReady){app.textContent=korean?'The new audio is unavailable. Please reopen this page.':'새 음원을 불러오지 못했습니다. 페이지를 다시 열어 주세요.';return;}
 const audioSteps=nativeReady
   ?data.audioSteps.map((step,i)=>({...step,variants:native.steps[i].variants})):data.audioSteps;
 window.TalkTagVocalPilots=[{id:'family-'+number+'-'+level,familyNumber:number,level,title:family.title,fullText:data.lines,translation:data.translation||[],storyFlow:family.storyFlow||(korean?['Beginning','Change','Choice','Result']:['시작','변화','선택','결과']),note:korean?'Rebuild the same Korean story from memory, then make it your own.':'같은 이야기를 Story Camp에서 기억으로 다시 구성해 보세요.',mission:data.status==='audio-pending'?(korean?'Audio in preparation':'음원 준비 중'):(korean?'Build the sound into your own story.':'소리부터 내 이야기로'),audioStatus:data.status,audioSteps,audioCue:family.audioCue}];
 const engine=document.createElement('script');engine.src='vocalcamp-player.js?v=20261017-cumulative-v2';document.head.appendChild(engine);};
 script.onerror=()=>app.textContent=korean?'Could not load the lesson. Please try again.':'자료를 불러오지 못했습니다.';document.head.appendChild(script);};load();
})();
