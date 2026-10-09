(function(){
 'use strict';
 const audio=document.getElementById('audio'),wave=document.getElementById('wave'),play=document.getElementById('playButton');
 if(!audio||!wave)return;
 const id=new URLSearchParams(location.search).get('id');
 const lesson=(window.TalkTagAudioLessons||[]).find(l=>l.id===id);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 wave.querySelectorAll('i').forEach((bar,i)=>{bar.style.setProperty('--wave-duration',(1.25+(i%7)*.12)+'s');bar.style.setProperty('--wave-delay',(-i*.17)+'s');});
 function update(){
   let state='still';
   if(!reduced.matches&&!document.hidden&&!audio.paused&&!audio.ended&&!audio.seeking&&audio.readyState>=3){
     state='speech';
     const cue=lesson?.training?.cues?.find(c=>c.s<=audio.currentTime&&audio.currentTime<c.e);
     if(cue&&audio.currentTime>=cue.voiceEnd)state='recall';
   }
   if(wave.dataset.motion!==state)wave.dataset.motion=state;
   if(play){const playing=!audio.paused&&!audio.ended;play.textContent=playing?'❚❚ 일시정지':'▶ 재생';play.setAttribute('aria-label',playing?'일시정지':'재생');}
 }
 ['playing','play','pause','ended','timeupdate','seeked','seeking','waiting','canplay','error'].forEach(e=>audio.addEventListener(e,update));
 document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);update();
})();
