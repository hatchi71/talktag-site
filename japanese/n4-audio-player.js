(function () {
  "use strict";

  var lessons = window.TalkTagN4AudioLessons || [];
  var requestedId = new URLSearchParams(location.search).get("id");
  var lesson = lessons.find(function (item) { return item.id === requestedId; }) || lessons[0];
  if (!lesson) return;

  var lessonIndex = lessons.findIndex(function (item) { return item.id === lesson.id; });
  var previousLesson = lessons[lessonIndex - 1] || null;
  var nextLesson = lessons[lessonIndex + 1] || null;
  var audio = document.getElementById("audio");
  var playButton = document.getElementById("playButton");
  var progress = document.getElementById("progress");
  var currentTime = document.getElementById("currentTime");
  var duration = document.getElementById("duration");
  var speedSelect = document.getElementById("speedSelect");
  var loopButton = document.getElementById("loopButton");
  var status = document.getElementById("audioStatus");
  var storageKey = "talktag-japanese-n4:" + lesson.id;

  function formatTime(value) {
    if (!Number.isFinite(value)) return "00:00";
    var seconds = Math.max(0, Math.floor(value));
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (error) { return {}; }
  }

  function saveState(patch) {
    var next = Object.assign({}, readState(), patch);
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  }

  function lessonUrl(item) {
    return "jlpt-n4-audio-player.html?id=" + encodeURIComponent(item.id);
  }

  document.title = "N4 · " + lesson.title + " · TalkTag 日本語";
  document.getElementById("lessonKicker").textContent = "N4 · UNIT " + String(lesson.order).padStart(2, "0") + " · GUIDED PRACTICE";
  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("lessonSummary").textContent = lesson.description;
  document.getElementById("infoUnit").textContent = String(lesson.order).padStart(2, "0");
  document.getElementById("infoRange").textContent = lesson.range;
  document.getElementById("infoSource").textContent = lesson.source + " · R2 streaming";
  audio.src = lesson.audio;

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
  if (initial.speed) {
    audio.playbackRate = Number(initial.speed);
    speedSelect.value = String(initial.speed);
  }

  function applyMetadata() {
    duration.textContent = formatTime(audio.duration);
    document.getElementById("infoDuration").textContent = formatTime(audio.duration);
    if (resumePending > 0 && resumePending < audio.duration - 5) {
      audio.currentTime = resumePending;
      currentTime.textContent = formatTime(resumePending);
      progress.value = Math.round((resumePending / audio.duration) * 1000);
    }
  }

  audio.addEventListener("loadedmetadata", applyMetadata);
  audio.addEventListener("canplay", applyMetadata, { once: true });
  audio.addEventListener("timeupdate", function () {
    currentTime.textContent = formatTime(audio.currentTime);
    progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
    if (audio.currentTime > 0 && Math.floor(audio.currentTime) % 5 === 0) saveState({ position: audio.currentTime });
  });
  audio.addEventListener("play", function () { playButton.textContent = "❚❚ PAUSE"; status.textContent = "재생 중입니다."; });
  audio.addEventListener("pause", function () { playButton.textContent = "▶ PLAY"; if (audio.currentTime > 0) saveState({ position: audio.currentTime }); });
  audio.addEventListener("ended", function () { if (!audio.loop) { saveState({ position: 0 }); status.textContent = "재생을 마쳤습니다. 다시 듣거나 다음 음원으로 이동하세요."; } });
  audio.addEventListener("error", function () { status.textContent = "음원을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; });

  playButton.addEventListener("click", function () {
    if (audio.paused) {
      var promise = audio.play();
      if (promise) promise.catch(function () { status.textContent = "재생을 시작하지 못했습니다. 네트워크 연결을 확인해 주세요."; });
      resumePending = 0;
    } else {
      audio.pause();
    }
  });
  document.getElementById("rewindButton").addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  document.getElementById("restartButton").addEventListener("click", function () { audio.currentTime = 0; if (audio.paused) audio.play(); });
  progress.addEventListener("input", function () { if (audio.duration) { audio.currentTime = (Number(progress.value) / 1000) * audio.duration; resumePending = 0; } });
  speedSelect.addEventListener("change", function () { audio.playbackRate = Number(speedSelect.value); saveState({ speed: audio.playbackRate }); });
  loopButton.addEventListener("click", function () { audio.loop = !audio.loop; loopButton.classList.toggle("on", audio.loop); loopButton.setAttribute("aria-checked", String(audio.loop)); saveState({ loop: audio.loop }); });
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  prevButton.disabled = !previousLesson;
  nextButton.disabled = !nextLesson;
  prevButton.addEventListener("click", function () { if (previousLesson) location.href = lessonUrl(previousLesson); });
  nextButton.addEventListener("click", function () { if (nextLesson) location.href = lessonUrl(nextLesson); });
  window.addEventListener("beforeunload", function () { if (audio.currentTime > 0) saveState({ position: audio.currentTime }); });
})();
