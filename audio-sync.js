(function () {
  "use strict";

  var id = new URLSearchParams(location.search).get("id");
  if (!id && (window.TalkTagN4AudioLessons || []).length) id = window.TalkTagN4AudioLessons[0].id;
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
        language: "ja"
      };
    }
  }
  if (!data || !data.cues.length) return;

  var audio = document.getElementById("audio");
  var isJapanese = data.language === "ja";
  var displayLevel = 0;
  var displayLabels = ["한자", "한자와 후리가나", "한자와 후리가나와 한국어 해석"];

  var enabled = isJapanese;
  var active = -1;
  var section = document.createElement("section");
  section.className = isJapanese ? "sync-pilot sync-pilot-always-open" : "sync-pilot";
  if (isJapanese) {
    section.innerHTML = '<div class="sync-display-control" data-level="0"><div class="sync-display-labels" aria-hidden="true"><span>한자</span><span>+ 후리가나</span><span>+ 한국어</span></div><input class="sync-display-range" id="syncDisplayLevel" type="range" min="0" max="2" step="1" value="0" aria-label="스크립트 표시 단계" aria-valuetext="한자"></div><p class="sync-status" role="status" aria-live="polite"></p><div class="sync-lines hide-reading hide-ko" aria-label="재생 위치와 항상 동기화된 문장별 스크립트"></div>';
  } else {
    section.innerHTML = '<h2>재생 스크립트</h2><p>재생 중인 문장이 자동으로 강조됩니다. 문장을 누르면 그 위치부터 다시 들을 수 있습니다.</p><button class="sync-enable" type="button" aria-expanded="false" aria-controls="syncContent">스크립트 싱크 열기</button><div id="syncContent" hidden><div class="sync-toolbar"><button type="button" id="syncPlay">▶ 재생</button><label><input type="checkbox" id="syncFollow" checked> 자동 따라가기</label><label><input type="checkbox" id="syncKorean"> 한국어 해석</label></div><p class="sync-status" role="status" aria-live="polite"></p><div class="sync-lines hide-ko" aria-label="재생 위치와 동기화된 문장별 스크립트"></div></div>';
  }
  document.querySelector(".player-shell").after(section);

  var content = section.querySelector("#syncContent");
  var toggle = section.querySelector(".sync-enable");
  var lines = section.querySelector(".sync-lines");
  var follow = section.querySelector("#syncFollow");
  var play = section.querySelector("#syncPlay");
  var status = section.querySelector(".sync-status");
  var displayControl = section.querySelector(".sync-display-control");
  var displayRange = section.querySelector("#syncDisplayLevel");
  var buttons = [];

  function setDisplayLevel(level) {
    displayLevel = Math.max(0, Math.min(2, Number(level) || 0));
    lines.classList.toggle("hide-reading", displayLevel < 1);
    lines.classList.toggle("hide-ko", displayLevel < 2);
    if (displayRange) {
      displayRange.value = String(displayLevel);
      displayRange.setAttribute("aria-valuetext", displayLabels[displayLevel]);
    }
    if (displayControl) displayControl.setAttribute("data-level", String(displayLevel));
  }

  function seekTo(index) {
    var cue = data.cues.find(function (item) { return item.i === index; });
    if (!cue) return;
    function seek() {
      audio.dispatchEvent(new Event("talktag-audio-seek"));
      audio.currentTime = cue.s;
      update();
    }
    if (audio.readyState >= 1) seek();
    else audio.addEventListener("loadedmetadata", seek, { once: true });
    audio.play().catch(function () { if (play) play.textContent = "▶ 다시 재생"; });
  }

  function buildLines() {
    if (buttons.length) return;
    data.lines.forEach(function (line, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sync-line";
      button.setAttribute("aria-label", (index + 1) + "번 문장부터 재생: " + String(line.en || "").normalize("NFKC"));
      var primary = document.createElement("span");
      if (data.language) primary.lang = data.language;
      primary.textContent = String(line.en || "").normalize("NFKC");
      button.append(primary);
      if (line.reading) {
        var reading = document.createElement("span");
        reading.className = "sync-reading";
        reading.lang = "ja";
        reading.textContent = String(line.reading || "").normalize("NFKC");
        button.append(reading);
      }
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
    var low = 0;
    var high = data.cues.length - 1;
    var found = -1;
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
    if (index >= 0 && (!follow || follow.checked)) {
      var item = buttons[index].getBoundingClientRect();
      var box = lines.getBoundingClientRect();
      if (item.top < box.top || item.bottom > box.bottom) {
        lines.scrollTop += item.top - box.top - (box.height - item.height) / 2;
      }
    }
  }

  if (isJapanese) {
    buildLines();
    setDisplayLevel(displayLevel);
    update();
    displayRange.addEventListener("input", function () { setDisplayLevel(displayRange.value); });
    displayRange.addEventListener("change", function () { setDisplayLevel(displayRange.value); });
  } else {
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
  }

  ["timeupdate", "seeked", "loadedmetadata", "ended"].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener("play", function () {
    if (play) play.textContent = "❚❚ 일시정지";
    if (!isJapanese && !enabled) {
      enabled = true;
      content.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "스크립트 싱크 닫기";
      buildLines();
      active = -1;
      update();
    }
  });
  audio.addEventListener("pause", function () { if (play) play.textContent = "▶ 재생"; });
  if (play) {
    play.addEventListener("click", function () {
      if (audio.paused) audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
      else audio.pause();
    });
  }
  var koreanToggle = section.querySelector("#syncKorean");
  if (koreanToggle) {
    koreanToggle.addEventListener("change", function (event) {
      lines.classList.toggle("hide-ko", !event.target.checked);
      active = -1;
      update();
    });
  }
  if (follow) follow.addEventListener("change", function () { active = -1; update(); });
})();
