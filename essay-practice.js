(function(){
 "use strict";
 function notice(){return '<article class="essay-ai-notice" aria-label="향후 기능 안내"><h3>AI Chat <span class="essay-badge">준비 중</span></h3><p>내 말로 정리한 이야기를 AI와 나누고, 질문과 피드백으로 대화를 이어가세요.</p><p>향후 Prime 회원에게 제공될 예정입니다.</p></article>';}
 window.TalkTagEssayNotice=notice;
 var lesson=(window.TalkTagAudioLessons||[]).find(l=>l.id===new URLSearchParams(location.search).get("id")&&l.type==="plain"&&l.available!==false);
 var audio=document.getElementById("audio");if(!lesson||!audio)return;
 var section=document.createElement("section");section.className="essay-practice";section.id="essayAfterListening";section.hidden=true;
 section.innerHTML='<h2>이제, 내 말로 이야기해 보세요.</h2><div class="essay-practice-grid"><article class="essay-practice-step"><small>02 · SUMMARIZE</small><h3>노트에 정리하기</h3><p>스크립트를 보지 않고, 이해하고 기억한 내용을 노트에 짧게 적어 보세요.</p></article><article class="essay-practice-step"><small>03 · RETELL</small><h3>기억해서 말하기</h3><p>노트를 덮고, 자신이나 파트너에게 내 말로 이야기해 보세요.</p></article></div>'+notice();
 if(lesson.referenceSummary){var help=document.createElement("details");var heading=document.createElement("summary");heading.textContent="필요할 때만 · 요약 예시";var body=document.createElement("div");body.textContent=lesson.referenceSummary;help.append(heading,body);section.append(help);}
 var player=document.querySelector(".player-shell");player.after(section);
 var open=document.createElement("button");open.type="button";open.className="essay-practice-open";open.textContent="듣기 후 연습";open.setAttribute("aria-expanded","false");open.setAttribute("aria-controls",section.id);document.querySelector(".player-card").append(open);
 function show(){section.hidden=false;open.setAttribute("aria-expanded","true");}
 open.addEventListener("click",()=>{section.hidden=!section.hidden;open.setAttribute("aria-expanded",String(!section.hidden));});
 audio.addEventListener("ended",()=>{if(!audio.loop)show();});
})();
