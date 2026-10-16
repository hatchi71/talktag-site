/* Guided L&R 001: line-sourced, precisely timed native-audio playback. */
(() => {
  'use strict';

  const EPISODE_001 = /^guided-(?:a1|a2|b1|b2|c1|c2)-01$/;
  const RATIOS = [2, 2.5, 3, 3.5];

  function storedRatio(id) {
    try {
      const state = JSON.parse(localStorage.getItem('talktag-audio:' + id) || '{}');
      const ratio = Number(state.pauseMultiplier);
      return RATIOS.includes(ratio) ? ratio : 2.5;
    } catch (_) { return 2.5; }
  }

  function findCue(cues, time) {
    return cues.find(cue => cue.s <= time && time < cue.e);
  }

  function equivalentTime(oldVariant, newVariant, time) {
    if (time >= oldVariant.endingCueStart) {
      return Math.min(newVariant.durationSeconds, newVariant.endingCueStart + time - oldVariant.endingCueStart);
    }
    const oldCue = findCue(oldVariant.cues, time);
    if (!oldCue) {
      const firstOld = oldVariant.cues[0]?.s || 0;
      const firstNew = newVariant.cues[0]?.s || 0;
      return firstOld > 0 ? Math.min(firstNew, time * firstNew / firstOld) : time;
    }
    const nextCue = newVariant.cues.find(cue => cue.i === oldCue.i && cue.r === oldCue.r);
    if (!nextCue) return 0;
    if (time < oldCue.voiceEnd) {
      const fraction = (time - oldCue.s) / Math.max(0.001, oldCue.voiceEnd - oldCue.s);
      return nextCue.s + fraction * (nextCue.voiceEnd - nextCue.s);
    }
    const fraction = (time - oldCue.voiceEnd) / Math.max(0.001, oldCue.e - oldCue.voiceEnd);
    return nextCue.voiceEnd + fraction * (nextCue.e - nextCue.voiceEnd);
  }

  function legacyVariant(lesson) {
    const training = lesson?.training;
    if (!training?.cues || !Number.isFinite(training.endingCueStart)) return null;
    return {
      cues: training.cues,
      endingCueStart: training.endingCueStart,
      durationSeconds: training.durationSeconds || training.endingCueStart
    };
  }

  function saveSegmentPosition(id, position, ratio) {
    try {
      const key = 'talktag-audio:' + id;
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({
        ...state, position, pauseMultiplier: ratio,
        positionMode: 'segmented', positionRatio: ratio, segmentVersion: 2
      }));
    } catch (_) { /* Playback remains usable when storage is unavailable. */ }
  }

  function showFallback(id, message) {
    console.error('TalkTag line-timed audio:', message);
    const anchor = document.querySelector('.time-row');
    if (!anchor || document.getElementById('segmentFallback')) return;
    const notice = document.createElement('p');
    notice.id = 'segmentFallback';
    notice.className = 'segment-fallback';
    notice.textContent = '새 001 음원을 불러올 수 없습니다. ';
    const link = document.createElement('a');
    link.href = 'audio-player.html?id=' + encodeURIComponent(id) + '&legacy=1';
    link.textContent = '기존 음원 재생하기 →';
    notice.append(link);
    anchor.after(notice);
  }

  let activeMedia = null;
  window.TalkTagSegmented001 = {
    toLegacyPosition(lesson, state) {
      const old = Number(state?.position || 0);
      if (!(old > 0) || !EPISODE_001.test(lesson?.id || '') ||
          state?.positionMode === 'legacy' || (state?.segmentVersion !== 2 && state?.positionMode !== 'segmented')) return old;
      const card = window.TalkTagGuided001Variants?.cards?.find(item => item.id === lesson.id);
      const from = card?.variants?.find(variant => Number(variant.ratio) === Number(state.positionRatio));
      const to = legacyVariant(lesson);
      return from && to ? equivalentTime(from, to, old) : old;
    },
    forLesson(lesson) {
      if (!EPISODE_001.test(lesson?.id || '') || new URLSearchParams(location.search).has('legacy')) return null;
      const manifest = window.TalkTagGuided001Variants;
      const card = manifest?.cards?.find(item => item.id === lesson.id);
      if (!card || card.repetitions !== lesson.training?.defaultReps ||
          card.lines.length !== lesson.expressions.length || card.variants?.length !== RATIOS.length ||
          card.lines.some((line, index) => line.text !== lesson.expressions[index] || line.meaning !== lesson.meanings[index])) {
        showFallback(lesson.id, 'Variant manifest is missing or does not match the published script.');
        return null;
      }
      if (card.variants.some(variant => !RATIOS.includes(Number(variant.ratio)) ||
          !variant.audio || !Array.isArray(variant.cues) ||
          variant.cues.length !== card.lines.length * card.repetitions)) {
        showFallback(lesson.id, 'Variant manifest has incomplete audio or cues.');
        return null;
      }

      const audio = document.getElementById('audio');
      const originalCues = lesson.training.cues.map(cue => ({ ...cue }));
      const originalEndingCueStart = lesson.training.endingCueStart;
      const originalVariant = {
        cues: originalCues,
        endingCueStart: originalEndingCueStart,
        durationSeconds: lesson.training.durationSeconds || originalEndingCueStart
      };
      const cues = lesson.training.cues;
      let currentVariant = card.variants.find(variant => Number(variant.ratio) === storedRatio(lesson.id));
      let pendingRatio = null;
      let sourceRevision = 0;
      let switching = null;

      function useCues(variant) {
        cues.splice(0, cues.length, ...variant.cues);
        lesson.training.endingCueStart = variant.endingCueStart;
      }

      function notice(message) {
        const target = document.getElementById('guidedPausePending');
        if (target) target.textContent = message;
      }

      function swapRatio(ratio) {
        const nextVariant = card.variants.find(variant => Number(variant.ratio) === ratio);
        if (!nextVariant || nextVariant === currentVariant) return;
        const previousVariant = currentVariant;
        const wasPlaying = switching ? switching.wasPlaying : !audio.paused;
        const previousTime = switching ? switching.mapped : audio.currentTime;
        const mapped = equivalentTime(previousVariant, nextVariant, previousTime);
        const revision = ++sourceRevision;
        pendingRatio = null;
        switching = { revision, mapped, wasPlaying };
        audio.dataset.segmentSwitching = 'true';
        saveSegmentPosition(lesson.id, mapped, ratio);
        audio.pause();
        currentVariant = nextVariant;
        useCues(nextVariant);
        audio.src = nextVariant.audio;
        audio.load();
        notice(ratio.toFixed(1) + '배 말하기 간격을 적용하는 중…');
        audio.addEventListener('loadedmetadata', function onLoaded() {
          audio.removeEventListener('loadedmetadata', onLoaded);
          if (revision !== sourceRevision) return;
          audio.currentTime = Math.min(mapped, Math.max(0, audio.duration - 0.05));
          switching = null;
          delete audio.dataset.segmentSwitching;
          saveSegmentPosition(lesson.id, audio.currentTime, ratio);
          notice('');
          if (!wasPlaying) return;
          const promise = audio.play();
          if (promise?.catch) promise.catch(() => {
            notice('새 간격으로 계속하려면 재생 버튼을 누르세요.');
          });
        });
      }

      function applyPendingAtSafeBoundary() {
        if (pendingRatio === null || audio.paused) return;
        const cue = findCue(currentVariant.cues, audio.currentTime);
        if (!cue || audio.currentTime >= cue.voiceEnd) swapRatio(pendingRatio);
      }

      useCues(currentVariant);
      audio.segmented = true;
      Object.defineProperty(audio, 'segmentRatio', { configurable: true, get: () => Number(currentVariant.ratio) });
      audio.dataset.segmentedAudio = 'true';
      document.body.dataset.segmentedAudio = 'true';
      audio.src = currentVariant.audio;
      audio.preload = 'metadata';
      audio.migrateSavedPosition = state => {
        const old = Number(state.position || 0);
        if (!(old > 0)) return old;
        if (state.positionMode === 'segmented' || (!state.positionMode && state.segmentVersion === 2)) {
          const from = card.variants.find(variant => Number(variant.ratio) === Number(state.positionRatio));
          return from && from !== currentVariant ? equivalentTime(from, currentVariant, old) : old;
        }
        if (state.segmentVersion === 1 && !state.positionMode) return old;
        return equivalentTime(originalVariant, currentVariant, old);
      };
      audio.setPauseMultiplier = value => {
        const ratio = Number(value);
        if (!RATIOS.includes(ratio)) return;
        if (ratio === Number(currentVariant.ratio)) { pendingRatio = null; notice(''); return; }
        const cue = findCue(currentVariant.cues, audio.currentTime);
        if (!audio.paused && cue && audio.currentTime < cue.voiceEnd) {
          pendingRatio = ratio;
          notice('현재 문장이 끝난 뒤 새 말하기 간격이 적용됩니다.');
        } else swapRatio(ratio);
      };
      audio.addEventListener('timeupdate', applyPendingAtSafeBoundary);
      audio.addEventListener('pause', () => {
        if (pendingRatio !== null) swapRatio(pendingRatio);
      });
      audio.addEventListener('error', () => {
        switching = null;
        delete audio.dataset.segmentSwitching;
        showFallback(lesson.id, audio.error?.message || 'Media load failed.');
      });
      audio.addEventListener('playing', () => notice(''));
      audio.addEventListener('ended', () => { pendingRatio = null; });
      activeMedia = audio;
      return audio;
    },
    get activeMedia() { return activeMedia; }
  };
})();
