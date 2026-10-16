/* Replace Korean essay display metadata only when the complete line release is present. */
(() => {
  'use strict';
  const root = window.TalkTagNativeCatalogs;
  const release = window.TalkTagKoreanEssayVariants;
  if (!root?.ko || release?.publicationReady !== true || release.cards?.length !== 6) return;
  const format = seconds => {
    const whole = Math.round(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };
  root.ko = root.ko.map(lesson => {
    if (lesson.type !== 'plain' || Number(lesson.unit) !== 1) return lesson;
    const card = release.cards.find(item => item.id === lesson.id);
    const variant = card?.variants?.find(item => Number(item.ratio) === 2.5);
    if (!card || card.lines.length !== lesson.expressions.length || !variant) return lesson;
    return { ...lesson, legacyAudio: lesson.audio, legacyDurationSeconds: lesson.durationSeconds,
      audio: variant.audio, audioRevision: variant.sha256.slice(0, 16),
      durationSeconds: variant.durationSeconds, durationLabel: format(variant.durationSeconds),
      durationLong: format(variant.durationSeconds), contentRevision: 'ko-essay-lines-001-v1-20261016' };
  });
})();
