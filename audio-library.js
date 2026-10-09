(function () {
"use strict";
var params=new URLSearchParams(location.search),type=params.get("type")==="plain"?"plain":"guided";
var level=(params.get("level")||"").toUpperCase();
if(!["A1","A2","B1","B2","C1","C2"].includes(level))level="";
var name=type==="guided"?"Guided Listen & Repeat":"Essays & Articles";
var catalog=(window.TalkTagAudioLessons||[]).filter(l=>l.available!==false&&l.type===type);
var list=document.getElementById("lessonList"),shelf=document.getElementById("audioMissionList"),toggle=document.getElementById("audioMissionsToggle");
document.body.dataset.audioType=type;
document.body.dataset.audioView=level?"lessons":"levels";
document.title=name+(level?" · "+level:"")+" · TalkTag";
document.getElementById("libraryEyebrow").textContent="SOUND CHECK";
document.getElementById("libraryTitle").textContent=name+(level?" · "+level:"");
document.getElementById("libraryDescription").textContent=level?(type==="guided"?"문장별 10회 반복 · 듣고 따라하세요.":"듣고, 기억하고, 내 말로 이야기하세요."):"훈련할 레벨을 선택하세요.";
document.querySelector(".type-switch").hidden=true;
document.getElementById("essayGuide").hidden=type!=="plain"||!level;
document.getElementById("audioMissionScope").textContent=type==="guided"?"Guided L&R":"Essays";
document.querySelector(".filter-bar").hidden=Boolean(level);
document.querySelectorAll("[data-level]").forEach(a=>a.href="audio-library.html?type="+type+"&level="+a.dataset.level);
if(level){var change=document.createElement("a");change.className="audio-change-level";change.href="audio-library.html?type="+type;change.textContent="← 레벨 선택";document.querySelector(".catalog-head").append(change);}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function done(l){return window.TalkTagCompletion.getManual("audio:"+l.id,"talktag-audio:"+l.id);}
function url(l){return "audio-player.html?id="+encodeURIComponent(l.id);}
function number(l){return String(l.unit||catalog.filter(x=>x.level===l.level).indexOf(l)+1).padStart(2,"0");}
function render(){
var active=catalog.filter(l=>l.level===level&&!done(l));
list.hidden=!level;
list.innerHTML=!level?"":active.map(l=>'<article class="lesson-card" data-completion-manual-only="true" data-completion-id="audio:'+esc(l.id)+'" data-completion-legacy-key="talktag-audio:'+esc(l.id)+'"><a class="audio-lesson-open" href="'+url(l)+'"><span class="audio-lesson-number">'+number(l)+'</span><div class="lesson-copy"><h2>'+esc(l.title)+'</h2><p>'+esc(l.description)+'</p><div class="lesson-meta"><span>'+esc(l.durationLabel)+'</span><span>'+(type==="guided"?'문장별 10회 반복':'Listen · Rebuild · Tell')+'</span></div></div><span class="audio-lesson-arrow" aria-hidden="true">↗</span></a><div class="lesson-card-actions" data-completion-actions></div></article>').join("")||(level?'<p class="audio-empty">'+(catalog.some(l=>l.level===level)?'이 레벨의 미션을 모두 완료했습니다. 아래에서 다시 열거나 완료를 취소할 수 있습니다.':'새로운 음원을 준비하고 있습니다.')+'</p>':"");
window.TalkTagCompletion.mount(list);
var completed=catalog.filter(done);
document.getElementById("audioMissionCount").textContent=String(completed.length);
shelf.innerHTML=completed.length?completed.map(l=>'<div class="audio-mission-row"><a href="'+url(l)+'"><small>'+esc(l.level)+' · '+number(l)+'</small><strong>'+esc(l.title)+'</strong></a><button type="button" data-undo="'+esc(l.id)+'" aria-label="'+esc(l.title)+' 완료 취소">완료 취소</button></div>').join(""):'<p class="audio-empty">직접 완료한 미션이 이곳에 모입니다.</p>';
}
toggle.addEventListener("click",()=>{var open=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(open));shelf.hidden=!open;});
shelf.addEventListener("click",event=>{var button=event.target.closest("[data-undo]");if(!button)return;var l=catalog.find(x=>x.id===button.dataset.undo);if(!l)return;window.TalkTagCompletion.set("audio:"+l.id,false,"talktag-audio:"+l.id);document.getElementById("audioMissionNotice").textContent=l.level+" · "+number(l)+" 완료를 취소했습니다."; (shelf.querySelector("button")||toggle).focus();});
window.addEventListener("talktag:completion-change",event=>{if(catalog.some(l=>"audio:"+l.id===event.detail.id)){render();document.getElementById("audioMissionNotice").textContent=event.detail.completed?"완료한 미션에 보관했습니다.":"원래 목록으로 되돌렸습니다.";if(event.detail.completed)toggle.focus({preventScroll:true});}});
window.addEventListener("storage",render);
window.addEventListener("pageshow",render);
render();
})();
