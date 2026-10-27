/* Connect the language-specific catalog to the shared library/player runtime. */
(function () {
  "use strict";
  var native = window.TalkTagNative;
  var catalogs = window.TalkTagNativeCatalogs;
  if (!native || !catalogs || !Array.isArray(catalogs[native.language])) return;
  var current = Array.isArray(window.TalkTagAudioLessons) ? window.TalkTagAudioLessons : [];
  var languageLessons = catalogs[native.language];
  if (native.language === "ko") {
    var levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    window.TalkTagKoreanMiniReleaseReady = levels.every(function (level) {
      var id = "mt-ko-" + level.toLowerCase() + "-001";
      return languageLessons.some(function (lesson) {
        var support = window.TalkTagKoreanTranslations?.[id];
        return lesson.id === id && lesson.type === "plain" && lesson.format === "mini-talks" &&
          lesson.level === level && lesson.status === "published" && lesson.available === true &&
          /^https:\/\/audio\.talktag\.co\.kr\/Korean\/mini-talks\/001\//.test(lesson.audio || "") &&
          /^[a-f0-9]{64}$/.test(lesson.checksum || lesson.sourceSha256 || "") &&
          /^\/assets\/mini-talks\/ko\/001\//.test(lesson.artwork || "") &&
          typeof lesson.artworkAlt === "string" && Boolean(lesson.artworkAlt.trim()) &&
          Array.isArray(lesson.expressions) && lesson.expressions.length > 0 &&
          lesson.expressions.length === lesson.meanings?.length &&
          lesson.expressions.length === lesson.speakers?.length &&
          lesson.training?.kind === "mini-talks" &&
          lesson.training.cues?.length === lesson.expressions.length &&
          /^[a-f0-9]{64}$/.test(support?.sourceHash || "") &&
          Array.isArray(support?.source) && lesson.expressions.every(function (line, index) { return line === support.source[index]; }) &&
          ["vi", "ne", "km", "my", "th", "ja"].every(function (code) {
            return ["reviewed", "ai-reviewed"].includes(support.review?.[code]?.status) &&
              Number(support.review[code].passes) >= 2 &&
              Array.isArray(support.translations?.[code]) &&
              support.translations[code].length === lesson.expressions.length &&
              support.translations[code].every(function (line) { return typeof line === "string" && Boolean(line.trim()); });
          });
      });
    });
  }
  var ids = new Set(current.map(function (lesson) { return lesson.id; }));
  window.TalkTagAudioLessons = current.concat(languageLessons.filter(function (lesson) {
    return !ids.has(lesson.id);
  }));
})();
