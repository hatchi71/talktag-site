(function () {
  "use strict";
var native=window.TalkTagNative;
  var nativeJapanese = native?.language === "ja";
  // Reviewed readings for the original Japanese GLR 001 sentences. Longest match first.
  var rubyReadings = {"日本語":"にほんご","名前":"なまえ","何":"なん","私":"わたし","座":"すわ","一杯":"いっぱい","勉強":"べんきょう","話":"はな","一度":"いちど","願":"ねが","初":"はじ","来":"き","道":"みち","分":"わ","建物":"たてもの","三階":"さんがい","合":"あ","入口":"いりぐち","少":"すこ","待":"ま","着":"つ","今":"いま","前":"まえ","予約":"よやく","時間":"じかん","変":"か","急":"きゅう","用事":"ようじ","入":"はい","三十分":"さんじゅっぷん","遅":"おく","一時半":"いちじはん","変更":"へんこう","難":"むずか","明日":"あした","大丈夫":"だいじょうぶ","静":"しず","所":"ところ","遠":"とお","場所":"ばしょ","今日":"きょう","軽":"かる","会":"あ","聞":"き","意図":"いと","違":"ちが","誰":"だれ","悪":"わる","次":"つぎ","一緒":"いっしょ","考":"かんが","説明":"せつめい","足":"た","点":"てん","認":"みと","誤解":"ごかい","解":"と","思":"おも","気遣":"きづか","先回":"さきまわ","困":"こま","必要":"ひつよう","頼":"たの","見守":"みまも","助":"たす"};
  var rubyPattern = new RegExp(Object.keys(rubyReadings).sort((a,b)=>b.length-a.length).join("|"),"g");
  function renderJapanese(node,text) {
    var cursor=0;
    for(var match of text.matchAll(rubyPattern)){
      node.append(document.createTextNode(text.slice(cursor,match.index)));
      var ruby=document.createElement("ruby"),rt=document.createElement("rt");
      ruby.append(document.createTextNode(match[0]));rt.textContent=rubyReadings[match[0]];ruby.append(rt);node.append(ruby);cursor=match.index+match[0].length;
    }
    node.append(document.createTextNode(text.slice(cursor)));
  }

  var id = new URLSearchParams(location.search).get("id");
  if (!id && (window.TalkTagN4AudioLessons || []).length) id = window.TalkTagN4AudioLessons[0].id;
  var data = (window.TalkTagAudioSync || {})[id] || (window.TalkTagEssayMedia || {})[id]?.sync;
  var activeLesson = window.TalkTagActiveNativeLesson;
  var guided = activeLesson && activeLesson.id === id && activeLesson.training ? activeLesson :
    (window.TalkTagAudioLessons || []).find(function (item) { return item.id === id && item.training; });
  var multilingualPilot = native?.language === "ko" && guided?.type === "guided" &&
    Number(guided.unit) === 1 && Boolean(window.TalkTagKoreanGlr001Translations?.[guided.id]);
  var pilotTranslations = multilingualPilot ? window.TalkTagKoreanGlr001Translations[guided.id] : null;
  var supportLanguages = { en: "English", vi: "Tiếng Việt", ne: "नेपाली", km: "ខ្មែរ", my: "မြန်မာ", th: "ไทย" };
  var preferenceKey = "talktag:korean-glr:support-language";
  function savedSupportLanguage() {
    try { var stored = localStorage.getItem(preferenceKey); return supportLanguages[stored] ? stored : "en"; }
    catch (error) { return "en"; }
  }
  var supportLanguage = savedSupportLanguage();
  if (guided) {
    data = {lines:guided.expressions.map(function (line,index) { return {en:line,ko:guided.meanings[index]||"",speaker:guided.speakers?.[index]}; }),cues:guided.training.cues,language:native.language};
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
  if(nativeJapanese)section.querySelector('.sync-lines').setAttribute('aria-label','재생 위치와 동기화된 일본어 스크립트와 한글 해석');

  var content = section.querySelector("#syncContent");
  var toggle = section.querySelector(".sync-enable");
  var lines = section.querySelector(".sync-lines");
  var follow = section.querySelector("#syncFollow");
  var play = section.querySelector("#syncPlay");
  var status = section.querySelector(".sync-status");
  var displayControl = section.querySelector(".sync-display-control");
  var displayRange = section.querySelector("#syncDisplayLevel");
  var buttons = [];
  var meaningNodes = [];
  var languageSelect = null;
  function updateSupportMeaning() {
    if (!multilingualPilot) return;
    var translations = supportLanguage === "en" ? guided.meanings : pilotTranslations[supportLanguage];
    lines.setAttribute("aria-label", "Korean script with " + supportLanguages[supportLanguage] + " meanings, synchronized with playback");
    meaningNodes.forEach(function (node, index) {
      node.lang = supportLanguage;
      node.textContent = translations?.[index] || guided.meanings[index] || "";
    });
    if (languageSelect) languageSelect.value = supportLanguage;
  }
  if (multilingualPilot) {
    var selector = document.createElement("div");
    selector.className = "glr-support-selector";
    var selectorLabel = document.createElement("label");
    selectorLabel.htmlFor = "glrSupportLanguage";
    selectorLabel.textContent = "Meaning in";
    languageSelect = document.createElement("select");
    languageSelect.id = "glrSupportLanguage";
    languageSelect.setAttribute("aria-label", "Translation language");
    Object.entries(supportLanguages).forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry[0]; option.lang = entry[0]; option.textContent = entry[1];
      languageSelect.append(option);
    });
    selector.append(selectorLabel, languageSelect);
    document.querySelector(".script-controls")?.after(selector);
    languageSelect.value = supportLanguage;
    languageSelect.addEventListener("change", function () {
      supportLanguage = supportLanguages[languageSelect.value] ? languageSelect.value : "en";
      try { localStorage.setItem(preferenceKey, supportLanguage); } catch (error) { /* Storage may be disabled. */ }
      updateSupportMeaning();
    });
    window.addEventListener("storage", function (event) {
      if (event.key !== preferenceKey) return;
      supportLanguage = supportLanguages[event.newValue] ? event.newValue : "en";
      updateSupportMeaning();
    });
  }

  function setDisplayLevel(level) {
    displayLevel = Math.max(0, Math.min(2, Number(level) || 0));
    lines.classList.toggle("hide-reading", displayLevel < 1);
    lines.classList.toggle("hide-ko", displayLevel < 2);
    if (nativeJapanese) lines.classList.toggle("with-furigana", displayLevel >= 1);
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
      button.setAttribute("aria-label", native.ui==='en' ? "Play line " + (index + 1) + ": " + String(line.en || "").normalize("NFKC") : (index + 1) + "번 문장부터 재생: " + String(line.en || "").normalize("NFKC"));
      if(line.speaker){var speaker=document.createElement("small");speaker.className="sync-speaker";speaker.textContent=line.speaker;button.append(speaker);}
      var primary = document.createElement("span");
      if (data.language) primary.lang = data.language;
      var text=String(line.en || "").normalize("NFKC");
      if(nativeJapanese){primary.lang="ja";renderJapanese(primary,text);}else primary.textContent=text;
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
      if (multilingualPilot) { korean.lang = supportLanguage; meaningNodes.push(korean); }
      button.append(korean);
      button.addEventListener("click", function () { if (enabled) seekTo(index); });
      lines.appendChild(button);
      buttons.push(button);
    });
    updateSupportMeaning();
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
    var japaneseMode = "hidden";
    var japaneseControls = [document.getElementById("scriptHiddenButton"), document.getElementById("scriptButton"), document.getElementById("meaningButton")];
    var japaneseKeys = ["hidden", "en", "kr"];
    var japaneseLevels = { hidden: 0, en: 1, kr: 2 };
    function applyJapaneseMode(requested) {
      japaneseMode = japaneseKeys.indexOf(requested) >= 0 ? requested : "hidden";
      enabled = true;
      setDisplayLevel(japaneseLevels[japaneseMode]);
      section.hidden = false;
      if (content) content.hidden = false;
      japaneseControls.forEach(function (button, index) {
        if (!button) return;
        var selected = japaneseKeys[index] === japaneseMode;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
        button.setAttribute("aria-expanded", String(selected));
      });
      active = -1;
      update();
    }
    setDisplayLevel(displayLevel);
    update();
    displayRange.addEventListener("input", function () { setDisplayLevel(displayRange.value); });
    displayRange.addEventListener("change", function () { setDisplayLevel(displayRange.value); });
    window.TalkTagAudioScript = { show: function (requested) {
      applyJapaneseMode(requested);
      section.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }};
    applyJapaneseMode("hidden");
  } else if(nativeJapanese) {
    var mode="", controls=[document.getElementById("scriptHiddenButton"),document.getElementById("scriptButton"),document.getElementById("meaningButton")];
    var keys=["hidden","en","kr"],names=["일본어 원문","후리가나","한글 해석"];
    document.getElementById("scriptPanel")?.remove();document.getElementById("meaningPanel")?.remove();
    controls.forEach(function(button,i){button.textContent=names[i];button.setAttribute("aria-controls","unifiedScript");button.setAttribute("aria-pressed","false");button.setAttribute("aria-expanded","false");});
    window.TalkTagAudioScript={show:function(requested){
      enabled=true;mode=keys.indexOf(requested)>=0?requested:"hidden";
      lines.classList.toggle("with-furigana",mode!=="hidden");
      lines.classList.toggle("hide-ko",mode!=="kr");
      controls.forEach(function(button,i){var selected=keys[i]===mode;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected));button.setAttribute("aria-expanded",String(selected));});
      section.hidden=false;content.hidden=false;active=-1;update();section.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    }};
  } else {
    var mode="";
    var enButton=document.getElementById("scriptButton"),krButton=document.getElementById("meaningButton"),hideButton=document.getElementById("scriptHiddenButton");
    enButton.textContent=multilingualPilot?"Korean":(hideButton?"EN":"EN · 스크립트");
    krButton.textContent=multilingualPilot?"Korean + meaning":(hideButton?"EN+KR":"KR · 한글 해석");
    if (multilingualPilot && hideButton) hideButton.textContent = "Hide text";
    [enButton,krButton].forEach(function(button){button.setAttribute("aria-controls","unifiedScript");button.setAttribute("aria-expanded","false");});
    document.getElementById("scriptPanel")?.remove();document.getElementById("meaningPanel")?.remove();
    window.TalkTagAudioScript={show:function(requested, silent){
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
      if(enabled && !silent)section.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    }};
    if (multilingualPilot) window.TalkTagAudioScript.show("kr", true);
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
