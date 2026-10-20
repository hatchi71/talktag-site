(function () {
  "use strict";
var native=window.TalkTagNative;
  var audio = document.getElementById("audio");
  var playButton = document.getElementById("playButton");
  var rewindButton = document.getElementById("rewindButton");
  var restartButton = document.getElementById("restartButton");
  var progress = document.getElementById("progress");
  var currentTime = document.getElementById("currentTime");
  var duration = document.getElementById("duration");
  var loopButton = document.getElementById("loopButton");
  var scriptButton = document.getElementById("scriptButton");
  var meaningButton = document.getElementById("meaningButton");
  var scriptPanel = document.getElementById("scriptPanel");
  var meaningPanel = document.getElementById("meaningPanel");
  var completeButton = document.getElementById("completeButton");
  var completeState = document.getElementById("completeState");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  var allLessons = (window.TalkTagAudioLessons || []).filter(function (item) { return item.available !== false; });
  var requestedId = new URLSearchParams(location.search).get("id");
  var retiredPart = /^(guided-(?:a1|a2|b1|b2|c1|c2)-0[12])-part\d+$/.exec(requestedId || "");
  if (retiredPart) { location.replace(native.playerPage+"?id=" + retiredPart[1]); return; }
  var retiredGuided = ["a1-head","a2-hair-01-03","a2-hair-04-06","a2-hair-10-12","b1-head-brain","b1-hair-13-15","b1-hair-16-17"];
  if (retiredGuided.indexOf(requestedId) !== -1) { location.replace(native.libraryPage + "?type=guided&level=" + requestedId.slice(0,2).toUpperCase()); return; }
  var lesson = allLessons.find(function (item) { return item.id === requestedId; }) || allLessons[0];
  if (!lesson) { document.getElementById('lessonTitle').textContent=native.ui==='en'?'Recordings are coming soon':'음원을 준비하고 있습니다.'; return; }
  var legacyPlayback = new URLSearchParams(location.search).has("legacy");
  if (legacyPlayback && native.language === "ko") {
    var former = (window.TalkTagKoreanGuidedLegacyCatalog || []).find(function (item) { return item.id === lesson.id; });
    if (former && JSON.stringify(former.expressions) === JSON.stringify(lesson.expressions) &&
        JSON.stringify(former.meanings) === JSON.stringify(lesson.meanings)) {
      lesson = Object.assign({}, lesson, { audio: former.audio, training: Object.assign({}, former.training,
        { cues: former.training.cues.map(function (cue) { return Object.assign({}, cue); }) }),
        durationLabel: former.durationLabel, durationLong: former.durationLong });
    }
  }
  // The synchronized script must follow the recording selected above, not a
  // different catalog entry that happens to share the same card ID.
  window.TalkTagActiveNativeLesson = lesson;
  var lessons = allLessons.filter(function (item) { return item.level === lesson.level && item.type === lesson.type; });
  var lessonIndex = lessons.findIndex(function (item) { return item.id === lesson.id; });
  var previousLesson = lessons[lessonIndex - 1] || null;
  var nextLesson = lessons[lessonIndex + 1] || null;
  var storageKey = "talktag-audio:" + lesson.id;
  var pauseControl = null;
  var guidedVariants = window.TalkTagNativeGuidedVariants?.forLesson(lesson, native, audio, readState, saveState) || null;
  var expectsNativeVariants = lesson.type === "guided" &&
    ((native.language === "ko" && [1, 2, 3].includes(Number(lesson.unit))) ||
      (native.language === "ja" && Number(lesson.unit) === 1));
  if (expectsNativeVariants && !legacyPlayback && !guidedVariants &&
      !document.getElementById("nativeVariantFallback")) {
    var fixedNotice = document.createElement("p");
    fixedNotice.id = "nativeVariantFallback";
    fixedNotice.className = "segment-fallback";
    fixedNotice.textContent = native.ui === "en" ?
      "Adjustable speaking pauses are unavailable for this recording. The fixed 2.5× track remains available." :
      "이 음원의 말하기 간격 조절을 사용할 수 없습니다. 고정 2.5배 음원은 재생할 수 있습니다.";
    document.querySelector(".time-row")?.after(fixedNotice);
  }
  document.body.dataset.audioType = lesson.type;

  function appendList(targetId, items) {
    var target = document.getElementById(targetId);
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.textContent = item;
      target.appendChild(row);
    });
  }

  document.title = "TalkTag · " + lesson.level + " " + lesson.title;
  document.getElementById("playerHeaderMeta").textContent = lesson.level + " · EPISODE 001" + (lesson.partCount>1?" · PART "+lesson.partIndex:"");
  document.getElementById("lessonKicker").textContent = lesson.level + " · UNIT " + lesson.unit + (lesson.type === "plain" ? " · ESSAYS & ARTICLES" : " · GUIDED PRACTICE");
  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("lessonSummary").textContent = lesson.summary;
  document.getElementById("infoLevel").textContent = "Learning guide · " + lesson.level;
  document.getElementById("infoLocation").textContent = lesson.type === "plain" ? lesson.level + " · Essay " + lesson.unit : "Part " + lesson.part + " · Chapter " + lesson.chapter + " · Unit " + lesson.unit;
  document.getElementById("infoDuration").textContent = lesson.durationLong;
  document.getElementById("duration").textContent = lesson.durationLabel;
  document.getElementById("libraryBack").href = native.libraryPage+"?type=" + lesson.type + "&level=" + lesson.level;
  document.getElementById("libraryBack").textContent = "← " + lesson.level + " Library";
  document.getElementById("infoLibraryBack").href = native.libraryPage+"?type=" + lesson.type + "&level=" + lesson.level;
  if (lesson.type === "plain") {
    document.body.classList.add("essay-player");
    document.getElementById("playerHeaderMeta").textContent = "ESSAYS & ARTICLES";
    var info = document.querySelectorAll(".lesson-info dd");
    info[0].textContent = "Essays & Articles";
    info[2].textContent = lesson.genre;
    info[5].textContent = "Original audio";
    document.querySelector("#scriptPanel h2").textContent = native.language === 'ko' ? "Korean script" : "English script";
    document.querySelector(".class-bridge p").textContent = native.language === 'ko' ? "Recall the key idea, summarise it, then tell it to a partner in your own Korean." : "핵심 내용을 기억에서 꺼내 요약하고, 자신의 표현으로 파트너에게 이야기해 보세요.";
    document.querySelector(".lesson-info dd:nth-of-type(3)").textContent = native.language === 'ko' ? "Korean Audio Essays & Articles · " + String(lesson.unit).padStart(3, '0') : "Audio Essays & Articles · " + String(lesson.unit).padStart(3, '0');
  }
  if (lesson.training) {
    document.getElementById("playerHeaderMeta").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(2,"0");
    document.getElementById("lessonKicker").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(2,"0") + " · GUIDED PRACTICE";
    document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(2,"0") + " · " + lesson.expressions.length + " sentences";
    if (lesson.partIndex) {
      document.getElementById("playerHeaderMeta").textContent += " · " + lesson.partIndex + "/" + lesson.partCount;
      document.getElementById("lessonKicker").textContent = lesson.level + " · " + String(lesson.unit).padStart(2,"0") + "–" + String(lesson.partIndex).padStart(2,"0");
      document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(2,"0") + " · " + lesson.partIndex + "/" + lesson.partCount + " · 문장 " + lesson.sentenceStart + "–" + lesson.sentenceEnd;
    }
    var fields = document.querySelectorAll(".lesson-info dd");
    fields[2].textContent = "Sound Check · Guided Practice";
    fields[5].textContent = "문장별 " + lesson.training.defaultReps + "회 반복";
    var drillStatus = document.createElement("div");
    drillStatus.className = "guided-drill-status";
    drillStatus.setAttribute("aria-live","off");
    document.querySelector(".lesson-track-nav").after(drillStatus);
    var lastDrillLabel = "";
    function updateDrillStatus() {
      var time = audio.currentTime;
      var cue = lesson.training.cues.find(function (cue) { return cue.s <= time && time < cue.e; });
      var label = cue ? "문장 " + (cue.i+1) + " / " + lesson.expressions.length + " · 반복 " + cue.r + " / " + lesson.training.defaultReps + (time < cue.voiceEnd ? " · 듣기" : " · 따라 말하기") : (time >= lesson.training.endingCueStart ? "전체 훈련 완료 · 종료음" : "시작음 · 문장별 " + lesson.training.defaultReps + "회 반복");
      if (label !== lastDrillLabel) { drillStatus.textContent = label; lastDrillLabel = label; }
    }
    audio.addEventListener("timeupdate",updateDrillStatus);
    audio.addEventListener("seeked",updateDrillStatus);
    updateDrillStatus();
    if (!legacyPlayback && (!expectsNativeVariants || guidedVariants)) pauseControl = window.TalkTagGuidedPause?.mount({ audio: audio, lesson: lesson, anchor: native.language === 'ko' ? document.querySelector('.transport') : document.querySelector('#progress'), readState: readState, saveState: saveState, playButton: playButton, english: native.ui === 'en' });
  }
  if (!guidedVariants) audio.src = legacyPlayback && lesson.legacyAudio ? lesson.legacyAudio : lesson.audio;
  appendList("scriptList", lesson.expressions);
  appendList("meaningList", lesson.meanings);
  if (!lesson.meanings.length) { meaningButton.hidden = true; meaningPanel.hidden = true; }
  var plainKoreanScript = native.language === "ko" && lesson.type === "plain";
  if (plainKoreanScript) {
    var pairedList = document.getElementById("scriptList");
    pairedList.replaceChildren();
    lesson.expressions.forEach(function (expression, index) {
      var row = document.createElement("li");
      var korean = document.createElement("span");
      korean.className = "native-line-korean";
      korean.lang = "ko";
      korean.textContent = expression;
      row.appendChild(korean);
      if (lesson.meanings[index]) {
        var english = document.createElement("span");
        english.className = "native-line-meaning";
        english.lang = "en";
        english.textContent = lesson.meanings[index];
        row.appendChild(english);
      }
      pairedList.appendChild(row);
    });
    scriptPanel.classList.add("native-paired-script");
    meaningPanel.hidden = true;
  }
  prevButton.disabled = !previousLesson;
  nextButton.disabled = !nextLesson;
  if (previousLesson) prevButton.setAttribute("aria-label", "Previous lesson: " + previousLesson.title);
  if (nextLesson) nextButton.setAttribute("aria-label", "Next lesson: " + nextLesson.title);

  function readState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (error) { return {}; }
  }
  function saveState(patch) {
    if ((legacyPlayback || (native.language === "ko" && lesson.type === "plain")) && Object.prototype.hasOwnProperty.call(patch, "position")) {
      patch = Object.assign({}, patch, { positionMode: "legacy" });
    }
    var next = Object.assign({}, readState(), patch);
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  }
  function formatTime(value) {
    if (!Number.isFinite(value)) return "00:00";
    var seconds = Math.max(0, Math.floor(value));
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }
  function updateCompletion(done) {
    completeState.textContent = done ? "미션 완료" : "훈련 중";
    completeState.classList.toggle("done", done);
    completeButton.textContent = done ? "✓ 완료됨 · 완료 취소" : "미션 완료로 표시";
    completeButton.classList.toggle("done", done);
    completeButton.setAttribute("aria-pressed", String(done));
  }
  function togglePanel(button, panel, otherButton, otherPanel) {
    var opening = panel.hidden;
    panel.hidden = !opening;
    button.classList.toggle("active", opening);
    if (opening) {
      otherPanel.hidden = true;
      otherButton.classList.remove("active");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  for (var i = 0; i < 42; i += 1) {
    var bar = document.createElement("i");
    bar.style.height = (18 + ((i * 19) % 58)) + "px";
    document.getElementById("wave").appendChild(bar);
  }
  var initial = readState();
  if (lesson.type === "plain" && lesson.boundaryDings && !initial.essayDingsMigrated) {
    if (initial.positionMode !== 'essay-variant') initial.position = initial.position > 0 ? Number(initial.position) + lesson.openingDingSeconds : 0;
    saveState({ position: initial.position, essayDingsMigrated: true });
  }
  if (lesson.training && lesson.training.cardDings && !initial.cardDingsMigrated) {
    initial.position = initial.position > 0 ? Number(initial.position) + Number(lesson.training.prependSeconds || 0) : 0;
    saveState({ position: initial.position, cardDingsMigrated: true });
  }
  var resumePending = guidedVariants ? guidedVariants.migratePosition(initial) :
    (native.language === "ko" && lesson.type === "plain" ?
      (window.TalkTagNativeEssayVariants?.toOriginalPosition(lesson, initial) ?? Number(initial.position || 0)) :
    legacyPlayback && lesson.training ?
      (window.TalkTagNativeGuidedVariants?.toFixedPosition(lesson, native, initial) ??
        (initial.positionMode === "native-variant" ? 0 : Number(initial.position || 0))) :
      ((initial.positionMode === "native-variant" || initial.positionMode === "essay-variant") ? 0 : Number(initial.position || 0)));
  audio.addEventListener("talktag-audio-seek", function () { resumePending = 0; });
  audio.loop = Boolean(initial.loop);
  loopButton.classList.toggle("on", audio.loop);
  loopButton.setAttribute("aria-checked", String(audio.loop));
  audio.playbackRate = 1;
  function manualDone() { return window.TalkTagCompletion ? window.TalkTagCompletion.getManual("audio:" + lesson.id, storageKey) : Boolean(readState().completed); }
  updateCompletion(manualDone());

  function applyInitialResume() {
    duration.textContent = formatTime(audio.duration);
    document.getElementById("infoDuration").textContent = formatTime(audio.duration);
    var resumeAt = resumePending;
    if (resumeAt > 0 && resumeAt < audio.duration - 5) {
      audio.currentTime = resumeAt;
      currentTime.textContent = formatTime(resumeAt);
      progress.value = Math.round((resumeAt / audio.duration) * 1000);
    }
  }
  audio.addEventListener("loadedmetadata", applyInitialResume);
  audio.addEventListener("canplay", applyInitialResume, { once: true });
  if (audio.readyState >= 3) window.setTimeout(applyInitialResume, 0);
  audio.addEventListener("timeupdate", function () {
    if (audio.dataset.segmentSwitching) return;
    if (resumePending > 0 && audio.currentTime < 0.25) return;
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
    if (audio.currentTime > 0 && Math.floor(audio.currentTime) % 5 === 0) saveState({ position: audio.currentTime });
  });
  audio.addEventListener("play", function () { playButton.textContent = "❚❚ PAUSE"; });
  audio.addEventListener("pause", function () {
    playButton.textContent = pauseControl?.isHolding() ? "❚❚ PAUSE" : "▶ PLAY";
    if (audio.currentTime > 0 && !audio.dataset.segmentSwitching) saveState({ position: audio.currentTime });
  });
  function finishGuidedCard() {
    if (lesson.type !== "guided") return;
    saveState({ completed: true, listened: true, listenedAt: new Date().toISOString(), position: 0 });
    if (window.TalkTagCompletion) window.TalkTagCompletion.set("audio:" + lesson.id, true, storageKey);
    updateCompletion(true);
  }
  var loopPreviousTime = 0;
  audio.addEventListener("timeupdate", function () {
    if (audio.loop && audio.duration && !audio.dataset.segmentSwitching && loopPreviousTime > audio.duration - 1 && audio.currentTime < 1 && !audio.seeking) finishGuidedCard();
    loopPreviousTime = audio.currentTime;
  });
  audio.addEventListener("seeking", function () { loopPreviousTime = 0; });
  audio.addEventListener("ended", function () {
    if (!audio.loop) {
      saveState({ position: 0, listened: true, listenedAt: new Date().toISOString() });
      finishGuidedCard();
    }
  });
  playButton.addEventListener("click", function () {
    if (pauseControl?.cancelHold()) return;
    if (audio.paused) {
      var resumeAt = resumePending;
      var playPromise = audio.play();
      if (resumeAt > 0 && resumeAt < audio.duration - 5 && audio.currentTime < 0.25) {
        Promise.resolve(playPromise).then(function () {
          audio.currentTime = resumeAt;
          resumePending = 0;
        });
      } else resumePending = 0;
    } else audio.pause();
  });
  rewindButton.addEventListener("click", function () { pauseControl?.cancelHold(); audio.currentTime = Math.max(0, audio.currentTime - 10); });
  restartButton.addEventListener("click", function () { var wasHolding = pauseControl?.cancelHold(); audio.currentTime = 0; if (audio.paused || wasHolding) audio.play(); });
  prevButton.addEventListener("click", function () { if (previousLesson) location.href = native.playerPage+"?id=" + encodeURIComponent(previousLesson.id); });
  nextButton.addEventListener("click", function () { if (nextLesson) location.href = native.playerPage+"?id=" + encodeURIComponent(nextLesson.id); });
  progress.addEventListener("input", function () { if (audio.duration) audio.currentTime = (Number(progress.value) / 1000) * audio.duration; });
  loopButton.addEventListener("click", function () { audio.loop = !audio.loop; loopButton.classList.toggle("on", audio.loop); loopButton.setAttribute("aria-checked", String(audio.loop)); saveState({ loop: audio.loop }); });
  var hideScriptButton=document.getElementById("scriptHiddenButton");
  function showPlainKoreanScript(mode) {
    scriptPanel.hidden = mode === "hidden";
    meaningPanel.hidden = true;
    scriptPanel.classList.toggle("show-meaning", mode === "both");
    [[hideScriptButton,"hidden"],[scriptButton,"korean"],[meaningButton,"both"]].forEach(function (entry) {
      if (!entry[0]) return;
      var selected = entry[1] === mode;
      entry[0].classList.toggle("active", selected);
      entry[0].setAttribute("aria-pressed", String(selected));
      entry[0].setAttribute("aria-controls", "scriptPanel");
    });
    if (mode !== "hidden") scriptPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (plainKoreanScript) showPlainKoreanScript("hidden");
  scriptButton.addEventListener("click", function () { if(plainKoreanScript){showPlainKoreanScript("korean");return;}if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("en");return;}togglePanel(scriptButton, scriptPanel, meaningButton, meaningPanel); });
  meaningButton.addEventListener("click", function () { if(plainKoreanScript){showPlainKoreanScript("both");return;}if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("kr");return;}togglePanel(meaningButton, meaningPanel, scriptButton, scriptPanel); });
  if(hideScriptButton)hideScriptButton.addEventListener("click",function(){if(plainKoreanScript){showPlainKoreanScript("hidden");return;}if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("hidden");return;}scriptPanel.hidden=true;meaningPanel.hidden=true;scriptButton.classList.remove("active");meaningButton.classList.remove("active");hideScriptButton.setAttribute("aria-pressed","true");scriptButton.setAttribute("aria-pressed","false");meaningButton.setAttribute("aria-pressed","false");});
  completeButton.addEventListener("click", function () { var done = !manualDone(); saveState({ completed: done }); if (window.TalkTagCompletion) window.TalkTagCompletion.set("audio:" + lesson.id, done, storageKey); updateCompletion(done); });
  window.addEventListener("storage", function () { updateCompletion(manualDone()); });
  window.addEventListener("talktag:completion-change", function () { updateCompletion(manualDone()); });
  window.addEventListener("beforeunload", function () {
    if (audio.currentTime > 0 && !audio.dataset.segmentSwitching) saveState({ position: audio.currentTime });
  });
})();
