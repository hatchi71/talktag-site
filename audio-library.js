(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var type = params.get("type") === "plain" ? "plain" : "guided";
  var level = (params.get("level") || "A1").toUpperCase();
  var validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (validLevels.indexOf(level) === -1) level = "A1";

  var copy = type === "guided" ? {
    eyebrow: "GUIDED LISTEN & REPEAT",
    title: "Guided Practice",
    description: "꼭 알아야 하는 실용적인 표현을 원어민의 음성을 듣고 따라하며 소리로 숙달합니다."
  } : {
    eyebrow: "AUDIO ESSAYS & ARTICLES",
    title: "Essays & Articles",
    description: "이야기를 듣고, 요약하고, 다시 불러내어 자신의 언어로 다시 이야기해 봅니다."
  };
  document.getElementById("libraryEyebrow").textContent = copy.eyebrow;
  document.getElementById("libraryTitle").textContent = copy.title;
  document.getElementById("libraryDescription").textContent = copy.description;
  document.title = copy.title + " · TalkTag Audio Library";
  document.getElementById("essayGuide").hidden = type !== "plain";
  document.getElementById(type === "guided" ? "guidedSwitch" : "plainSwitch").classList.add("active");
  function renderLevel() {
  document.getElementById("guidedSwitch").href = "audio-library.html?type=guided&level=" + level;
  document.getElementById("plainSwitch").href = "audio-library.html?type=plain&level=" + level;

  document.querySelectorAll("[data-level]").forEach(function (link) {
    var value = link.getAttribute("data-level");
    link.href = "audio-library.html?type=" + type + "&level=" + value;
    link.classList.toggle("active", value === level);
    if (value === level) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  var list = document.getElementById("lessonList");
  var lessons = (window.TalkTagAudioLessons || []).filter(function (lesson) {
    return lesson.available !== false && lesson.type === type && lesson.level === level;
  });
  if (lessons.length) {
    list.innerHTML = lessons.map(function (lesson) {
      if (lesson.type === "plain") {
        return '<article class="lesson-card"><div class="lesson-art">聴</div><div class="lesson-copy"><small>' + escapeHtml(lesson.level + ' · ' + lesson.genre) + '</small><h2>' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.description) + '</p><div class="lesson-meta"><span>' + escapeHtml(lesson.durationLabel) + '</span><span>Listen · Rebuild · Tell</span></div></div><a class="lesson-action" href="audio-player.html?id=' + encodeURIComponent(lesson.id) + '">START LISTENING →</a></article>';
      }
      return '<article class="lesson-card"><div class="lesson-art">' + escapeHtml(lesson.art) + '</div><div class="lesson-copy"><small>' + escapeHtml(lesson.level) + ' · PART ' + lesson.part + ' · CHAPTER ' + lesson.chapter + ' · UNIT ' + lesson.unit + '</small><h2>' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.description) + '</p><div class="lesson-meta"><span>' + escapeHtml(lesson.durationLabel) + '</span><span>Provider-edited</span><span>Offline class prep</span></div></div><a class="lesson-action" href="audio-player.html?id=' + encodeURIComponent(lesson.id) + '">START LISTENING →</a></article>';
    }).join("");
  } else {
    list.innerHTML = '<article class="empty-card"><h2>' + level + ' 자료를 준비하고 있습니다.</h2><p>' + (type === "plain" ? '새로운 이야기가 준비되면 이곳에서 만나보실 수 있습니다.' : '관리자 업로드 기능이 연결되면 게시된 음원이 이곳에 자동으로 표시됩니다.') + '</p></article>';
  }
  }
  renderLevel();

  function changeLevel(value) {
    level = validLevels.indexOf(value) === -1 ? "A1" : value;
    var list = document.getElementById("lessonList");
    // Keep the document from shrinking under the learner's current position.
    list.style.minHeight = list.getBoundingClientRect().height + "px";
    renderLevel();
  }
  document.getElementById("lessonList").setAttribute("aria-live", "polite");
  document.querySelectorAll("[data-level]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      var value = link.getAttribute("data-level");
      if (value === level) return;
      var url = new URL(location.href);
      url.searchParams.set("level", value);
      history.pushState(null, "", url);
      changeLevel(value);
    });
  });
  window.addEventListener("popstate", function () {
    changeLevel((new URLSearchParams(location.search).get("level") || "A1").toUpperCase());
  });
})();
