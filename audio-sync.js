(function () {
  "use strict";
  var id = new URLSearchParams(location.search).get("id");
  var data = (window.TalkTagAudioSync || {})[id];
  if (!data && (window.TalkTagN4AudioSync || {})[id]) {
    var lesson = (window.TalkTagN4AudioLessons || []).find(function (item) { return item.id === id; });
    var timing = window.TalkTagN4AudioSync[id];
    if (lesson) {
      var first = (lesson.order - 1) * 10 + 1;
      data = {
        lines: (window.TalkTagN4Scripts || []).filter(function (item) {
          return item.number >= first && item.number < first + 10;
        }).map(function (item) {
          return { en: item.script, reading: item.reading, ko: item.translation };
        }),
        cues: timing.cues,
        language: "ja",
        repetitions: timing.repetitions
      };
    }
  }
  if (!data || !data.cues.length) return;
  var audio = document.getElementById("audio");
  var isJapanese = data.language === "ja";
  var readingVisible = false;
  if (isJapanese) {
    try { readingVisible = localStorage.getItem("talktag-japanese:show-reading") === "true"; } catch (error) {}
  }
  var enabled = false;
  var active = -1;
  var section = document.createElement("section");
  section.className = "sync-pilot";
  section.innerHTML = '<h2>재생 스크립트</h2><p>재생 중인 문장이 자동으로 강조됩니다. 문장을 누르면 그 위치부터 다시 들을 수 있습니다.</p><button class="sync-enable" type="button" aria-expanded="false" aria-controls="syncContent">스크립트 싱크 열기</button><div id="syncContent" hidden><div class="sync-toolbar"><button type="button" id="syncPlay">▶ 재생</button><label><input type="checkbox" id="syncFollow" checked> 자동 따라가기</label><label><input type="checkbox" id="syncKorean"> 한국어 해석</label></div><p class="sync-status" role="status" aria-live="polite"></p><div class="sync-lines hide-ko" aria-label="재생 위치와 동기화된 문장별 스크립트"></div></div>';
  document.querySelector(".player-shell").after(section);
  var content = section.querySelector("#syncContent");
  var toggle = section.querySelector(".sync-enable");
  var lines = section.querySelector(".sync-lines");
  if (isJapanese) lines.classList.toggle("hide-reading", !readingVisible);
  var follow = section.querySelector("#syncFollow");
  var play = section.querySelector("#syncPlay");
  var status = section.querySelector(".sync-status");
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
      button.setAttribute("aria-label", (index + 1) + "번 문장부터 재생: " + String(line.en || "").normalize("NFKC"));
      var english = document.createElement("span");
      if (data.language) english.lang = data.language;
      english.textContent = String(line.en || "").normalize("NFKC");
      if (line.reading) {
        var reading = document.createElement("span");
        reading.className = "sync-reading";
        reading.lang = "ja";
        reading.textContent = String(line.reading || "").normalize("NFKC");
        button.append(english, reading);
      } else button.append(english);
      var korean = document.createElement("span");
      korean.className = "sync-ko";
      korean.textContent = (data.translationContext === "paragraph" ? "문단 해석 · " : "") + (line.ko || "");
      button.append(korean);
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
    var index = !audio.ended && found >= 0 ? data.cues[found].i : -1;
    if (index === active) return;
    active = index;
    status.textContent = index >= 0 ? "현재 문장 " + (index + 1) + " / " + buttons.length : "";
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
    toggle.textContent = enabled ? "스크립트 싱크 닫기" : "스크립트 싱크 열기";
    if (enabled) { buildLines(); active = -1; update(); }
    else {
      buttons.forEach(function (button) { button.classList.remove("active"); button.removeAttribute("aria-current"); });
      active = -1;
    }
  });
  ["timeupdate", "seeked", "loadedmetadata", "ended"].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener("play", function () {
    play.textContent = "❚❚ 일시정지";
    if (!enabled) {
      enabled = true;
      content.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "스크립트 싱크 닫기";
      buildLines();
      active = -1;
      update();
    }
  });
  audio.addEventListener("pause", function () { play.textContent = "▶ 재생"; });
  play.addEventListener("click", function () {
    if (audio.paused) audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
    else audio.pause();
  });
  section.querySelector("#syncKorean").addEventListener("change", function (event) {
    lines.classList.toggle("hide-ko", !event.target.checked);
    active = -1; update();
  });
  if (isJapanese) {
    window.addEventListener("talktag-japanese-reading-change", function (event) {
      readingVisible = Boolean(event.detail && event.detail.visible);
      lines.classList.toggle("hide-reading", !readingVisible);
      active = -1;
      update();
    });
  }
  follow.addEventListener("change", function () { active = -1; update(); });
})();
