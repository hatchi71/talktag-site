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
    title: "Natural Listening",
    description: "반복 없이 이슈와 주제에 관한 글을 자연스럽게 듣습니다."
  };
  document.getElementById("libraryEyebrow").textContent = copy.eyebrow;
  document.getElementById("libraryTitle").textContent = copy.title;
  document.getElementById("libraryDescription").textContent = copy.description;
  document.getElementById(type === "guided" ? "guidedSwitch" : "plainSwitch").classList.add("active");
  document.getElementById("guidedSwitch").href = "audio-library.html?type=guided&level=" + level;
  document.getElementById("plainSwitch").href = "audio-library.html?type=plain&level=" + level;

  document.querySelectorAll("[data-level]").forEach(function (link) {
    var value = link.getAttribute("data-level");
    link.href = "audio-library.html?type=" + type + "&level=" + value;
    link.classList.toggle("active", value === level);
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
      return '<article class="lesson-card"><div class="lesson-art">' + escapeHtml(lesson.art) + '</div><div class="lesson-copy"><small>' + escapeHtml(lesson.level) + ' · PART ' + lesson.part + ' · CHAPTER ' + lesson.chapter + ' · UNIT ' + lesson.unit + '</small><h2>' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.description) + '</p><div class="lesson-meta"><span>' + escapeHtml(lesson.durationLabel) + '</span><span>Provider-edited</span><span>Offline class prep</span></div></div><a class="lesson-action" href="audio-player.html?id=' + encodeURIComponent(lesson.id) + '">START LISTENING →</a></article>';
    }).join("");
  } else {
    list.innerHTML = '<article class="empty-card"><h2>' + level + ' 자료를 준비하고 있습니다.</h2><p>관리자 업로드 기능이 연결되면 게시된 음원이 이곳에 자동으로 표시됩니다.</p></article>';
  }
})();
