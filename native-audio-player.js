(function () {
  "use strict";
var native=window.TalkTagNative;
  var miniPreview=native?.language==="ko"&&window.TalkTagMiniTalksPreview===true;
  var miniReleased=native?.language==="ko"&&window.TalkTagKoreanMiniReleaseReady===true;
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
  var allLessons = (window.TalkTagAudioLessons || []).filter(function (item) {
    if (item.available === false) return false;
    if (native?.language === "ko" && item.type === "plain") {
      return miniReleased ? item.format === "mini-talks" : item.format !== "mini-talks" || miniPreview;
    }
    return true;
  });
  var requestedId = new URLSearchParams(location.search).get("id");
  if (miniReleased && /^ko-plain-(?:a1|a2|b1|b2|c1|c2)-\d{3}$/.test(requestedId || "")) {
    document.body.classList.add("retired-essay-page");
    document.title = "This Korean audio essay has retired · TalkTag";
    document.getElementById("playerHeaderMeta").textContent = "MINI TALKS";
    var retiredBack = document.getElementById("libraryBack");
    retiredBack.href = native.libraryPage + "?type=plain";
    retiredBack.textContent = "← Mini Talks";
    var notice = document.createElement("section");
    notice.className = "retired-essay-note";
    notice.setAttribute("aria-labelledby", "retiredEssayTitle");
    var eyebrow = document.createElement("p");
    eyebrow.className = "retired-essay-eyebrow";
    eyebrow.textContent = "SOUND CHECK · TRACK UPDATE";
    var title = document.createElement("h1");
    title.id = "retiredEssayTitle";
    title.textContent = "This audio essay has retired.";
    var explanation = document.createElement("p");
    explanation.textContent = "TalkTag now uses short, practical conversations in Mini Talks. This old essay has not been replaced by the same lesson. Your completion record remains saved separately.";
    var link = document.createElement("a");
    link.className = "retired-essay-action";
    link.href = native.libraryPage + "?type=plain";
    link.textContent = "Explore Korean Mini Talks →";
    notice.append(eyebrow, title, explanation, link);
    document.querySelector("main.wrap").replaceChildren(notice);
    return;
  }
  var retiredPart = /^(guided-(?:a1|a2|b1|b2|c1|c2)-0[12])-part\d+$/.exec(requestedId || "");
  if (retiredPart) { location.replace(native.playerPage+"?id=" + retiredPart[1]); return; }
  var retiredGuided = ["a1-head","a2-hair-01-03","a2-hair-04-06","a2-hair-10-12","b1-head-brain","b1-hair-13-15","b1-hair-16-17"];
  if (retiredGuided.indexOf(requestedId) !== -1) { location.replace(native.libraryPage + "?type=guided&level=" + requestedId.slice(0,2).toUpperCase()); return; }
  var lesson = allLessons.find(function (item) { return item.id === requestedId; }) || (requestedId ? null : allLessons[0]);
  if (!lesson) { document.getElementById('lessonTitle').textContent=native.ui==='en'?'Recordings are coming soon':'음원을 준비하고 있습니다.'; return; }
  if(lesson.format==="mini-talks")document.body.classList.add("mini-talks-player");
  if(miniPreview&&!miniReleased&&lesson.format==="mini-talks"){
    var reviewNotice=document.createElement("p");
    reviewNotice.className="mini-talks-preview-notice";
    reviewNotice.textContent="Local review · This Korean Mini Talk is not published.";
    document.querySelector(".player-card").before(reviewNotice);
  }
  if (lesson.format === "level0") document.body.classList.add("level0-player");
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
  var lessons = allLessons.filter(function (item) { return item.level === lesson.level && item.type === lesson.type && item.format === lesson.format; });
  var lessonIndex = lessons.findIndex(function (item) { return item.id === lesson.id; });
  var previousLesson = lessons[lessonIndex - 1] || null;
  var nextLesson = lessons[lessonIndex + 1] || null;
  var storageKey = "talktag-audio:" + lesson.id;
  var pauseControl = null;
  var level0Prompt = null;
  var guidedVariants = window.TalkTagNativeGuidedVariants?.forLesson(lesson, native, audio, readState, saveState) || null;
  var expectsNativeVariants = lesson.type === "guided" &&
    ((native.language === "ko" && lesson.level !== "A0" && [1, 2, 3].includes(Number(lesson.unit))) ||
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
  document.getElementById("playerHeaderMeta").textContent = lesson.level + " · EPISODE " + String(lesson.unit || 1).padStart(3, '0') + (lesson.partCount>1?" · PART "+lesson.partIndex:"");
  document.getElementById("lessonKicker").textContent = lesson.level + " · UNIT " + lesson.unit + (lesson.format === "mini-talks" ? " · MINI TALKS" : lesson.type === "plain" ? " · ESSAYS & ARTICLES" : " · GUIDED PRACTICE");
  document.getElementById("lessonTitle").textContent = lesson.title;
  if ((lesson.type === "plain" || lesson.format === "level0") && lesson.artwork) {
    var figure = document.createElement("figure");
    figure.className = lesson.format === "level0" ? "level0-scene" : "essay-cover-figure";
    var cover = document.createElement("img");
    cover.src = lesson.artwork;
    cover.alt = lesson.artworkAlt || "";
    cover.width = 720;
    cover.height = 480;
    figure.appendChild(cover);
    document.getElementById("lessonSummary").before(figure);
  }
  document.getElementById("lessonSummary").textContent = lesson.summary;
  if(lesson.format==="mini-talks"&&(lesson.scene||lesson.briefing))document.getElementById("lessonSummary").hidden=true;
  if(lesson.format==="mini-talks"&&lesson.briefing){
    document.getElementById("sceneBriefingText").textContent=lesson.scene||lesson.briefing;
    document.getElementById("sceneBriefing").hidden=false;
  }
  if (lesson.format === "level0") {
    var level0Summary = document.getElementById("lessonSummary");
    level0Prompt = document.createElement("section");
    level0Prompt.className = "level0-response";
    level0Prompt.hidden = true;
    var level0Heading = document.createElement("h2");
    level0Heading.textContent = "Your turn";
    var level0Question = document.createElement("p");
    level0Question.textContent = lesson.tinyPrompt;
    var translatedPrompts = window.TalkTagKoreanLevel0Prompts?.[lesson.id];
    if (translatedPrompts && window.TalkTagKoreanSupport) {
      var updateLevel0Prompt = function (language) {
        var shown = translatedPrompts[language] ? language : "en";
        level0Question.textContent = translatedPrompts[shown];
        level0Question.lang = shown;
      };
      window.TalkTagKoreanSupport.subscribe(updateLevel0Prompt);
      updateLevel0Prompt(window.TalkTagKoreanSupport.get());
    }
    var level0Action = document.createElement("button");
    level0Action.type = "button";
    level0Action.textContent = "I said it · Complete";
    level0Action.addEventListener("click", function(){ if(completeButton.getAttribute("aria-pressed")!=="true") completeButton.click(); });
    level0Prompt.append(level0Heading,level0Question,level0Action);
    level0Summary.after(level0Prompt);
  }
  document.getElementById("infoLevel").textContent = lesson.format === "level0" ? "Start Here · Level 0 (TalkTag pre-A1)" : "Learning guide · " + lesson.level;
  document.getElementById("infoLocation").textContent = lesson.format === "mini-talks" ? "Episode " + String(lesson.unit).padStart(3,"0") + " · " + lesson.expressions.length + " dialogue turns" : lesson.type === "plain" ? lesson.level + " · Essay " + lesson.unit : "Part " + lesson.part + " · Chapter " + lesson.chapter + " · Unit " + lesson.unit;
  document.getElementById("infoDuration").textContent = lesson.durationLong;
  document.getElementById("duration").textContent = lesson.durationLabel;
  document.getElementById("libraryBack").href = native.libraryPage+"?type=" + lesson.type + "&level=" + lesson.level + (miniPreview&&lesson.format==="mini-talks"?"&preview=mini-talks-001":"");
  document.getElementById("libraryBack").textContent = "← " + lesson.level + " Library";
  document.getElementById("infoLibraryBack").href = native.libraryPage+"?type=" + lesson.type + "&level=" + lesson.level + (miniPreview&&lesson.format==="mini-talks"?"&preview=mini-talks-001":"");
  if (lesson.type === "plain") {
    document.body.classList.add("essay-player");
    document.getElementById("playerHeaderMeta").textContent = lesson.format==="mini-talks"?"MINI TALKS · "+lesson.level:"ESSAYS & ARTICLES";
    var info = document.querySelectorAll(".lesson-info dd");
    info[0].textContent = lesson.format==="mini-talks"?"Mini Talks":"Essays & Articles";
    info[2].textContent = lesson.genre;
    info[5].textContent = lesson.format==="mini-talks"?"AI-voiced Korean dialogue · technical QC":"Original audio";
    document.querySelector("#scriptPanel h2").textContent = native.language === 'ko' ? "Korean script" : "English script";
    document.querySelector(".class-bridge p").textContent = lesson.format==="mini-talks"?"Listen to the exchange, speak along if you like, then retell the situation in your own Korean.":native.language === 'ko' ? "Recall the key idea, summarise it, then tell it to a partner in your own Korean." : "핵심 내용을 기억에서 꺼내 요약하고, 자신의 표현으로 파트너에게 이야기해 보세요.";
    document.querySelector(".lesson-info dd:nth-of-type(3)").textContent = lesson.format==="mini-talks"?"Korean Mini Talks · " + String(lesson.unit).padStart(3, '0'):native.language === 'ko' ? "Korean Audio Essays & Articles · " + String(lesson.unit).padStart(3, '0') : "Audio Essays & Articles · " + String(lesson.unit).padStart(3, '0');
  }
  if (lesson.training) {
    document.getElementById("playerHeaderMeta").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(lesson.format==="mini-talks"?3:2,"0");
    document.getElementById("lessonKicker").textContent = lesson.level + " · EPISODE " + String(lesson.unit).padStart(3,"0") + (lesson.format==="mini-talks"?" · MINI TALKS":" · GUIDED PRACTICE");
    document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(3,"0") + " · " + lesson.expressions.length + (lesson.format==="mini-talks"?" dialogue turns":" sentences");
    if (lesson.partIndex) {
      document.getElementById("playerHeaderMeta").textContent += " · " + lesson.partIndex + "/" + lesson.partCount;
      document.getElementById("lessonKicker").textContent = lesson.level + " · " + String(lesson.unit).padStart(2,"0") + "–" + String(lesson.partIndex).padStart(2,"0");
      document.getElementById("infoLocation").textContent = "Episode " + String(lesson.unit).padStart(2,"0") + " · " + lesson.partIndex + "/" + lesson.partCount + " · 문장 " + lesson.sentenceStart + "–" + lesson.sentenceEnd;
    }
    var fields = document.querySelectorAll(".lesson-info dd");
    fields[2].textContent = lesson.format==="mini-talks"?"Sound Check · Mini Talks":"Sound Check · Guided Practice";
    fields[5].textContent = lesson.format==="mini-talks"?"One natural dialogue · replay whenever you like":"문장별 " + lesson.training.defaultReps + "회 반복";
    if (lesson.format === "level0") {
      document.getElementById("playerHeaderMeta").textContent = "A0 · " + String(lesson.unit).padStart(3,"0");
      document.getElementById("lessonKicker").textContent = "START HERE · LEVEL 0 · ONE EXPRESSION";
      document.getElementById("infoLocation").textContent = "One useful expression · " + String(lesson.unit).padStart(3,"0");
      fields[5].textContent = "One expression · listen and say it " + lesson.training.defaultReps + " times";
    }
    var drillStatus = document.createElement("div");
    drillStatus.className = "guided-drill-status";
    drillStatus.setAttribute("aria-live","off");
    document.querySelector(".lesson-track-nav").after(drillStatus);
    var lastDrillLabel = "";
    function updateDrillStatus() {
      var time = audio.currentTime;
      var cue = lesson.training.cues.find(function (cue) { return cue.s <= time && time < cue.e; });
      var label = lesson.format==="mini-talks"?
        (cue?"Line " + (cue.i+1) + " / " + lesson.expressions.length + " · listening":
          time>=lesson.training.endingCueStart?"Dialogue complete · ending cue":
          time>=lesson.training.startCueEnd?"Listening to the dialogue":"Opening cue"):
        cue ? (lesson.format === "level0" ? "Expression " : "문장 ") + (cue.i+1) + " / " + lesson.expressions.length + " · " + (lesson.format === "level0" ? "repeat " : "반복 ") + cue.r + " / " + lesson.training.defaultReps + (time < cue.voiceEnd ? (lesson.format === "level0" ? " · listen" : " · 듣기") : (lesson.format === "level0" ? " · speak" : " · 따라 말하기")) : (lesson.format === "level0" ? (time >= lesson.training.endingCueStart ? "Five listens complete · ending ding" : "Starting ding · one expression · five repeats") : (time >= lesson.training.endingCueStart ? "전체 훈련 완료 · 종료음" : "시작음 · 문장별 " + lesson.training.defaultReps + "회 반복"));
      if (label !== lastDrillLabel) { drillStatus.textContent = label; lastDrillLabel = label; }
    }
    audio.addEventListener("timeupdate",updateDrillStatus);
    audio.addEventListener("seeked",updateDrillStatus);
    updateDrillStatus();
    if (lesson.format!=="mini-talks"&&!legacyPlayback && (!expectsNativeVariants || guidedVariants)) pauseControl = window.TalkTagGuidedPause?.mount({ audio: audio, lesson: lesson, anchor: native.language === 'ko' ? document.querySelector('.transport') : document.querySelector('#progress'), readState: readState, saveState: saveState, playButton: playButton, english: native.ui === 'en' });
  }
  if (!guidedVariants) audio.src = legacyPlayback && lesson.legacyAudio ? lesson.legacyAudio : lesson.audio;
  appendList("scriptList", lesson.expressions);
  appendList("meaningList", lesson.meanings);
  if (!lesson.meanings.length) { meaningButton.hidden = true; meaningPanel.hidden = true; }
  var plainKoreanScript = native.language === "ko" && lesson.type === "plain" && lesson.format!=="mini-talks";
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
    var meaningNodes = Array.from(pairedList.querySelectorAll('.native-line-meaning'));
    var selectorAnchor = document.createElement('div');
    document.querySelector('.script-controls')?.after(selectorAnchor);
    window.TalkTagKoreanSupport?.mount(selectorAnchor, {
      id:lesson.id, source:lesson.expressions, english:lesson.meanings, translations:window.TalkTagKoreanTranslations?.[lesson.id] || {},
      onChange:function (translated, shown) {
        meaningNodes.forEach(function (node, index) { node.lang=shown; node.textContent=translated[index]; });
      }
    });
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
  if (level0Prompt) level0Prompt.hidden = !initial.listened;
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
    if (lesson.type !== "guided" || lesson.format === "level0") return;
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
      if (level0Prompt) { level0Prompt.hidden = false; level0Prompt.scrollIntoView({behavior:"smooth",block:"center"}); }
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
  prevButton.addEventListener("click", function () { if (previousLesson) location.href = native.playerPage+"?id=" + encodeURIComponent(previousLesson.id)+(miniPreview&&lesson.format==="mini-talks"?"&preview=mini-talks-001":""); });
  nextButton.addEventListener("click", function () { if (nextLesson) location.href = native.playerPage+"?id=" + encodeURIComponent(nextLesson.id)+(miniPreview&&lesson.format==="mini-talks"?"&preview=mini-talks-001":""); });
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
