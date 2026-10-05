(function () {
  "use strict";
  var page = document.querySelector("[data-story-level]");
  var container = document.getElementById("storySteps");
  var range = document.getElementById("storyDisplayLevel");
  var control = document.querySelector(".story-display .sync-display-control");
  if (!page || !container || !range || !control) return;
  var levels = {a1:{start:1,end:10},a2:{start:11,end:20},b1:{start:21,end:30},b2:{start:31,end:40},c1:{start:41,end:50},c2:{start:51,end:60}};
  var level = String(page.dataset.storyLevel || "").toLowerCase();
  var sequence = levels[level];
  if (!sequence) return;
  var displayLabels = ["한자", "한자와 후리가나", "한자와 후리가나와 한국어 해석"];
  var storageKey = "talktag-japanese-story-display-v2";

  function text(className, value, lang) {
    var node = document.createElement("p");
    node.className = className;
    if (lang) node.lang = lang;
    node.textContent = value || "";
    return node;
  }
  function addLayeredText(parent, record, prefix) {
    parent.append(text(prefix + "-jp", record.jp, "ja"));
    parent.append(text(prefix + "-reading story-reading", record.reading, "ja"));
    parent.append(text(prefix + "-ko story-translation", record.ko, "ko"));
  }
  function renderStory(story, index) {
    var details = document.createElement("details");
    details.className = "story-item";
    if (index === 0) details.open = true;
    var summary = document.createElement("summary");
    summary.className = "story-summary";
    var number = document.createElement("span");
    number.className = "story-number";
    number.textContent = "STORY " + String(sequence.start + index).padStart(2, "0");
    var title = document.createElement("span");
    title.className = "story-title";
    addLayeredText(title, story.title || {}, "story-title");
    var meta = document.createElement("span");
    meta.className = "story-meta";
    meta.innerHTML = "6단계 <span aria-hidden=\"true\">⌄</span>";
    summary.append(number, title, meta);
    details.append(summary);
    var body = document.createElement("div");
    body.className = "story-body";
    body.append(text("story-instruction", "한 문장씩 더하며, 매 단계마다 처음부터 다시 말해 보세요.", "ko"));
    var cards = document.createElement("div");
    cards.className = "story-cards";
    (story.snowballCards || []).forEach(function (card) {
      var article = document.createElement("article");
      article.className = "story-card";
      var label = document.createElement("span");
      label.className = "story-card-label";
      label.textContent = card.label || String(card.step || "");
      article.append(label);
      addLayeredText(article, card, "story-card");
      cards.append(article);
    });
    body.append(cards);
    if (Array.isArray(story.map) && story.map.length) {
      var map = document.createElement("section");
      map.className = "story-map";
      var heading = document.createElement("h3");
      heading.textContent = "이야기 지도";
      var list = document.createElement("div");
      list.className = "story-map-list";
      story.map.forEach(function (item) {
        var chip = document.createElement("div");
        chip.className = "story-map-chip";
        addLayeredText(chip, item, "story-map");
        list.append(chip);
      });
      map.append(heading, list);
      body.append(map);
    }
    if (story.own) {
      var own = document.createElement("section");
      own.className = "story-own";
      var ownHeading = document.createElement("h3");
      ownHeading.textContent = "나의 이야기로 바꾸기";
      own.append(ownHeading);
      addLayeredText(own, story.own, "story-own");
      body.append(own);
    }
    details.append(body);
    return details;
  }
  function renderEmpty() {
    var fragment = document.createDocumentFragment();
    for (var number = sequence.start; number <= sequence.end; number += 1) {
      var article = document.createElement("article");
      article.className = "story-empty";
      article.innerHTML = "<span>STORY " + String(number).padStart(2, "0") + "</span><strong>준비 중</strong>";
      fragment.append(article);
    }
    container.replaceChildren(fragment);
  }
  function setDisplayLevel(value) {
    var levelValue = Math.max(0, Math.min(2, Number(value) || 0));
    range.value = String(levelValue);
    range.setAttribute("aria-valuetext", displayLabels[levelValue]);
    control.dataset.level = String(levelValue);
    container.dataset.displayLevel = String(levelValue);
    try { localStorage.setItem(storageKey, String(levelValue)); } catch (error) {}
  }
  function loadStories() {
    var sources = window.TalkTagJapaneseStoryCampSources || {};
    if (!sources[level]) { renderEmpty(); return; }
    container.setAttribute("aria-busy", "true");
    fetch(sources[level], { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Story data could not be loaded.");
        return response.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.stories)) throw new Error("Unexpected story data.");
        var stories = data.stories.filter(function (story) {
          return String(story.level || "").toLowerCase() === level;
        });
        if (stories.length !== 10) throw new Error("Unexpected story count.");
        var fragment = document.createDocumentFragment();
        stories.forEach(function (story, index) { fragment.append(renderStory(story, index)); });
        container.replaceChildren(fragment);
      })
      .catch(function () {
        renderEmpty();
        container.insertAdjacentHTML("afterbegin", "<p class=\"story-load-error\">이야기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>");
      })
      .finally(function () { container.removeAttribute("aria-busy"); });
  }
  var saved = 0;
  try { saved = Number(localStorage.getItem(storageKey) || 0); } catch (error) {}
  setDisplayLevel(saved);
  range.addEventListener("input", function () { setDisplayLevel(range.value); });
  range.addEventListener("change", function () { setDisplayLevel(range.value); });
  loadStories();
})();
