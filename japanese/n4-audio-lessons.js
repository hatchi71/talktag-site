(function () {
  "use strict";

  var base = "https://audio.talktag.co.kr/Japanese/test-preppers/jlpt/n4/listen-repeat/v1/";
  var files = [
    "0110 JLPT(Tsuki).mp3",
    "1120 JLPT(Tsuki).mp3",
    "2130 JLPT(Tsuki).mp3",
    "3140 JLPT(Tsuki).mp3",
    "4150 JLPT(Tsuki).mp3",
    "5160 JLPT(Sky).mp3",
    "JLPT(Sky) 6170.mp3",
    "JLPT(Sky) 7180.mp3",
    "JLPT(Sky) 8190.mp3",
    "JLPT(Sky) 91100.mp3"
  ];

  window.TalkTagN4AudioLessons = files.map(function (file, index) {
    var start = index * 10 + 1;
    var end = (index + 1) * 10;
    var source = index < 5 ? "Tsuki" : "Sky";
    return {
      id: "n4-" + String(index + 1).padStart(2, "0"),
      order: index + 1,
      level: "N4",
      range: start + "–" + end + "번",
      title: start + "–" + end + "번 표현",
      description: "JLPT N4 " + start + "번부터 " + end + "번까지 듣고 따라 말하는 반복 훈련 음원입니다.",
      source: source,
      audio: base + encodeURIComponent(file)
    };
  });
})();
