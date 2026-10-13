/* Level-first browsing reads existing lesson and family records without migration. */
(() => {
  'use strict';
  const KEY = 'talktag-camp-completion-overrides:v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  const id = (camp, level, number) => `${camp}camp:${level}:${Number(number)}`;
  const legacy = (camp, number) => `${camp}camp-family:${String(number).padStart(3, '0')}`;
  function done(camp, level, number) {
    const lessonId = id(camp, level, number);
    if (window.TalkTagCompletion?.get(lessonId)) return true;
    return read()[lessonId] !== false && Boolean(window.TalkTagCompletion?.get(legacy(camp, number)));
  }
  function set(camp, level, number, value) {
    const lessonId = id(camp, level, number), overrides = read();
    if (!value && window.TalkTagCompletion?.get(legacy(camp, number))) overrides[lessonId] = false;
    else delete overrides[lessonId];
    localStorage.setItem(KEY, JSON.stringify(overrides));
    window.TalkTagCompletion?.set(lessonId, value);
  }
  window.TalkTagCampProgress = { done, set, id };
})();
