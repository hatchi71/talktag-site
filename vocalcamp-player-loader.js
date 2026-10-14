(() => {
 const params=new URLSearchParams(location.search),number=params.get('family')||'001',level=(params.get('level')||'A1').toUpperCase(),app=document.getElementById('pilotApp');
 if(!/^[0-9]{3}$/.test(number)||!['A1','A2','B1','B2','C1','C2'].includes(level)){app.textContent='번호와 레벨을 확인해 주세요.';return;}
 const korean=new URLSearchParams(location.search).get('lang')==='ko';
 const sources=korean?['content/vocalcamp-korean-001.js?v=20261014-korean-vocal-audio-v2','content/vocalcamp-korean-002.js?v=20261015-korean-vocal-002-v1']:['content/vocalcamp/'+number+'.js?v=20261009-003'];
 const load=(index=0)=>{const script=document.createElement('script');script.src=sources[index];
 script.onload=()=>{if(index+1<sources.length){load(index+1);return;}const family=(korean?window.TALKTAG_VOCALCAMP_KOREAN:window.TALKTAG_VOCALCAMP)?.families.find(item=>item.number===number),data=korean?family?.levelsData?.[level]:family?.levels[level];if(!data){app.textContent='자료를 찾을 수 없습니다.';return;}
 window.TalkTagVocalPilots=[{id:'family-'+number+'-'+level,familyNumber:number,level,title:family.title,fullText:data.lines,translation:data.translation||[],storyFlow:family.storyFlow||['시작','변화','선택','결과'],note:'같은 이야기를 Story Camp에서 기억으로 다시 구성해 보세요.',mission:data.status==='audio-pending'?'음원 준비 중':'소리부터 내 이야기로',audioStatus:data.status,audioSteps:data.audioSteps,audioCue:family.audioCue}];
 const engine=document.createElement('script');engine.src='vocalcamp-player.js?v=20261014-script-language-v1';document.head.appendChild(engine);};
 script.onerror=()=>app.textContent='자료를 불러오지 못했습니다.';document.head.appendChild(script);};load();
})();
