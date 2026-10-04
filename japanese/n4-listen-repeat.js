(function () {
"use strict";
var files = ["0110 JLPT(Tsuki).mp3","1120 JLPT(Tsuki).mp3","2130 JLPT(Tsuki).mp3","3140 JLPT(Tsuki).mp3","4150 JLPT(Tsuki).mp3","5160 JLPT(Sky).mp3","JLPT(Sky) 6170.mp3","JLPT(Sky) 7180.mp3","JLPT(Sky) 8190.mp3","JLPT(Sky) 91100.mp3"];
var audio = document.getElementById("n4Audio");
var status = document.getElementById("audioStatus");
var list = document.getElementById("trackList");
var speed = document.getElementById("speed");
var base = "https://audio.talktag.co.kr/Japanese/test-preppers/jlpt/n4/listen-repeat/v1/";
document.getElementById("sourceNotice").textContent = "R2 스트리밍 연결 완료 · N4 1–100번 음원 10개";
function selectTrack(index) {
 audio.pause();
 audio.src = base + encodeURIComponent(files[index]);
 audio.playbackRate = Number(speed.value);
 document.getElementById("trackTitle").textContent = String(index + 1).padStart(2,"0") + " · " + (index * 10 + 1) + "–" + ((index + 1) * 10) + "번";
 list.querySelectorAll("button").forEach(function(button,i) { button.setAttribute("aria-pressed", String(i === index)); });
 status.textContent = "음원을 선택했습니다. 재생 버튼을 눌러 주세요.";
}
files.forEach(function(file,index) {
 var button = document.createElement("button");
 button.className = "ja-card n4-track";
 button.type = "button";
 button.textContent = String(index + 1).padStart(2,"0") + " · " + (index * 10 + 1) + "–" + ((index + 1) * 10) + "번 · " + (index < 5 ? "Tsuki" : "Sky");
 button.addEventListener("click",function() { selectTrack(index); });
 list.appendChild(button);
});
document.getElementById("backTen").onclick = function() { if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0,audio.currentTime - 10); };
document.getElementById("restart").onclick = function() { if (Number.isFinite(audio.duration)) audio.currentTime = 0; };
document.getElementById("repeat").onclick = function() { audio.loop = !audio.loop; this.setAttribute("aria-pressed",String(audio.loop)); this.textContent = audio.loop ? "반복 켜짐" : "반복 꺼짐"; };
speed.onchange = function() { audio.playbackRate = Number(speed.value); };
audio.addEventListener("error",function() { status.textContent = "음원을 불러오지 못했습니다. 다른 음원을 선택하거나 페이지를 새로고침해 주세요."; });
audio.addEventListener("playing",function() { status.textContent = "재생 중"; });
audio.addEventListener("ended",function() { status.textContent = "학습을 마쳤습니다. 다시 듣거나 다음 음원을 선택하세요."; });
selectTrack(0);
})();
