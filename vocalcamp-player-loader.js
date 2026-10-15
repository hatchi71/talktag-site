(() => {
 const params=new URLSearchParams(location.search),number=params.get('family')||'001',level=(params.get('level')||'A1').toUpperCase(),app=document.getElementById('pilotApp');
 if(!/^[0-9]{3}$/.test(number)||!['A1','A2','B1','B2','C1','C2'].includes(level)){app.textContent='번호와 레벨을 확인해 주세요.';return;}
 const korean=new URLSearchParams(location.search).get('lang')==='ko';
 const sources=korean?['content/vocalcamp-korean-001.js?v=20261014-korean-vocal-audio-v2','content/vocalcamp-korean-002.js?v=20261015-korean-vocal-002-v1']:['content/vocalcamp/'+number+'.js?v=20261009-003'];
 const load=(index=0)=>{const script=document.createElement('script');script.src=sources[index];
 script.onload=()=>{if(index+1<sources.length){load(index+1);return;}const family=(korean?window.TALKTAG_VOCALCAMP_KOREAN:window.TALKTAG_VOCALCAMP)?.families.find(item=>item.number===number),data=korean?family?.levelsData?.[level]:family?.levels[level];if(!data){app.textContent='자료를 찾을 수 없습니다.';return;}
 if(korean){document.documentElement.lang='en';const brand=document.querySelector('.pilot-brand span'),home=document.querySelector('.pilot-brand'),back=document.querySelector('.pilot-back');if(brand)brand.textContent='Korean Vocal Camp';if(home){home.href='K-korean.html';home.setAttribute('aria-label','TalkTag Korean home');}if(back){back.href=`K-korean-vocal-camp.html?level=${level}`;back.textContent='← Korean Vocal Camp';}}
 window.TalkTagVocalPilots=[{id:'family-'+number+'-'+level,familyNumber:number,level,title:family.title,fullText:data.lines,translation:data.translation||[],storyFlow:family.storyFlow||(korean?['Beginning','Change','Choice','Result']:['시작','변화','선택','결과']),note:korean?'Rebuild the same Korean story from memory, then make it your own.':'같은 이야기를 Story Camp에서 기억으로 다시 구성해 보세요.',mission:data.status==='audio-pending'?(korean?'Audio in preparation':'음원 준비 중'):(korean?'Build the sound into your own story.':'소리부터 내 이야기로'),audioStatus:data.status,audioSteps:data.audioSteps,audioCue:family.audioCue}];
 const engine=document.createElement('script');engine.src='vocalcamp-player.js?v=20261015-all-speaking-pause';document.head.appendChild(engine);};
 script.onerror=()=>app.textContent='자료를 불러오지 못했습니다.';document.head.appendChild(script);};load();
})();
