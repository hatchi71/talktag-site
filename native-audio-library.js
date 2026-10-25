(function () {
"use strict";
var native=window.TalkTagNative;
var english=native&&native.ui==="en";
var japanese=native&&native.language==="ja";
var params=new URLSearchParams(location.search),type=params.get("type")==="plain"?"plain":"guided";
var level=(params.get("level")||"").toUpperCase();
if(!["A0","A1","A2","B1","B2","C1","C2"].includes(level))level="";
var name=japanese?(type==="guided"?"듣고 따라 말하기":"오디오 에세이와 아티클"):(type==="guided"?"Guided Listen & Repeat":"Essays & Articles");
var catalog=(window.TalkTagAudioLessons||[]).filter(l=>l.type===type&&(l.available!==false||(type==="plain"&&l.previewAvailable)));
var list=document.getElementById("lessonList"),shelf=document.getElementById("audioMissionList"),toggle=document.getElementById("audioMissionsToggle");
var missionLevels=["A0","A1","A2","B1","B2","C1","C2"],arrivingMission="",openMissionLevel="";
document.body.dataset.audioType=type;
document.body.dataset.audioView=level?"lessons":"levels";
var cefrGuide=document.getElementById("cefrGuide");
if(cefrGuide)cefrGuide.hidden=Boolean(level);
document.title=name+(level?" · "+level:"")+" · TalkTag";
document.getElementById("libraryEyebrow").textContent=japanese?"사운드 체크":"SOUND CHECK";
document.getElementById("libraryTitle").textContent=name+(level?" · "+(level==="A0"?"Start Here · Level 0":level):"");
document.getElementById("libraryDescription").textContent=level?(type==="guided"?(level==="A0"?(english?"See one useful expression, listen and say it five times, then respond.":"그림을 보며 한 가지 유용한 표현을 5회 듣고 말한 뒤 직접 답해 보세요."):(english?"Repeat each sentence " + (/^C[12]$/.test(level) ? 21 : (/^B[12]$/.test(level) ? 15 : 10)) + " times · listen and speak along.":"문장별 " + (/^C[12]$/.test(level) ? 21 : (/^B[12]$/.test(level) ? 15 : 10)) + "회 반복 · 듣고 따라하세요.")):(english?"Listen, make notes, then retell the key idea in your own Korean.":"듣고, 노트에 정리한 뒤 내 말로 이야기하세요.")):(english&&type==="guided"?"Hear a useful expression, say it, then use it in a real moment.":(english?"Choose your practice level.":"훈련할 레벨을 선택하세요."));
document.querySelector(".type-switch").hidden=true;
document.getElementById("essayGuide").hidden=type!=="plain"||Boolean(level);
var levelPicker=document.querySelector(".filter-bar");
levelPicker.classList.add("tt-level-cards");
if(!level){
  var missions=toggle.closest(".audio-missions");
  levelPicker.after(missions);
  if(type==="plain")missions.after(document.getElementById("essayGuide"));
}
document.getElementById("audioMissionScope").textContent=japanese?(type==="guided"?"듣고 따라 말하기":"오디오 에세이와 아티클"):(type==="guided"?"Guided L&R":"Essays");
levelPicker.hidden=Boolean(level);
var levelZeroLink=document.querySelector('.filter-bar [data-level="A0"]');
if(levelZeroLink)levelZeroLink.hidden=type!=="guided"||!catalog.some(l=>l.level==="A0");
document.querySelectorAll("[data-level]").forEach(a=>a.href=native.libraryPage+"?type="+type+"&level="+a.dataset.level);
if(level){var change=document.createElement("a");change.className="audio-change-level";change.href=native.libraryPage+"?type="+type;change.textContent="← 레벨 선택";document.querySelector(".catalog-head").append(change);}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function done(l){return l.available!==false&&window.TalkTagCompletion.getManual("audio:"+l.id,"talktag-audio:"+l.id);}
function url(l){return (l.available===false?native.playerPage:native.playerPage)+"?id="+encodeURIComponent(l.id);}
function number(l){return String(l.unit||catalog.filter(x=>x.level===l.level).indexOf(l)+1).padStart(2,"0")+(l.partIndex?"–"+String(l.partIndex).padStart(2,"0"):"");}
function render(){
var summary=document.getElementById("guidedProgressSummary");
if(!summary){summary=document.createElement("div");summary.id="guidedProgressSummary";summary.className="guided-progress-summary";document.querySelector(".filter-bar").before(summary);}
summary.hidden=Boolean(level);summary.innerHTML=english?'<h2>Choose your level</h2><span>Completed '+catalog.filter(done).length+'/'+catalog.filter(l=>l.available!==false).length+'</span>':'<h2>레벨을 선택하세요</h2><span>완료 '+catalog.filter(done).length+'/'+catalog.filter(l=>l.available!==false).length+'</span>';
document.querySelectorAll("[data-level]").forEach(a=>{
var lessons=catalog.filter(l=>l.level===a.dataset.level&&l.available!==false);
var count=lessons.filter(done).length;
var complete=lessons.length>0&&count===lessons.length;
a.classList.toggle("is-level-complete",complete);
a.innerHTML='<span>'+esc(a.dataset.level==="A0"?"Start Here · Level 0":a.dataset.level)+'</span><small class="guided-level-count">'+(complete?'✓ ':'완료 ')+count+'/'+lessons.length+'</small><span class="guided-level-meter" aria-hidden="true"><span style="width:'+(lessons.length?count/lessons.length*100:0)+'%"></span></span>';
a.setAttribute("aria-label",a.dataset.level+" · "+lessons.length+"개 중 "+count+"개 완료 · 레벨 열기");
});
var active=catalog.filter(l=>l.level===level&&!done(l));
list.hidden=!level;
list.innerHTML=!level?"":active.map(l=>'<article class="lesson-card" '+(l.available===false?'data-content-draft="true"':'data-completion-manual-only="true"')+' data-completion-id="audio:'+esc(l.id)+'" data-completion-legacy-key="talktag-audio:'+esc(l.id)+'"><a class="audio-lesson-open'+((type==="plain"||l.format==="level0")&&l.artwork?' has-essay-artwork':'')+'" href="'+url(l)+'"><span class="audio-lesson-number">'+number(l)+'</span><div class="lesson-copy"><h2>'+esc(l.title)+'</h2><p>'+esc(l.description)+'</p><div class="lesson-meta"><span>'+esc(l.durationLabel)+'</span><span>'+(l.format==="level0"?(english?"Start Here · listen and say it 5 times":"Start Here · 5회 듣고 말하기"):(type==="guided"?'문장별 '+l.training.defaultReps+'회 반복':(l.available===false?'스크립트 미리보기':'Listen · Summarize · Retell')))+'</span></div></div>'+((type==="plain"||l.format==="level0")&&l.artwork?'<img class="essay-cover-thumb" src="'+esc(l.artwork)+'" alt="'+esc(l.artworkAlt)+'" width="720" height="480" loading="lazy">':'')+'<span class="audio-lesson-arrow" aria-hidden="true">↗</span></a><div class="lesson-card-actions" data-completion-actions><a class="audio-start-button" href="'+url(l)+'" aria-label="'+(l.available===false?'Preview ':'Start ')+esc(l.title)+'">'+(l.available===false?'PREVIEW':'START')+' <span aria-hidden="true">→</span></a></div></article>').join("")||(level?'<p class="audio-empty">'+(catalog.some(l=>l.level===level)?'이 레벨의 미션을 모두 완료했습니다. 아래에서 다시 열거나 완료를 취소할 수 있습니다.':'새로운 음원을 준비하고 있습니다.')+'</p>':"");
list.querySelectorAll('[data-content-draft]').forEach(card=>{card.removeAttribute('data-completion-id');card.removeAttribute('data-completion-legacy-key');});
window.TalkTagCompletion.mount(list);
var completed=catalog.filter(done);
document.getElementById("audioMissionCount").textContent=String(completed.length);
var previouslyOpen=new Set([...shelf.querySelectorAll(".audio-mission-bin[open]")].map(bin=>bin.dataset.level));
var firstBins=!shelf.dataset.binsReady;
var firstCompletedLevel=missionLevels.find(binLevel=>completed.some(l=>l.level===binLevel));
if(firstBins&&completed.length){toggle.setAttribute("aria-expanded","true");shelf.hidden=false;}
shelf.innerHTML='<p class="audio-mission-bin-intro">'+(english?'Completed cards are kept by level. Reopen a card or undo completion.':'완료한 카드는 레벨별 보관함에서 다시 열거나 완료를 취소할 수 있습니다.')+'</p>'+missionLevels.map(binLevel=>{
var items=completed.filter(l=>l.level===binLevel);
var open=previouslyOpen.has(binLevel)||openMissionLevel===binLevel||(firstBins&&items.length&&(binLevel===level||binLevel===firstCompletedLevel));
return '<details class="audio-mission-bin" data-level="'+binLevel+'"'+(open?' open':'')+'><summary><strong>'+binLevel+'</strong><span>'+items.length+(english?' completed':'개 완료')+'</span><i aria-hidden="true">⌄</i></summary><div class="audio-mission-bin-list">'+(items.length?items.map(l=>'<div class="audio-mission-row'+(arrivingMission===l.id?' is-arriving':'')+'"><a href="'+url(l)+'"><small>'+number(l)+'</small><strong>'+esc(l.title)+'</strong></a><button type="button" data-undo="'+esc(l.id)+'" aria-label="'+esc(l.title)+(english?' undo completion':' 완료 취소')+'">'+(english?'Undo':'완료 취소')+'</button></div>').join(''):'<p class="audio-mission-bin-empty">'+(english?'No completed cards yet.':'아직 완료한 카드가 없습니다.')+'</p>')+'</div></details>';
}).join('');
shelf.dataset.binsReady="true";arrivingMission="";openMissionLevel="";
}
toggle.addEventListener("click",()=>{var open=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(open));shelf.hidden=!open;});
shelf.addEventListener("click",event=>{var button=event.target.closest("[data-undo]");if(!button)return;var l=catalog.find(x=>x.id===button.dataset.undo);if(!l)return;window.TalkTagCompletion.set("audio:"+l.id,false,"talktag-audio:"+l.id);document.getElementById("audioMissionNotice").textContent=l.level+" · "+number(l)+" 완료를 취소했습니다."; (shelf.querySelector("button")||toggle).focus();});
window.addEventListener("talktag:completion-change",event=>{var changed=catalog.find(l=>"audio:"+l.id===event.detail.id);if(changed){if(event.detail.completed){arrivingMission=changed.id;openMissionLevel=changed.level;toggle.setAttribute("aria-expanded","true");shelf.hidden=false;}render();document.getElementById("audioMissionNotice").textContent=event.detail.completed?(english?"Saved to the "+changed.level+" bin.":changed.level+" 보관함에 담았습니다."):(english?"Returned to its original list.":"원래 목록으로 되돌렸습니다.");if(event.detail.completed)shelf.querySelector('.audio-mission-bin[data-level="'+changed.level+'"] summary')?.focus({preventScroll:true});}});
window.addEventListener("storage",render);
window.addEventListener("pageshow",render);
render();
})();
