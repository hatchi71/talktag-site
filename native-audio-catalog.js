/* Connect the language-specific catalog to the shared library/player runtime. */
(function () {
  "use strict";
  var native = window.TalkTagNative;
  var catalogs = window.TalkTagNativeCatalogs;
  if (!native || !catalogs || !Array.isArray(catalogs[native.language])) return;
  var current = Array.isArray(window.TalkTagAudioLessons) ? window.TalkTagAudioLessons : [];
  var languageLessons = catalogs[native.language];
  var ids = new Set(current.map(function (lesson) { return lesson.id; }));
  window.TalkTagAudioLessons = current.concat(languageLessons.filter(function (lesson) {
    return !ids.has(lesson.id);
  }));
})();
