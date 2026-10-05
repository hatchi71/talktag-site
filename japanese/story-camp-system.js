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
    meta.innerHTML = "카드 학습 <span aria-hidden=\"true\">⌄</span>";
    summary.append(number, title, meta);
    details.append(summary);
    var body = document.createElement("div");
    body.className = "story-body";
    var deck = document.createElement("div");
    deck.className = "story-deck";
    var deckStatus = document.createElement("div");
    deckStatus.className = "story-deck-status";
    var deckCount = document.createElement("strong");
    var deckLabel = document.createElement("span");
    deckStatus.append(deckCount, deckLabel);
    var progressTrack = document.createElement("div");
    progressTrack.className = "story-deck-track";
    var progress = document.createElement("span");
    progressTrack.append(progress);
    var jump = document.createElement("div");
    jump.className = "story-deck-jump";
    jump.setAttribute("aria-label", "학습 단계 바로가기");
    var slides = document.createElement("div");
    slides.className = "story-deck-slides";
    function slide(label, purpose, heading, guide) {
      var article = document.createElement("article");
      article.className = "story-deck-slide";
      article.dataset.label = label;
      if (purpose) article.append(text("story-deck-purpose", purpose, "ko"));
      if (heading) {
        var headingNode = document.createElement("h3");
        headingNode.textContent = heading;
        article.append(headingNode);
      }
      if (guide) article.append(text("story-deck-guide", guide, "ko"));
      return article;
    }
    (story.snowballCards || []).forEach(function (card, cardIndex, sourceCards) {
      var article = slide("누적 " + (cardIndex + 1) + (cardIndex === sourceCards.length - 1 ? " · 이야기 완성" : ""), "", "", "");
      article.classList.add("is-snowball");
      var cardBody = document.createElement("div");
      cardBody.className = "story-card";
      addLayeredText(cardBody, card, "story-card");
      article.append(cardBody);
      article.append(text("story-deck-cue story-snowball-cue", "이 문장까지 이야기의 처음부터 다시 말하거나 써 보세요.", "ko"));
      slides.append(article);
    });
    var finalCard = (story.snowballCards || []).slice(-1)[0] || {};
    var rewrite = slide("다시 쓰기", "2 · REWRITE", "전체 이야기 처음부터 다시 써보기", "지금까지 누적한 이야기 전체를 보지 않고 처음부터 다시 써 보세요. 다 쓴 뒤에만 완성된 이야기를 확인합니다.");
    var reference = document.createElement("details");
    reference.className = "story-reference";
    var referenceSummary = document.createElement("summary");
    referenceSummary.textContent = "완성된 이야기 확인하기";
    var referenceText = document.createElement("div");
    referenceText.className = "story-reference-text";
    addLayeredText(referenceText, finalCard, "story-card");
    reference.append(referenceSummary, referenceText);
    rewrite.append(reference);
    slides.append(rewrite);
    var recall = slide("회상", "3 · RECALL", "가리고 회상해서 다시 써보기", "노트와 원문을 모두 가리고, 기억나는 내용과 이야기의 흐름을 그대로 다시 써 보세요.");
    recall.append(text("story-deck-cue", "막힐 때만 시작–변화–결과의 순서를 떠올려 보세요.", "ko"));
    slides.append(recall);
    var retell = slide("말하기", "4 · RETELL", "스크립트 없이 말하기", "방금 쓴 내용도 다시 덮고, 이야기 전체를 처음부터 끝까지 자신의 표현으로 전달해 보세요.");
    retell.append(text("story-deck-cue", "멈추더라도 원문을 바로 보지 말고 기억나는 표현으로 끝까지 연결합니다.", "ko"));
    slides.append(retell);
    var transform = slide("변형", "5 · TRANSFORM", "나의 이야기로 변형하기", "원문의 구성과 주제는 유지하면서 인물, 장소, 이유, 행동 또는 결과를 바꾸어 나의 이야기나 의견으로 다시 써 보세요.");
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
      transform.append(map);
    }
    if (story.own) {
      var own = document.createElement("section");
      own.className = "story-own";
      var ownHeading = document.createElement("h3");
      ownHeading.textContent = "나의 이야기로 바꾸기";
      own.append(ownHeading);
      addLayeredText(own, story.own, "story-own");
      transform.append(own);
    }
    slides.append(transform);
    var share = slide("최종 말하기", "6 · SHARE", "새로 지은 이야기 말하기", "새로 쓴 나의 이야기나 의견을 다시 덮고, 파트너에게 스크립트 없이 자연스럽게 말해 보세요.");
    share.append(text("story-deck-cue", "파트너가 없다면 혼자 녹음한 뒤, 빠진 흐름이 없는지 다시 들어 보세요.", "ko"));
    slides.append(share);
    var actions = document.createElement("div");
    actions.className = "story-deck-actions";
    var menu = document.createElement("details");
    menu.className = "story-deck-menu";
    var menuSummary = document.createElement("summary");
    menuSummary.textContent = "•••";
    menuSummary.setAttribute("aria-label", "학습 메뉴");
    var menuPanel = document.createElement("div");
    var restart = document.createElement("button");
    restart.type = "button";
    restart.textContent = "처음부터 다시 보기";
    var listButton = document.createElement("button");
    listButton.type = "button";
    listButton.textContent = "이야기 목록으로";
    var jumpTitle = document.createElement("p");
    jumpTitle.className = "story-deck-menu-title";
    jumpTitle.textContent = "단계 이동";
    menuPanel.append(restart, listButton, jumpTitle, jump);
    menu.append(menuSummary, menuPanel);
    var previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "← 이전";
    var next = document.createElement("button");
    next.type = "button";
    next.className = "primary";
    next.textContent = "다음 →";
    actions.append(menu, previous, next);
    deck.append(deckStatus, progressTrack, slides, actions);
    body.append(deck);
    details.append(body);
    var slideNodes = Array.prototype.slice.call(slides.children);
    var storageKeyForStory = "talktag-japanese-story-card-" + level + "-" + String(sequence.start + index);
    var current = 0;
    try { current = Math.max(0, Math.min(slideNodes.length - 1, Number(localStorage.getItem(storageKeyForStory) || 0))); } catch (error) {}
    slideNodes.forEach(function (slideNode, slideIndex) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = String(slideIndex + 1);
      button.setAttribute("aria-label", (slideIndex + 1) + "단계 " + slideNode.dataset.label);
      button.addEventListener("click", function () { show(slideIndex); });
      jump.append(button);
    });
    function show(slideIndex) {
      current = Math.max(0, Math.min(slideNodes.length - 1, slideIndex));
      slideNodes.forEach(function (slideNode, itemIndex) {
        slideNode.classList.toggle("is-active", itemIndex === current);
        slideNode.setAttribute("aria-hidden", String(itemIndex !== current));
      });
      Array.prototype.forEach.call(jump.children, function (button, itemIndex) {
        button.classList.toggle("is-active", itemIndex === current);
        button.classList.toggle("is-seen", itemIndex < current);
        button.setAttribute("aria-current", itemIndex === current ? "step" : "false");
      });
      deckCount.textContent = (current + 1) + "/" + slideNodes.length + " · " + slideNodes[current].dataset.label;
      deckLabel.textContent = "";
      progress.style.width = ((current + 1) / slideNodes.length * 100) + "%";
      previous.disabled = current === 0;
      next.textContent = current === slideNodes.length - 1 ? "학습 마치기" : "다음 →";
      try { localStorage.setItem(storageKeyForStory, String(current)); } catch (error) {}
      jump.children[current].scrollIntoView({block:"nearest", inline:"center"});
    }
    previous.addEventListener("click", function () { show(current - 1); });
    next.addEventListener("click", function () {
      if (current === slideNodes.length - 1) { details.open = false; details.scrollIntoView({behavior:"smooth", block:"start"}); return; }
      show(current + 1);
    });
    restart.addEventListener("click", function () { menu.open = false; show(0); });
    listButton.addEventListener("click", function () { menu.open = false; details.open = false; details.scrollIntoView({behavior:"smooth", block:"start"}); });
    show(current);
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
