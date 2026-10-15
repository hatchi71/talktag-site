(function () {
  "use strict";
  function params() { return new URLSearchParams(location.search); }
  function level() { return (params().get("level") || "A1").toUpperCase(); }
  function contentId(kind) { return kind + ":" + level() + ":" + (Math.max(1, Number(params().get("id")) || 1)); }
  function mountList(kind) {
    var list = document.getElementById("list"), items = list && list.querySelectorAll(".item");
    if (!items || !items.length) return false;
    items.forEach(function (item, index) { item.dataset.completionId = kind + ":" + level() + ":" + (index + 1); });
    if (window.TalkTagCompletion) window.TalkTagCompletion.mount(list);
    if (kind === "readable" && !document.querySelector(".tt-level-completed")) {
      var shelf = document.createElement("details"); shelf.className = "tt-level-completed";
      shelf.innerHTML = '<summary>완료한 카드 · ' + level() + ' <span></span></summary><div class="tt-level-completed-list"></div>';
      list.after(shelf);
      var update = function () {
        var finished = shelf.querySelector(".tt-level-completed-list");
        Array.from(document.querySelectorAll('.tt-completion-card[data-completion-id^="readable:' + level() + ':"]')).sort(function (a, b) { return Number(a.dataset.completionId.split(":")[2]) - Number(b.dataset.completionId.split(":")[2]); }).forEach(function (card) {
          var done = Boolean(window.TalkTagCompletion?.get(card.dataset.completionId));
          (done ? finished : list).appendChild(card);
        });
        shelf.querySelector("summary span").textContent = finished.children.length;
        shelf.hidden = !finished.children.length;
      };
      window.addEventListener("talktag:completion-change", update);
      window.addEventListener("storage", update);
      window.addEventListener("pageshow", update);
      update();
    }
    return true;
  }
  function mountListWhenReady(kind) { if (mountList(kind)) return; var list = document.getElementById("list"); if (!list) return; var observer = new MutationObserver(function () { if (mountList(kind)) observer.disconnect(); }); observer.observe(list, { childList: true }); }
  function mountDetail(kind) {
    var attach = function () { var nav = document.querySelector("main .nav"); if (!nav || document.querySelector(".tt-detail-completion")) return false; var holder = document.createElement("section"); holder.className = "tt-detail-completion"; holder.dataset.completionId = contentId(kind); var copy = document.createElement("p"); copy.textContent = "학습이나 훈련을 마쳤다면 완료로 표시하세요. 목록에서도 같은 상태로 보입니다."; holder.appendChild(copy); nav.parentNode.insertBefore(holder, nav); if (window.TalkTagCompletion) window.TalkTagCompletion.mount(holder.parentNode); return true; };
    if (attach()) return; var observer = new MutationObserver(function () { if (attach()) observer.disconnect(); }); observer.observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", function () { var page = location.pathname.split("/").pop(); if (page === "readable-level.html") mountListWhenReady("readable"); if (page === "storycamp-level.html") mountListWhenReady("storycamp"); if (page === "readable-strict.html" || page === "readable-advanced.html") mountDetail("readable"); if (page === "storycamp-reader.html") mountDetail("storycamp"); });
})();
