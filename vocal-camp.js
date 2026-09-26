(function () {
  "use strict";
  var data = window.TalkTagVocalCamp;
  if (!data) return;
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function link(text, href, cls) { var node = el("a", cls, text); node.href = href; return node; }
  function stageURL(id) { return "vocal-stage.html?stage=" + encodeURIComponent(id); }
  function validAudio(url) {
    try { return new URL(url).protocol === "https:"; } catch (_) { return false; }
  }
  function lessonsFor(stage, series) {
    return data.lessons.filter(function (lesson) {
      return lesson.stage === stage && (!series || lesson.series === series) && lesson.status === "published" && validAudio(lesson.audio);
    }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  var grid = document.getElementById("stageGrid");
  if (grid) data.stages.forEach(function (stage) {
    var card = link("", stageURL(stage.id), "stage-card");
    var top = el("div", "card-top");
    top.append(el("span", "stage-number", stage.id), el("span", "badge", lessonsFor(stage.id).length ? "음원 " + lessonsFor(stage.id).length + "개" : "음원 준비 중"));
    card.append(top, el("h3", "", stage.name), el("div", "subtitle", stage.title), el("p", "", stage.goal), el("span", "card-link", stage.series.length + "개 시리즈 살펴보기 →"));
    grid.append(card);
  });
  var view = document.getElementById("stageView");
  if (!view) return;
  var id = (new URLSearchParams(location.search).get("stage") || "V1").toUpperCase();
  var stage = data.stages.find(function (item) { return item.id === id; });
  if (!stage) {
    var error = el("section", "error-box");
    error.append(el("h1", "", "단계를 찾을 수 없습니다."), link("Vocal Camp에서 단계 선택하기 →", "vocal-camp.html"));
    view.append(error); return;
  }
  document.title = stage.id + " · " + stage.name + " | TalkTag Vocal Camp";
  var nav = el("nav", "stage-nav"); nav.setAttribute("aria-label", "Vocal Camp 단계 선택");
  data.stages.forEach(function (item) {
    var a = link(item.id, stageURL(item.id)); a.setAttribute("aria-label", item.id + " " + item.title);
    if (item.id === id) a.setAttribute("aria-current", "page");
    nav.append(a);
  });
  view.append(nav, el("div", "ey", "VOCAL CAMP · STAGE " + id + (stage.milestone ? " · 성장의 전환점" : "")), el("h1", "stage-title", stage.name), el("h2", "", stage.title), el("p", "intro", stage.goal), el("p", "meaning", stage.logic));
  var output = el("section", "output"); output.append(el("h2", "", "훈련 후, 내 말로 해보기"), el("p", "", stage.output)); view.append(output);
  var head = el("div", "section-head"); var heading = el("div");
  heading.append(el("div", "ey", "TOPIC SERIES"), el("h2", "", "주제별 음원 시리즈"));
  head.append(heading, el("span", "quiet", "먼저 듣고, 의미를 더하고, 내 상황으로 바꾸세요."));view.append(head);
  var list = el("div", "series-list");
  stage.series.forEach(function (series, index) {
    var section = el("section", "series"); section.id = series.id;
    var h = el("div", "series-head"); var title = el("div");
    title.append(el("div", "ey", "SERIES " + String(index + 1).padStart(2, "0")), el("h3", "", series.name));
    var lessons = lessonsFor(id, series.id);
    h.append(title, el("span", "badge", lessons.length ? lessons.length + "개 음원" : "음원 준비 중"));
    section.append(h, el("p", "", series.description));
    if (!lessons.length) section.append(el("div", "empty", "이 시리즈의 전용 음원을 제작하고 있습니다. 준비가 끝나면 여기에서 듣고 훈련할 수 있습니다."));
    lessons.forEach(function (lesson) { section.append(renderLesson(lesson)); });
    list.append(section);
  });
  view.append(list);
  var foot = el("nav", "stage-footer"); foot.setAttribute("aria-label", "이전 다음 단계");
  var index = data.stages.indexOf(stage);
  foot.append(index ? link("← " + data.stages[index - 1].id + " 이전 단계", stageURL(data.stages[index - 1].id)) : link("← Vocal Camp", "vocal-camp.html"));
  if (index < data.stages.length - 1) foot.append(link(data.stages[index + 1].id + " 다음 단계 →", stageURL(data.stages[index + 1].id)));
  else foot.append(link("Story Camp에서 재구성하기 →", "story-camp.html"));
  view.append(foot);

  function renderLesson(lesson) {
    var article = el("article", "lesson");
    article.append(el("h4", "", lesson.title));
    if (lesson.finalOutput) article.append(el("p", "", "내 말로 해보기 · " + lesson.finalOutput));
    var audio = el("audio"); audio.controls = true; audio.preload = "none"; audio.src = lesson.audio;
    audio.setAttribute("aria-label", lesson.title + " 음원");
    var status = el("div", "audio-status");status.setAttribute("role", "status");
    var key = "talktag-vocal-" + lesson.id;
    function readState() { try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (_) { return {}; } }
    function saveState(update) { try { localStorage.setItem(key, JSON.stringify(Object.assign(readState(), update))); } catch (_) {} }
    var saved = readState();
    var tools = el("div", "player-tools");
    var rewind = el("button", "", "↶ 10초");rewind.type = "button";
    rewind.addEventListener("click", function () { if (audio.readyState >= 1) audio.currentTime = Math.max(0, audio.currentTime - 10); });
    var speedLabel = el("label", "", "재생 속도 ");var speed = el("select");
    [.75,1,1.25,1.5].forEach(function (rate) { var option = el("option", "", rate + "×"); option.value = rate; speed.append(option); });speed.value = "1";
    speed.addEventListener("change", function () { audio.playbackRate = Number(speed.value); });speedLabel.append(speed);
    var loop = el("button", "", "반복 꺼짐");loop.type = "button";loop.setAttribute("aria-pressed", "false");
    loop.addEventListener("click", function () { audio.loop = !audio.loop;loop.setAttribute("aria-pressed", String(audio.loop));loop.textContent = audio.loop ? "반복 켜짐" : "반복 꺼짐"; });
    var complete = el("button");complete.type = "button";
    function setComplete(done) { complete.setAttribute("aria-pressed", String(done));complete.textContent = done ? "✓ 훈련 완료" : "훈련 완료 표시"; }
    setComplete(!!saved.completed);
    complete.addEventListener("click", function () { var done = complete.getAttribute("aria-pressed") !== "true";setComplete(done);saveState({completed:done}); });
    tools.append(rewind, speedLabel, loop, complete);
    audio.addEventListener("loadedmetadata", function () {
      if (Number.isFinite(saved.position) && saved.position > 0 && saved.position < audio.duration - 2) { audio.currentTime = saved.position;status.textContent = "지난 위치에서 이어 들을 수 있습니다."; }
    }, {once:true});
    audio.addEventListener("play", function () {
      document.querySelectorAll("audio").forEach(function (other) { if (other !== audio) other.pause(); });
      status.textContent = "";
    });
    audio.addEventListener("pause", function () { saveState({position:audio.currentTime}); });
    var lastSaved = -1;
    audio.addEventListener("timeupdate", function () { var second = Math.floor(audio.currentTime);if (second % 5 === 0 && second !== lastSaved) { lastSaved = second;saveState({position:audio.currentTime}); } });
    audio.addEventListener("ended", function () { saveState({position:0});status.textContent = "이제 내용을 자신의 상황으로 바꾸어 말해 보세요."; });
    audio.addEventListener("error", function () { status.textContent = "음원을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요."; });
    window.addEventListener("pagehide", function () { if (audio.readyState >= 1) saveState({position:audio.ended ? 0 : audio.currentTime}); });
    article.append(audio, tools, status);
    [["스크립트 확인하기",lesson.script],["한국어 의미 확인하기",lesson.meaning]].forEach(function (item) {
      if (!item[1]) return;
      var details = el("details");details.append(el("summary", "", item[0]), el("div", "script", item[1]));article.append(details);
    });
    return article;
  }
})();
