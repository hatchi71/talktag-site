(function () {
  "use strict";
  var id = new URLSearchParams(location.search).get("id");
  var data = (window.TalkTagAudioSync || {})[id];
  if (!data || !data.cues.length) return;
  var audio = document.getElementById("audio");
  var enabled = false;
  var active = -1;
  var section = document.createElement("section");
  section.className = "sync-pilot";
  section.innerHTML = '<h2>먼저 듣고, 내 말로 이야기하세요.</h2><p>스크립트 없이 듣고 내용을 떠올려 보세요. 필요할 때만 싱크를 켜서 확인하세요.</p><button class="sync-enable" type="button" aria-expanded="false" aria-controls="syncContent">스크립트 싱크 켜기</button><div id="syncContent" hidden><div class="sync-toolbar"><button type="button" id="syncPlay">▶ 재생</button><label><input type="checkbox" id="syncFollow" checked> 자동 따라가기</label><label><input type="checkbox" id="syncKorean"> 한국어 해석</label></div><div class="sync-lines hide-ko" aria-label="문장별 스크립트"></div></div>';
  document.querySelector(".player-shell").after(section);
  var content = section.querySelector("#syncContent");
  var toggle = section.querySelector(".sync-enable");
  var lines = section.querySelector(".sync-lines");
  var follow = section.querySelector("#syncFollow");
  var play = section.querySelector("#syncPlay");
  var buttons = [];
  function seekTo(index) {
    var cue = data.cues.find(function (item) { return item.i === index; });
    if (!cue) return;
    function seek() {
      audio.dispatchEvent(new Event("talktag-audio-seek"));
      audio.currentTime = cue.s;
      update();
    }
    if (audio.readyState >= 1) seek();
    else audio.addEventListener("loadedmetadata", seek, {once:true});
    audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
  }
  function buildLines() {
    if (buttons.length) return;
    data.lines.forEach(function (line, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sync-line";
      button.setAttribute("aria-label", (index + 1) + "번 문장부터 재생: " + line.en);
      var english = document.createElement("span");
      english.textContent = line.en;
      var korean = document.createElement("span");
      korean.className = "sync-ko";
      korean.textContent = (data.translationContext === "paragraph" ? "문단 해석 · " : "") + (line.ko || "");
      button.append(english, korean);
      button.addEventListener("click", function () { if (enabled) seekTo(index); });
      lines.appendChild(button);
      buttons.push(button);
    });
  }
  function update() {
    if (!enabled) return;
    var time = audio.currentTime;
    var low = 0, high = data.cues.length - 1, found = -1;
    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      if (data.cues[mid].s <= time) { found = mid; low = mid + 1; }
      else high = mid - 1;
    }
    var index = found >= 0 && time < data.cues[found].e ? data.cues[found].i : -1;
    if (index === active) return;
    active = index;
    buttons.forEach(function (button, i) {
      button.classList.toggle("active", i === index);
      if (i === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    if (index >= 0 && follow.checked) {
      var item = buttons[index].getBoundingClientRect();
      var box = lines.getBoundingClientRect();
      if (item.top < box.top || item.bottom > box.bottom) {
        lines.scrollTop += item.top - box.top - (box.height - item.height) / 2;
      }
    }
  }
  toggle.addEventListener("click", function () {
    enabled = !enabled;
    content.hidden = !enabled;
    toggle.setAttribute("aria-expanded", String(enabled));
    toggle.textContent = enabled ? "스크립트 싱크 끄기" : "스크립트 싱크 켜기";
    if (enabled) { buildLines(); active = -1; update(); }
    else {
      buttons.forEach(function (button) { button.classList.remove("active"); button.removeAttribute("aria-current"); });
      active = -1;
    }
  });
  ["timeupdate", "seeked", "loadedmetadata", "ended"].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener("play", function () { play.textContent = "❚❚ 일시정지"; });
  audio.addEventListener("pause", function () { play.textContent = "▶ 재생"; });
  play.addEventListener("click", function () {
    if (audio.paused) audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
    else audio.pause();
  });
  section.querySelector("#syncKorean").addEventListener("change", function (event) {
    lines.classList.toggle("hide-ko", !event.target.checked);
    active = -1; update();
  });
  follow.addEventListener("change", function () { active = -1; update(); });
})();
