(function () {
  "use strict";
  var audioElement = document.getElementById("audio");
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
  if (retiredPart) { location.replace("audio-player.html?id=" + retiredPart[1]); return; }
  var retiredGuided = ["a1-head","a2-hair-01-03","a2-hair-04-06","a2-hair-10-12","b1-head-brain","b1-hair-13-15","b1-hair-16-17"];
  if (retiredGuided.indexOf(requestedId) !== -1) { location.replace("audio-library.html?type=guided&level=" + requestedId.slice(0,2).toUpperCase()); return; }
  var lesson = allLessons.find(function (item) { return item.id === requestedId; });
  if (!lesson) { location.replace("audio-library.html?type=plain"); return; }
  if (lesson.format === "level0") document.body.classList.add("level0-player");
  var audio = window.TalkTagSegmented001?.forLesson(lesson) || audioElement;
  var isSegmentedEpisode = /^guided-(?:a1|a2|b1|b2|c1|c2)-(?:0[1-7]|(?:08|09|10)-miniskit(?:-pilot)?(?:-part[1-3])?)$/.test(lesson.id);
  var lessons = allLessons.filter(function (item) { return item.level === lesson.level && item.type === lesson.type && item.format === lesson.format; });
  var lessonIndex = lessons.findIndex(function (item) { return item.id === lesson.id; });
  var previousLesson = lessons[lessonIndex - 1] || null;
  var nextLesson = lessons[lessonIndex + 1] || null;
  var storageKey = "talktag-audio:" + lesson.id;
  var pauseControl = null;
  var level0Prompt = null;
  document.body.dataset.audioType = lesson.type;

  function appendList(targetId, items, speakers) {
    var target = document.getElementById(targetId);
    items.forEach(function (item) {
      var row = document.createElement("li");
      var index = target.children.length;
      if (speakers && speakers[index]) {
        var speaker = document.createElement("strong");
        speaker.className = "dialogue-speaker";
        speaker.textContent = speakers[index] + ": ";
        row.appendChild(speaker);
        row.appendChild(document.createTextNode(item));
      } else row.textContent = item;
      target.appendChild(row);
    });
  }

  document.title = "TalkTag · " + lesson.level + " " + lesson.title;
  document.getElementById("playerHeaderMeta").textContent = lesson.level + " · OFFLINE CLASS PREP";
  document.getElementById("lessonKicker").textContent = lesson.level + " · UNIT " + lesson.unit + (lesson.format === "mini-talks" ? " · MINI TALKS" : lesson.type === "plain" ? " · LEGACY ESSAY" : " · GUIDED PRACTICE");
  document.getElementById("lessonTitle").textContent = lesson.title;
  if (lesson.type === "plain" && lesson.artwork) {
    var figure = document.createElement("figure");
    figure.className = "essay-cover-figure";
    var cover = document.createElement("img");
    cover.src = lesson.artwork;
    cover.alt = lesson.artworkAlt || "";
    cover.width = 720;
    cover.height = 480;
    figure.appendChild(cover);
    document.getElementById("lessonSummary").before(figure);
  }
  var lessonSummary = document.getElementById("lessonSummary");
  lessonSummary.textContent = lesson.summary;
  if (lesson.type === "plain" && lesson.format !== "mini-talks") {
    var shadowingTitle = document.createElement("h2");
    shadowingTitle.className = "essay-shadowing-title";
    shadowingTitle.textContent = "들으며 따라 말하기";
    var shadowingDescription = document.createElement("p");
    shadowingDescription.className = "essay-shadowing-description";
    shadowingDescription.textContent = "음성을 들으면서 동시에 작은 소리로 따라 말해 보세요. 말하는 사람의 소리와 리듬을 따라가는 데 집중하세요.";
    lessonSummary.replaceChildren(shadowingTitle, shadowingDescription);
  }
  if (lesson.training) lessonSummary.textContent = lesson.format === "mini-talks" ? "짧은 대화를 듣고, 필요한 표현을 메모한 뒤 내 말로 다시 이야기해 보세요." : lesson.format === "miniskit" ? "짧은 장면 속 대화를 듣고, 한 대사씩 맡아 말해 보세요." : "한 문장씩 듣고 따라 하세요.";
  if (lesson.format === "mini-talks") {
    var miniScene = document.getElementById("sceneBriefing");
    document.getElementById("sceneBriefingText").textContent = lesson.briefing;
    miniScene.hidden = false;
  }
  if (lesson.format === "level0") {
    lessonSummary.textContent = "그림을 보고 한 가지 표현을 " + lesson.training.defaultReps + "회 듣고 따라 하세요. 마지막에는 음성 없이 직접 답해 보세요.";
    var level0Figure = document.createElement("figure");
    level0Figure.className = "level0-scene";
    var level0Image = document.createElement("img");
    level0Image.src = lesson.artwork;
    level0Image.alt = lesson.artworkAlt || "";
    level0Image.width = 720;
    level0Image.height = 480;
    level0Figure.appendChild(level0Image);
    lessonSummary.before(level0Figure);
    level0Prompt = document.createElement("section");
    level0Prompt.className = "level0-response";
    level0Prompt.hidden = true;
    var level0Heading = document.createElement("h2");
    level0Heading.textContent = "이제 내 차례";
    var level0Question = document.createElement("p");
    level0Question.textContent = lesson.tinyPrompt;
    var level0Action = document.createElement("button");
    level0Action.type = "button";
    level0Action.textContent = "말했어요 · 완료";
    level0Action.addEventListener("click", function(){ if(completeButton.getAttribute("aria-pressed")!=="true") completeButton.click(); });
    level0Prompt.append(level0Heading,level0Question,level0Action);
    lessonSummary.after(level0Prompt);
  }
  document.getElementById("infoLevel").textContent = lesson.format === "level0" ? "Start Here · Level 0 (TalkTag pre-A1)" : "CEFR " + lesson.level;
  document.getElementById("infoLocation").textContent = lesson.format === "mini-talks" ? "Episode " + lesson.unit + " · " + lesson.expressions.length + " dialogue turns" : lesson.type === "plain" ? lesson.level + " · Essay " + lesson.unit : "Part " + lesson.part + " · Chapter " + lesson.chapter + " · Unit " + lesson.unit;
  document.getElementById("infoDuration").textContent = lesson.durationLong;
  document.getElementById("duration").textContent = lesson.durationLabel;
  document.getElementById("libraryBack").href = "audio-library.html?type=" + lesson.type + "&level=" + lesson.level;
  document.getElementById("libraryBack").textContent = "← " + lesson.level + " 목록";
  document.getElementById("infoLibraryBack").href = "audio-library.html?type=" + lesson.type + "&level=" + lesson.level;
  if (lesson.type === "plain") {
    document.body.classList.add("essay-player");
    document.getElementById("playerHeaderMeta").textContent = lesson.format === "mini-talks" ? "Mini Talks · " + lesson.level : "지난 에세이 자료";
    var info = document.querySelectorAll(".lesson-info dd");
    info[0].textContent = lesson.format === "mini-talks" ? "Mini Talks" : "Archived Essays & Articles";
    info[2].textContent = lesson.genre;
    info[5].textContent = "Original audio";
    document.querySelector("#scriptPanel h2").textContent = "English script";
    document.querySelector(".class-bridge p").textContent = "핵심 내용을 기억에서 꺼내 요약하고, 자신의 표현으로 파트너에게 이야기해 보세요.";
    if (lesson.format !== "mini-talks") {
      var archiveNotice = document.createElement("p");
      archiveNotice.className = "mini-talks-legacy-notice";
      archiveNotice.textContent = "이 자료는 이전 오디오 에세이입니다. 새 Mini Talks 목록에는 포함되지 않으며, 완료 기록은 그대로 유지됩니다.";
      document.getElementById("lessonTitle").before(archiveNotice);
    }
  }
  if (lesson.training) {
    document.getElementById("playerHeaderMeta").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(2,"0");
    document.getElementById("lessonKicker").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(2,"0") + (lesson.format === "mini-talks" ? " · MINI TALKS" : lesson.format === "miniskit" ? " · MINISKIT" : " · GUIDED PRACTICE");
    document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(2,"0") + " · " + lesson.expressions.length + (lesson.format === "mini-talks" || lesson.format === "miniskit" ? " dialogue lines" : " sentences");
    if (lesson.partIndex) {
      document.getElementById("playerHeaderMeta").textContent += " · " + lesson.partIndex + "/" + lesson.partCount;
    document.getElementById("lessonKicker").textContent = lesson.level + " · " + String(lesson.unit).padStart(2,"0") + "–" + String(lesson.partIndex).padStart(2,"0") + (lesson.format === "miniskit" ? " · MINISKIT" : "");
    document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(2,"0") + " · " + lesson.partIndex + "/" + lesson.partCount + " · " + (lesson.format === "miniskit" ? "대사 " : "문장 ") + lesson.sentenceStart + "–" + lesson.sentenceEnd;
    }
    var fields = document.querySelectorAll(".lesson-info dd");
    fields[2].textContent = lesson.format === "mini-talks" ? "Sound Check · Mini Talks" : "Sound Check · Guided Practice";
    fields[5].textContent = lesson.format === "mini-talks" ? "대화 한 번 재생 · 자유롭게 다시 듣기" : (lesson.format === "miniskit" ? "대사별 " : "문장별 ") + lesson.training.defaultReps + "회 반복";
    if (lesson.format === "level0") {
      document.getElementById("playerHeaderMeta").textContent = "A0 · " + String(lesson.unit).padStart(3,"0");
      document.getElementById("lessonKicker").textContent = "START HERE · LEVEL 0 · ONE EXPRESSION";
      document.getElementById("infoLocation").textContent = "한 가지 유용한 표현 · " + String(lesson.unit).padStart(3,"0");
      fields[5].textContent = "한 표현 · " + lesson.training.defaultReps + "회 듣고 말하기";
    }
    var drillStatus = document.createElement("div");
    drillStatus.className = "guided-drill-status";
    drillStatus.setAttribute("aria-live","off");
    document.querySelector(".lesson-track-nav").after(drillStatus);
    var lastDrillLabel = "";
    function updateDrillStatus() {
      var time = audio.currentTime;
      var cue = lesson.training.cues.find(function (cue) { return cue.s <= time && time < cue.e; });
      var unitLabel = lesson.format === "level0" ? "표현 " : (lesson.format === "miniskit" ? "대사 " : "문장 ");
      var label = lesson.format === "mini-talks" ? (cue ? "대사 " + (cue.i+1) + " / " + lesson.expressions.length + " · 듣는 중" : time >= lesson.training.endingCueStart ? "대화 완료 · 종료음" : time >= lesson.training.startCueEnd ? "대화 듣기" : "시작음") : cue ? unitLabel + (cue.i+1) + " / " + lesson.expressions.length + " · 반복 " + cue.r + " / " + lesson.training.defaultReps + (time < cue.voiceEnd ? " · 듣기" : (lesson.format === "miniskit" ? " · 내 차례" : " · 따라 말하기")) : (time >= lesson.training.endingCueStart ? "전체 훈련 완료 · 종료음" : "시작음 · " + (lesson.format === "level0" ? "한 표현 " : (lesson.format === "miniskit" ? "대사별 " : "문장별 ")) + lesson.training.defaultReps + "회 반복");
      if (label !== lastDrillLabel) { drillStatus.textContent = label; lastDrillLabel = label; }
    }
    audio.addEventListener("timeupdate",updateDrillStatus);
    audio.addEventListener("seeked",updateDrillStatus);
    updateDrillStatus();
    pauseControl = window.TalkTagGuidedPause?.mount({ audio: audio, lesson: lesson, anchor: document.querySelector('.lesson-track-nav'), readState: readState, saveState: saveState, playButton: playButton });
  }
  if (!audio.segmented) audio.src = lesson.audio;
  appendList("scriptList", lesson.expressions, lesson.speakers);
  appendList("meaningList", lesson.meanings);
  if (!lesson.meanings.length) { meaningButton.hidden = true; meaningPanel.hidden = true; }
  prevButton.disabled = !previousLesson;
  nextButton.disabled = !nextLesson;
  if (previousLesson) prevButton.setAttribute("aria-label", "Previous lesson: " + previousLesson.title);
  if (nextLesson) nextButton.setAttribute("aria-label", "Next lesson: " + nextLesson.title);

  function readState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (error) { return {}; }
  }
  function saveState(patch) {
    var update = Object.assign({}, patch);
    if (isSegmentedEpisode && Object.prototype.hasOwnProperty.call(update, "position")) {
      if (audio.dataset.segmentSwitching === "true") delete update.position;
      else {
        update.positionMode = audio.segmented ? "segmented" : "legacy";
        update.positionRatio = audio.segmented ? audio.segmentRatio : null;
        update.segmentVersion = 2;
      }
    }
    var next = Object.assign({}, readState(), update);
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
  if (level0Prompt) level0Prompt.hidden = !initial.listened;
  if (miniTalksPrompt) miniTalksPrompt.hidden = true;
  if (lesson.type === "plain" && lesson.boundaryDings && !initial.essayDingsMigrated) {
    initial.position = initial.position > 0 ? Number(initial.position) + lesson.openingDingSeconds : 0;
    saveState({ position: initial.position, essayDingsMigrated: true });
  }
  if (!audio.segmented && lesson.training && lesson.training.cardDings && !initial.cardDingsMigrated &&
      (!isSegmentedEpisode || (initial.positionMode !== "segmented" && initial.segmentVersion !== 2))) {
    initial.position = initial.position > 0 ? Number(initial.position) + Number(lesson.training.prependSeconds || 0) : 0;
    saveState({ position: initial.position, cardDingsMigrated: true });
  }
  var resumePending = Number(initial.position || 0);
  var resumeConverted = false;
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
    if (audio.dataset.segmentSwitching === "true") return;
    if (resumePending > 0 && !resumeConverted && isSegmentedEpisode) {
      resumePending = audio.segmented ? audio.migrateSavedPosition(initial) :
        (window.TalkTagSegmented001?.toLegacyPosition(lesson, initial) ?? resumePending);
      saveState({ position: resumePending });
      resumeConverted = true;
    }
    var resumeAt = resumePending;
    if (resumeAt > 0 && resumeAt < audio.duration - 5) {
      audio.currentTime = resumeAt;
      currentTime.textContent = formatTime(resumeAt);
      progress.value = Math.round((resumeAt / audio.duration) * 1000);
    }
    if (audio.segmented) resumePending = 0;
  }
  audio.addEventListener("loadedmetadata", applyInitialResume);
  if (audio.segmented) audio.addEventListener("durationchange", function () {
    duration.textContent = formatTime(audio.duration);
    document.getElementById("infoDuration").textContent = formatTime(audio.duration);
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
  });
  audio.addEventListener("canplay", applyInitialResume, { once: true });
  if (audio.readyState >= 3) window.setTimeout(applyInitialResume, 0);
  audio.addEventListener("timeupdate", function () {
    if (resumePending > 0 && audio.currentTime < 0.25) return;
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
    if (audio.currentTime > 0 && Math.floor(audio.currentTime) % 5 === 0) saveState({ position: audio.currentTime });
  });
  audio.addEventListener("play", function () { playButton.textContent = "❚❚ PAUSE"; });
  audio.addEventListener("pause", function () {
    playButton.textContent = pauseControl?.isHolding() ? "❚❚ PAUSE" : "▶ PLAY";
    if (audio.currentTime > 0) saveState({ position: audio.currentTime });
  });
  function finishGuidedCard() {
    if (lesson.type !== "guided" || lesson.format === "level0") return;
    saveState({ completed: true, listened: true, listenedAt: new Date().toISOString(), position: 0 });
    if (window.TalkTagCompletion) window.TalkTagCompletion.set("audio:" + lesson.id, true, storageKey);
    updateCompletion(true);
  }
  var loopPreviousTime = 0;
  audio.addEventListener("timeupdate", function () {
    if (audio.loop && audio.duration && loopPreviousTime > audio.duration - 1 && audio.currentTime < 1 && !audio.seeking) finishGuidedCard();
    loopPreviousTime = audio.currentTime;
  });
  audio.addEventListener("seeking", function () { loopPreviousTime = 0; });
  audio.addEventListener("ended", function () {
    if (!audio.loop) {
      saveState({ position: 0, listened: true, listenedAt: new Date().toISOString() });
      if (level0Prompt) { level0Prompt.hidden = false; level0Prompt.scrollIntoView({behavior:"smooth",block:"center"}); }
      if (miniTalksPrompt) miniTalksPrompt.hidden = false;
      finishGuidedCard();
    }
  });
  playButton.addEventListener("click", function () {
    if (pauseControl?.cancelHold()) return;
    if (audio.paused) {
      if (audio.segmented && audio.readyState < 1) {
        audio.play().catch(function () { playButton.textContent = "▶ 다시 재생"; });
        return;
      }
      var resumeAt = resumePending;
      var playPromise = audio.play();
      if (audio.segmented) Promise.resolve(playPromise).catch(function () { playButton.textContent = "▶ 다시 재생"; });
      if (resumeAt > 0 && resumeAt < audio.duration - 5 && audio.currentTime < 0.25) {
        Promise.resolve(playPromise).then(function () {
          audio.currentTime = resumeAt;
          resumePending = 0;
        }).catch(function () { playButton.textContent = "▶ 다시 재생"; });
      } else resumePending = 0;
    } else audio.pause();
  });
  rewindButton.addEventListener("click", function () { pauseControl?.cancelHold(); audio.currentTime = Math.max(0, audio.currentTime - 10); });
  restartButton.addEventListener("click", function () { var wasHolding = pauseControl?.cancelHold(); audio.currentTime = 0; if (audio.paused || wasHolding) audio.play(); });
  prevButton.addEventListener("click", function () { if (previousLesson) location.href = "audio-player.html?id=" + encodeURIComponent(previousLesson.id); });
  nextButton.addEventListener("click", function () { if (nextLesson) location.href = "audio-player.html?id=" + encodeURIComponent(nextLesson.id); });
  progress.addEventListener("input", function () { if (audio.duration) audio.currentTime = (Number(progress.value) / 1000) * audio.duration; });
  loopButton.addEventListener("click", function () { audio.loop = !audio.loop; loopButton.classList.toggle("on", audio.loop); loopButton.setAttribute("aria-checked", String(audio.loop)); saveState({ loop: audio.loop }); });
  scriptButton.addEventListener("click", function () { if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("en");return;}togglePanel(scriptButton, scriptPanel, meaningButton, meaningPanel); });
  meaningButton.addEventListener("click", function () { if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("kr");return;}togglePanel(meaningButton, meaningPanel, scriptButton, scriptPanel); });
  var hideScriptButton=document.getElementById("scriptHiddenButton");
  if(hideScriptButton)hideScriptButton.addEventListener("click",function(){if(window.TalkTagAudioScript){window.TalkTagAudioScript.show("hidden");return;}scriptPanel.hidden=true;meaningPanel.hidden=true;scriptButton.classList.remove("active");meaningButton.classList.remove("active");hideScriptButton.setAttribute("aria-pressed","true");scriptButton.setAttribute("aria-pressed","false");meaningButton.setAttribute("aria-pressed","false");});
  completeButton.addEventListener("click", function () { var done = !manualDone(); saveState({ completed: done }); if (window.TalkTagCompletion) window.TalkTagCompletion.set("audio:" + lesson.id, done, storageKey); updateCompletion(done); });
  window.addEventListener("storage", function () { updateCompletion(manualDone()); });
  window.addEventListener("talktag:completion-change", function () { updateCompletion(manualDone()); });
  window.addEventListener("beforeunload", function () {
    if (audio.currentTime > 0) saveState({ position: audio.currentTime });
  });
})();
