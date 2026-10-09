(function () {
  "use strict";
  var STORAGE_KEY = "talktag-content-completions:v1";
  function readAll() { try { var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); return value && typeof value === "object" ? value : {}; } catch (error) { return {}; } }
  function legacyCompleted(key) { if (!key) return false; try { var value = JSON.parse(localStorage.getItem(key) || "{}"); return Boolean(value && value.completed); } catch (error) { return false; } }
  function isCompleted(id, legacyKey) { return Boolean(readAll()[id]) || legacyCompleted(legacyKey); }
  function isManual(id, legacyKey) { var entry = readAll()[id]; return entry ? entry.source !== "automatic" : legacyCompleted(legacyKey); }
  function setCompleted(id, done, legacyKey, options) {
    var values = readAll();
    if (done) {
      var automatic = options && options.source === "automatic";
      if (!(automatic && values[id] && values[id].source === "manual")) values[id] = { completedAt: new Date().toISOString(), source: automatic ? "automatic" : "manual" };
    } else delete values[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    if (legacyKey) { try { var legacy = JSON.parse(localStorage.getItem(legacyKey) || "{}"); legacy.completed = done; localStorage.setItem(legacyKey, JSON.stringify(legacy)); } catch (error) { localStorage.setItem(legacyKey, JSON.stringify({ completed: done })); } }
    window.dispatchEvent(new CustomEvent("talktag:completion-change", { detail: { id: id, completed: done } }));
  }
  function cardDone(card, id, legacyKey) { return card.dataset.completionManualOnly === "true" ? isManual(id, legacyKey) : isCompleted(id, legacyKey); }
  function update(card, button, id, legacyKey) { var done = cardDone(card, id, legacyKey); card.classList.toggle("is-completed", done); button.setAttribute("aria-pressed", String(done)); button.textContent = done ? "완료됨" : "완료"; button.setAttribute("aria-label", done ? "학습 완료 취소" : "학습 완료로 표시"); }
  function enhance(element) {
    if (!element || element.dataset.completionReady === "true") return;
    var id = element.dataset.completionId; if (!id) return;
    var legacyKey = element.dataset.completionLegacyKey || ""; var card = element;
    if (element.tagName === "A") { card = document.createElement("article"); card.className = "tt-completion-card"; element.parentNode.insertBefore(card, element); card.appendChild(element); } else { card.classList.add("tt-completion-card"); }
    element.dataset.completionReady = "true"; card.dataset.completionId = id;
    var button = document.createElement("button"); button.type = "button"; button.className = "tt-completion-button";
    var status = document.createElement("span"); status.className = "tt-completion-status"; status.setAttribute("aria-live", "polite");
    var actionTarget = card.querySelector("[data-completion-actions]") || card; actionTarget.appendChild(button); card.appendChild(status); update(card, button, id, legacyKey);
    button.addEventListener("click", function (event) { event.preventDefault(); event.stopPropagation(); var done = !cardDone(card, id, legacyKey); setCompleted(id, done, legacyKey); if (button.isConnected) { update(card, button, id, legacyKey); status.textContent = done ? "학습 완료로 표시했습니다." : "완료 표시를 취소했습니다."; } });
  }
  function mount(root) { (root || document).querySelectorAll("[data-completion-id]").forEach(enhance); }
  function refresh(root) { (root || document).querySelectorAll(".tt-completion-card[data-completion-id]").forEach(function (card) { var source = card.querySelector("[data-completion-ready='true']") || card; var button = card.querySelector(".tt-completion-button"); if (button) update(card, button, card.dataset.completionId, source.dataset.completionLegacyKey || ""); }); }
  window.TalkTagCompletion = { mount: mount, refresh: refresh, get: isCompleted, getManual: isManual, set: setCompleted };
  document.addEventListener("DOMContentLoaded", function () { mount(document); });
  window.addEventListener("pageshow", function () { refresh(document); });
  window.addEventListener("storage", function (event) { if (event.key === STORAGE_KEY || (event.key && event.key.indexOf("talktag-") === 0)) refresh(document); });
  window.addEventListener("talktag:completion-change", function () { refresh(document); });
})();
