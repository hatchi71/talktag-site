(function () {
  "use strict";
var native=window.TalkTagNative;

  var id = new URLSearchParams(location.search).get("id");
  if (!id && (window.TalkTagN4AudioLessons || []).length) id = window.TalkTagN4AudioLessons[0].id;
  var data = (window.TalkTagAudioSync || {})[id] || (window.TalkTagEssayMedia || {})[id]?.sync;
  var guided = (window.TalkTagAudioLessons || []).find(function (item) { return item.id === id && item.training; });
  if (guided) {
    data = {lines:guided.expressions.map(function (line,index) { return {en:line,ko:guided.meanings[index]||""}; }),cues:guided.training.cues,language:"en"};
  }
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
    section.classList.add("unified-sync");
    section.hidden=true;
    section.id="unifiedScript";
    section.innerHTML = '<div id="syncContent" hidden><div class="sync-toolbar"><label><input type="checkbox" id="syncFollow" checked> 현재 문장 따라가기</label></div><p class="sync-status" role="status" aria-live="polite"></p><div class="sync-lines hide-ko" aria-label="재생 위치와 동기화된 영어와 한국어 스크립트"></div></div>';
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
    var mode="";
    var enButton=document.getElementById("scriptButton"),krButton=document.getElementById("meaningButton"),hideButton=document.getElementById("scriptHiddenButton");
    enButton.textContent=hideButton?"EN":"EN · 스크립트";krButton.textContent=hideButton?"EN+KR":"KR · 한글 해석";
    [enButton,krButton].forEach(function(button){button.setAttribute("aria-controls","unifiedScript");button.setAttribute("aria-expanded","false");});
    document.getElementById("scriptPanel")?.remove();document.getElementById("meaningPanel")?.remove();
    window.TalkTagAudioScript={show:function(requested){
      enabled=hideButton?requested!=="hidden":!(enabled&&mode===requested);mode=requested;
      section.hidden=!enabled;
      content.hidden = !enabled;
      lines.classList.toggle("hide-ko",requested!=="kr");
      enButton.setAttribute("aria-expanded",String(enabled&&mode==="en"));krButton.setAttribute("aria-expanded",String(enabled&&mode==="kr"));
      enButton.classList.toggle("active",enabled&&mode==="en");krButton.classList.toggle("active",enabled&&mode==="kr");
      if(hideButton){hideButton.setAttribute("aria-pressed",String(!enabled));enButton.setAttribute("aria-pressed",String(enabled&&mode==="en"));krButton.setAttribute("aria-pressed",String(enabled&&mode==="kr"));}
      if (enabled) { buildLines(); active = -1; update(); }
      else {
        buttons.forEach(function (button) { button.classList.remove("active"); button.removeAttribute("aria-current"); });
        active = -1;
      }
      if(enabled)section.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    }};
  }

  ["timeupdate", "seeked", "loadedmetadata", "ended"].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener("play", function () {
    if (play) play.textContent = "❚❚ 일시정지";
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
