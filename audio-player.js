(function () {
  "use strict";
  var audio = document.getElementById("audio");
  var playButton = document.getElementById("playButton");
  var rewindButton = document.getElementById("rewindButton");
  var restartButton = document.getElementById("restartButton");
  var progress = document.getElementById("progress");
  var currentTime = document.getElementById("currentTime");
  var duration = document.getElementById("duration");
  var speedSelect = document.getElementById("speedSelect");
  var loopButton = document.getElementById("loopButton");
  var scriptButton = document.getElementById("scriptButton");
  var meaningButton = document.getElementById("meaningButton");
  var scriptPanel = document.getElementById("scriptPanel");
  var meaningPanel = document.getElementById("meaningPanel");
  var completeButton = document.getElementById("completeButton");
  var completeState = document.getElementById("completeState");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  var lessons = (window.TalkTagAudioLessons || []).filter(function (item) { return item.available !== false && item.type === "guided"; });
  var requestedId = new URLSearchParams(location.search).get("id");
  var lessonIndex = lessons.findIndex(function (item) { return item.id === requestedId; });
  if (lessonIndex < 0) lessonIndex = 0;
  var lesson = lessons[lessonIndex];
  var previousLesson = lessons[lessonIndex - 1] || null;
  var nextLesson = lessons[lessonIndex + 1] || null;
  var storageKey = "talktag-audio:" + lesson.id;

  function appendList(targetId, items) {
    var target = document.getElementById(targetId);
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.textContent = item;
      target.appendChild(row);
    });
  }

  document.title = "TalkTag · " + lesson.level + " " + lesson.title;
  document.getElementById("playerHeaderMeta").textContent = lesson.level + " · OFFLINE CLASS PREP";
  document.getElementById("lessonKicker").textContent = lesson.level + " · UNIT " + lesson.unit + " · GUIDED PRACTICE";
  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("lessonSummary").textContent = lesson.summary;
  document.getElementById("infoLevel").textContent = "CEFR " + lesson.level;
  document.getElementById("infoLocation").textContent = "Part " + lesson.part + " · Chapter " + lesson.chapter + " · Unit " + lesson.unit;
  document.getElementById("infoDuration").textContent = lesson.durationLong;
  document.getElementById("duration").textContent = lesson.durationLabel;
  document.getElementById("libraryBack").href = "audio-library.html?type=guided&level=" + lesson.level;
  document.getElementById("libraryBack").textContent = "← " + lesson.level + " Library";
  document.getElementById("infoLibraryBack").href = "audio-library.html?type=guided&level=" + lesson.level;
  audio.src = lesson.audio;
  appendList("scriptList", lesson.expressions);
  appendList("meaningList", lesson.meanings);
  prevButton.disabled = !previousLesson;
  nextButton.disabled = !nextLesson;
  if (previousLesson) prevButton.setAttribute("aria-label", "Previous lesson: " + previousLesson.title);
  if (nextLesson) nextButton.setAttribute("aria-label", "Next lesson: " + nextLesson.title);

  function readState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (error) { return {}; }
  }
  function saveState(patch) {
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
    completeState.textContent = done ? "COMPLETED" : "NOT COMPLETED";
    completeState.classList.toggle("done", done);
    completeButton.textContent = done ? "✓ COMPLETED · MARK NOT COMPLETED" : "MARK AS COMPLETED";
    completeButton.classList.toggle("done", done);
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
  var resumePending = Number(initial.position || 0);
  audio.loop = Boolean(initial.loop);
  loopButton.classList.toggle("on", audio.loop);
  loopButton.setAttribute("aria-checked", String(audio.loop));
  if (initial.speed) { audio.playbackRate = Number(initial.speed); speedSelect.value = String(initial.speed); }
  updateCompletion(Boolean(initial.completed));

  function applyInitialResume() {
    duration.textContent = formatTime(audio.duration);
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
    if (resumePending > 0 && audio.currentTime < 0.25) return;
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
    if (audio.currentTime > 0 && Math.floor(audio.currentTime) % 5 === 0) saveState({ position: audio.currentTime });
  });
  audio.addEventListener("play", function () { playButton.textContent = "❚❚ PAUSE"; });
  audio.addEventListener("pause", function () {
    playButton.textContent = "▶ PLAY";
    if (audio.currentTime > 0) saveState({ position: audio.currentTime });
  });
  audio.addEventListener("ended", function () { if (!audio.loop) updateCompletion(Boolean(saveState({ position: 0, completed: true }).completed)); });
  playButton.addEventListener("click", function () {
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
  rewindButton.addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  restartButton.addEventListener("click", function () { audio.currentTime = 0; if (audio.paused) audio.play(); });
  prevButton.addEventListener("click", function () { if (previousLesson) location.href = "audio-player.html?id=" + encodeURIComponent(previousLesson.id); });
  nextButton.addEventListener("click", function () { if (nextLesson) location.href = "audio-player.html?id=" + encodeURIComponent(nextLesson.id); });
  progress.addEventListener("input", function () { if (audio.duration) audio.currentTime = (Number(progress.value) / 1000) * audio.duration; });
  speedSelect.addEventListener("change", function () { audio.playbackRate = Number(speedSelect.value); saveState({ speed: audio.playbackRate }); });
  loopButton.addEventListener("click", function () { audio.loop = !audio.loop; loopButton.classList.toggle("on", audio.loop); loopButton.setAttribute("aria-checked", String(audio.loop)); saveState({ loop: audio.loop }); });
  scriptButton.addEventListener("click", function () { togglePanel(scriptButton, scriptPanel, meaningButton, meaningPanel); });
  meaningButton.addEventListener("click", function () { togglePanel(meaningButton, meaningPanel, scriptButton, scriptPanel); });
  completeButton.addEventListener("click", function () { var done = !Boolean(readState().completed); saveState({ completed: done }); updateCompletion(done); });
  window.addEventListener("beforeunload", function () {
    if (audio.currentTime > 0) saveState({ position: audio.currentTime });
  });
})();
