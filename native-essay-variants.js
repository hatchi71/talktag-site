/* Pre-rendered sentence-level pause variants for Korean Audio Essays & Articles. */
(() => {
  'use strict';
  const RATIOS = [2, 2.5, 3, 3.5];
  const manifest = () => window.TalkTagKoreanEssayVariants;
  function cueAt(cues, time) {
    return cues.find(cue => cue.s <= time && time < cue.e) || cues.at(-1);
  }
  function equivalentTime(from, to, time) {
    if (!(time > 0)) return 0;
    const cue = cueAt(from.cues, time);
    if (!cue) return 0;
    const target = to.cues[cue.i];
    if (!target) return 0;
    if (time < cue.voiceEnd) {
      const fraction = Math.max(0, (time - cue.s) / Math.max(0.001, cue.voiceEnd - cue.s));
      return target.s + fraction * (target.voiceEnd - target.s);
    }
    const fraction = Math.min(1, (time - cue.voiceEnd) / Math.max(0.001, cue.e - cue.voiceEnd));
    return target.voiceEnd + fraction * (target.e - target.voiceEnd);
  }
  function originalTiming(lesson) {
    const midpoints = lesson.sentenceGaps.map(([end, next]) => (end + next) / 2);
    const starts = [0, ...midpoints];
    const ends = [...midpoints, lesson.legacyDurationSeconds || lesson.durationSeconds];
    return { cues: starts.map((s, i) => ({ s, voiceEnd: lesson.sentenceGaps[i]?.[0] || ends[i], e: ends[i], i })) };
  }
  function valid(card, lesson) {
    if (!card || card.id !== lesson.id || card.lines?.length !== lesson.expressions.length || card.variants?.length !== 4) return false;
    if (card.lines.some((line, index) => line.text !== lesson.expressions[index] || line.meaning !== lesson.meanings[index])) return false;
    return RATIOS.every(ratio => card.variants.some(variant => Number(variant.ratio) === ratio &&
      variant.audio && variant.cues?.length === card.lines.length && Number.isFinite(variant.durationSeconds)));
  }
  function toOriginalPosition(lesson, state) {
    const position = Number(state?.position || 0);
    if (!(position > 0) || state.positionMode !== 'essay-variant') return position;
    const release = manifest();
    if (state.positionRevision !== release?.releaseBase) return 0;
    const card = release.cards?.find(item => item.id === lesson.id);
    const source = card?.variants?.find(item => Number(item.ratio) === Number(state.positionRatio));
    return source ? equivalentTime(source, originalTiming(lesson), position) : 0;
  }
  function fallback(lesson, native) {
    if (document.getElementById('nativeVariantFallback')) return;
    const notice = document.createElement('p');
    notice.id = 'nativeVariantFallback';
    notice.className = 'segment-fallback';
    notice.append('The new line-by-line recording is unavailable. ');
    const link = document.createElement('a');
    link.href = native.playerPage + '?id=' + encodeURIComponent(lesson.id) + '&legacy=1';
    link.textContent = 'Play the original essay recording →';
    notice.append(link);
    document.querySelector('.time-row')?.after(notice);
  }
  function forLesson(lesson, native, audio, readState, saveState) {
    if (native.language !== 'ko' || lesson?.type !== 'plain' || new URLSearchParams(location.search).has('legacy')) return null;
    const release = manifest();
    const card = release?.cards?.find(item => item.id === lesson.id);
    if (!valid(card, lesson)) { fallback(lesson, native); return null; }
    const revision = release.releaseBase;
    const savedRatio = Number(readState().pauseMultiplier);
    let current = card.variants.find(item => Number(item.ratio) === (RATIOS.includes(savedRatio) ? savedRatio : 2.5));
    const cues = current.cues.map(item => ({ ...item }));
    window.TalkTagEssayMedia ||= {};
    window.TalkTagEssayMedia[lesson.id] = { sync: {
      language: 'ko', lines: lesson.expressions.map((text, index) => ({ en: text, ko: lesson.meanings[index] })), cues
    } };
    audio.segmented = true;
    audio.dataset.segmentedAudio = 'true';
    document.body.dataset.segmentedAudio = 'true';
    audio.src = current.audio;
    let pending = null;
    let switchToken = 0;
    function savePosition(position, ratio) {
      saveState({ position, pauseMultiplier: ratio, positionMode: 'essay-variant', positionRatio: ratio, positionRevision: revision });
    }
    function migratePosition(state) {
      const position = Number(state?.position || 0);
      if (!(position > 0)) return 0;
      let from = originalTiming(lesson);
      if (state.positionMode === 'essay-variant') {
        if (state.positionRevision !== revision) return 0;
        from = card.variants.find(item => Number(item.ratio) === Number(state.positionRatio));
        if (!from) return 0;
      }
      const mapped = Math.min(equivalentTime(from, current, position), current.durationSeconds - 0.1);
      savePosition(mapped, Number(current.ratio));
      return mapped;
    }
    function status(message) {
      const node = document.getElementById('essayPausePending');
      if (node) node.textContent = message;
    }
    function switchTo(ratio) {
      const next = card.variants.find(item => Number(item.ratio) === ratio);
      if (!next || next === current) return;
      const wasPlaying = !audio.paused;
      const mapped = equivalentTime(current, next, audio.currentTime);
      const token = ++switchToken;
      pending = null;
      audio.dataset.segmentSwitching = 'true';
      audio.pause();
      current = next;
      cues.splice(0, cues.length, ...next.cues);
      savePosition(mapped, ratio);
      audio.dispatchEvent(new Event('talktag-audio-seek'));
      status('Applying the new speaking pause…');
      audio.addEventListener('loadedmetadata', function loaded() {
        audio.removeEventListener('loadedmetadata', loaded);
        if (token !== switchToken) return;
        audio.currentTime = Math.min(mapped, Math.max(0, audio.duration - 0.1));
        delete audio.dataset.segmentSwitching;
        status('');
        if (wasPlaying) audio.play().catch(() => status('Press Play to continue.'));
      });
      audio.src = next.audio;
      audio.load();
    }
    audio.setPauseMultiplier = value => {
      const ratio = Number(value);
      if (!RATIOS.includes(ratio)) return;
      if (ratio === Number(current.ratio)) { pending = null; status(''); return; }
      const cue = cueAt(current.cues, audio.currentTime);
      if (!audio.paused && cue && audio.currentTime < cue.voiceEnd) {
        pending = ratio;
        status('The new pause starts after this sentence.');
      } else switchTo(ratio);
    };
    audio.addEventListener('timeupdate', () => {
      if (pending === null || audio.paused) return;
      const cue = cueAt(current.cues, audio.currentTime);
      if (!cue || audio.currentTime >= cue.voiceEnd) switchTo(pending);
    });
    audio.addEventListener('pause', () => { if (pending !== null && !audio.dataset.segmentSwitching) switchTo(pending); });
    audio.addEventListener('error', () => { delete audio.dataset.segmentSwitching; fallback(lesson, native); });
    return { migratePosition, toOriginalPosition: time => equivalentTime(current, originalTiming(lesson), time) };
  }
  window.TalkTagNativeEssayVariants = { forLesson, equivalentTime, valid, toOriginalPosition };
})();
