(function () {
  "use strict";
  if (new URLSearchParams(location.search).get("id") !== "aea-a1-001") return;
  // Local pilot: sentence boundaries estimated from the original recording's pauses.
  var starts = [0, 2.72, 5.80, 9.31, 12.69, 15.30, 18.84, 21.55, 26.00];
  var en = [
    "Every morning, I get up at seven.",
    "I open the window and look outside.",
    "The street is quiet, and the air is cool.",
    "I make a cup of coffee and sit by the window.",
    "Sometimes, I listen to music.",
    "Sometimes, I just enjoy the quiet morning.",
    "At eight, I get ready for work.",
    "I put on my shoes, take my bag, and leave home.",
    "It is a simple morning, but I like it."
  ];
  var ko = [
    "매일 아침 일곱 시에 일어납니다.",
    "창문을 열고 밖을 내다봅니다.",
    "거리는 조용하고 공기는 선선합니다.",
    "커피 한 잔을 만들어 창가에 앉습니다.",
    "가끔 음악을 듣기도 합니다.",
    "가끔은 그저 조용한 아침을 즐깁니다.",
    "여덟 시가 되면 출근 준비를 합니다.",
    "신발을 신고 가방을 챙겨 집을 나섭니다.",
    "아주 평범한 아침이지만, 저는 이런 시간이 좋습니다."
  ];
  var audio = document.getElementById("audio");
  var section = document.createElement("section");
  section.className = "sync-pilot";
  section.innerHTML = '<h2>Listen along · 문장 싱크 시범</h2><p>문장을 누르면 그 위치부터 재생합니다. 문장 전환 타이밍을 확인해 주세요.</p><div class="sync-toolbar"><button type="button" id="syncPlay">▶ 재생</button><label><input type="checkbox" id="syncFollow" checked> 자동 따라가기</label><label><input type="checkbox" id="syncKorean"> 한국어 해석</label></div><div class="sync-lines hide-ko" aria-label="문장별 스크립트"></div>';
  document.querySelector(".player-shell").after(section);
  var lines = section.querySelector(".sync-lines");
  var follow = section.querySelector("#syncFollow");
  var play = section.querySelector("#syncPlay");
  var buttons = en.map(function (text, i) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sync-line";
    button.setAttribute("aria-label", (i + 1) + "번 문장 재생: " + text);
    var english = document.createElement("span");
    english.textContent = text;
    var korean = document.createElement("span");
    korean.className = "sync-ko";
    korean.textContent = ko[i];
    button.append(english, korean);
    button.addEventListener("click", function () {
      if (audio.readyState < 1) return;
      audio.currentTime = starts[i];
      audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
      update();
    });
    lines.appendChild(button);
    return button;
  });
  var active = -1;
  function update() {
    var index = starts.length - 1;
    while (index > 0 && audio.currentTime < starts[index]) index -= 1;
    if (index === active) return;
    active = index;
    buttons.forEach(function (button, i) {
      button.classList.toggle("active", i === index);
      if (i === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    if (follow.checked) {
      var item = buttons[index].getBoundingClientRect();
      var box = lines.getBoundingClientRect();
      if (item.top < box.top || item.bottom > box.bottom) {
        lines.scrollTop += item.top - box.top - (box.height - item.height) / 2;
      }
    }
  }
  ["timeupdate", "seeked", "loadedmetadata"].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener("play", function () { play.textContent = "❚❚ 일시정지"; });
  audio.addEventListener("pause", function () { play.textContent = "▶ 재생"; });
  play.addEventListener("click", function () {
    if (audio.paused) audio.play().catch(function () { play.textContent = "▶ 다시 재생"; });
    else audio.pause();
  });
  section.querySelector("#syncKorean").addEventListener("change", function (event) {
    lines.classList.toggle("hide-ko", !event.target.checked);
  });
  follow.addEventListener("change", function () { active = -1; update(); });
  update();
})();
