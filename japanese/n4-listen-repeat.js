(function () {
  "use strict";

  var lessons = window.TalkTagN4AudioLessons || [];
  var list = document.getElementById("lessonList");

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  if (!lessons.length) {
    list.innerHTML = '<article class="empty-card"><h2>음원을 불러오지 못했습니다.</h2><p>잠시 후 페이지를 새로고침해 주세요.</p></article>';
    return;
  }

  list.innerHTML = lessons.map(function (lesson) {
    return '<article class="lesson-card" data-completion-id="japanese:n4:' + escapeHtml(lesson.id) + '" data-completion-legacy-key="talktag-japanese-n4:' + escapeHtml(lesson.id) + '">' +
      '<div class="lesson-art" aria-hidden="true">' + String(lesson.order).padStart(2, "0") + '</div>' +
      '<div class="lesson-copy"><small>' + escapeHtml(lesson.level + " · UNIT " + String(lesson.order).padStart(2, "0") + " · " + lesson.source) + '</small>' +
      '<h2>' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.description) + '</p>' +
      '<div class="lesson-meta"><span>' + escapeHtml(lesson.range) + '</span><span>Guided practice</span><span>R2 streaming</span></div></div>' +
      '<div class="lesson-card-actions" data-completion-actions><a class="lesson-action" href="jlpt-n4-audio-player.html?id=' + encodeURIComponent(lesson.id) + '">START LISTENING →</a></div>' +
      '</article>';
  }).join("");
  if (window.TalkTagCompletion) window.TalkTagCompletion.mount(list);
})();
