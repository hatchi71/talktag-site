/* Precisely timed, pre-rendered pause variants for Korean and Japanese GLR. */
(() => {
  'use strict';

  const RATIOS = [2, 2.5, 3, 3.5];

  function cueAt(cues, time) {
    return cues.find(cue => cue.s <= time && time < cue.e);
  }

  function equivalentTime(from, to, time) {
    if (!(time > 0)) return 0;
    if (time >= from.endingCueStart) {
      return Math.min(to.durationSeconds, to.endingCueStart + time - from.endingCueStart);
    }
    const source = cueAt(from.cues, time);
    if (!source) {
      const firstSource = from.cues[0]?.s || 0;
      const firstTarget = to.cues[0]?.s || 0;
      return firstSource > 0 ? Math.min(firstTarget, time * firstTarget / firstSource) : 0;
    }
    const target = to.cues.find(cue => cue.i === source.i && cue.r === source.r);
    if (!target) return 0;
    if (time < source.voiceEnd) {
      const fraction = (time - source.s) / Math.max(0.001, source.voiceEnd - source.s);
      return target.s + fraction * (target.voiceEnd - target.s);
    }
    const fraction = (time - source.voiceEnd) / Math.max(0.001, source.e - source.voiceEnd);
    return target.voiceEnd + fraction * (target.e - target.voiceEnd);
  }

  function manifestFor(language) {
    return language === 'ko' ? window.TalkTagKoreanGuidedVariants :
      language === 'ja' ? window.TalkTagJapaneseGuidedVariants : null;
  }

  function toFixedPosition(lesson, native, state) {
    const position = Number(state?.position || 0);
    if (!(position > 0) || state.positionMode !== 'native-variant') return position;
    const card = manifestFor(native.language)?.cards?.find(item => item.id === lesson.id);
    const source = card?.variants?.find(item => Number(item.ratio) === Number(state.positionRatio));
    const target = lesson.training && { cues: lesson.training.cues,
      endingCueStart: lesson.training.endingCueStart,
      durationSeconds: lesson.training.durationSeconds };
    return source && target ? equivalentTime(source, target, position) : 0;
  }

  function isValid(card, lesson) {
    const reps = lesson.training?.defaultReps;
    if (!card || card.id !== lesson.id || card.repetitions !== reps ||
        !Array.isArray(card.lines) || card.lines.length !== lesson.expressions.length ||
        !Array.isArray(card.variants) || card.variants.length !== RATIOS.length) return false;
    if (card.lines.some((line, index) => line.text !== lesson.expressions[index] ||
        line.meaning !== lesson.meanings[index])) return false;
    const actualRatios = card.variants.map(variant => Number(variant.ratio)).sort((a, b) => a - b);
    if (actualRatios.some((ratio, index) => ratio !== RATIOS[index])) return false;
    return card.variants.every(variant => variant.audio &&
      Number.isFinite(variant.durationSeconds) && Number.isFinite(variant.endingCueStart) &&
      Array.isArray(variant.cues) && variant.cues.length === card.lines.length * reps &&
      variant.cues.every((cue, index) => cue.i === Math.floor(index / reps) &&
        cue.r === index % reps + 1 &&
        Number.isFinite(cue.s) && Number.isFinite(cue.voiceEnd) && Number.isFinite(cue.e) &&
        cue.s < cue.voiceEnd && cue.voiceEnd < cue.e));
  }

  function fallbackNotice(lesson, native, message) {
    console.error('TalkTag native GLR variants:', message);
    const anchor = document.querySelector('.time-row');
    if (!anchor || document.getElementById('nativeVariantFallback')) return;
    const notice = document.createElement('p');
    notice.id = 'nativeVariantFallback';
    notice.className = 'segment-fallback';
    notice.textContent = native.ui === 'en' ?
      'The new recording could not be loaded. ' : '새 음원을 불러올 수 없습니다. ';
    const link = document.createElement('a');
    link.href = native.playerPage + '?id=' + encodeURIComponent(lesson.id) + '&legacy=1';
    link.textContent = native.ui === 'en' ? 'Play the fixed 2.5× recording →' : '고정 2.5배 음원 재생하기 →';
    notice.append(link);
    anchor.after(notice);
  }

  function forLesson(lesson, native, audio, readState, saveState) {
    if (lesson?.type !== 'guided' || !lesson.training ||
        new URLSearchParams(location.search).has('legacy')) return null;
    const manifest = manifestFor(native.language);
    if (!manifest?.cards) return null;
    const card = manifest.cards.find(item => item.id === lesson.id);
    if (!card) return null;
    if (!isValid(card, lesson)) {
      fallbackNotice(lesson, native, 'Variant manifest does not match the published card and script: ' + lesson.id);
      return null;
    }

    const revision = String(card.revision || manifest.revision || manifest.releaseBase || 'native-glr-20261016');
    const original = {
      cues: lesson.training.cues.map(cue => ({ ...cue })),
      endingCueStart: lesson.training.endingCueStart,
      durationSeconds: lesson.training.durationSeconds
    };
    const former = native.language === 'ko' ?
      window.TalkTagKoreanGuidedLegacyCatalog?.find(item => item.id === lesson.id &&
        JSON.stringify(item.expressions) === JSON.stringify(lesson.expressions) &&
        JSON.stringify(item.meanings) === JSON.stringify(lesson.meanings)) : null;
    const previousRecording = former?.training ? {
      cues: former.training.cues,
      endingCueStart: former.training.endingCueStart,
      durationSeconds: former.training.durationSeconds
    } : original;
    const savedRatio = Number(readState().pauseMultiplier);
    let current = card.variants.find(variant => Number(variant.ratio) ===
      (RATIOS.includes(savedRatio) ? savedRatio : 2.5));
    let pendingRatio = null;
    let switchRevision = 0;
    let switching = null;

    function setCues(variant) {
      lesson.training.cues.splice(0, lesson.training.cues.length, ...variant.cues);
      lesson.training.endingCueStart = variant.endingCueStart;
      lesson.training.durationSeconds = variant.durationSeconds;
    }

    function status(message) {
      const target = document.getElementById('guidedPausePending');
      if (target) target.textContent = message;
    }

    function savePosition(position, ratio) {
      saveState({ position, pauseMultiplier: ratio, positionMode: 'native-variant',
        positionRatio: ratio, positionRevision: revision });
    }

    function migratePosition(state) {
      const position = Number(state?.position || 0);
      if (!(position > 0)) return 0;
      let mapped = 0;
      if (state.positionMode === 'native-variant') {
        if (state.positionRevision !== revision) return 0;
        const source = card.variants.find(variant => Number(variant.ratio) === Number(state.positionRatio));
        mapped = source ? equivalentTime(source, current, position) : 0;
      } else {
        mapped = equivalentTime(previousRecording, current, position);
      }
      mapped = Math.min(mapped, Math.max(0, current.durationSeconds - 0.1));
      savePosition(mapped, Number(current.ratio));
      return mapped;
    }

    function swapRatio(ratio) {
      const next = card.variants.find(variant => Number(variant.ratio) === ratio);
      if (!next || next === current) return;
      const old = current;
      const wasPlaying = switching ? switching.wasPlaying : !audio.paused;
      const oldTime = switching ? switching.mapped : audio.currentTime;
      const mapped = equivalentTime(old, next, oldTime);
      const token = ++switchRevision;
      switching = { token, mapped, wasPlaying };
      pendingRatio = null;
      audio.dataset.segmentSwitching = 'true';
      audio.pause();
      current = next;
      setCues(next);
      savePosition(mapped, ratio);
      audio.dispatchEvent(new Event('talktag-audio-seek'));
      status(native.ui === 'en' ? 'Applying the new speaking pause…' : '새 말하기 간격을 적용하는 중…');
      audio.addEventListener('loadedmetadata', function onLoaded() {
        audio.removeEventListener('loadedmetadata', onLoaded);
        if (token !== switchRevision) return;
        audio.currentTime = Math.min(mapped, Math.max(0, audio.duration - 0.1));
        switching = null;
        delete audio.dataset.segmentSwitching;
        savePosition(audio.currentTime, ratio);
        status('');
        if (wasPlaying) {
          const promise = audio.play();
          promise?.catch?.(() => status(native.ui === 'en' ?
            'Press Play to continue with the new pause.' : '새 간격으로 계속하려면 재생 버튼을 누르세요.'));
        }
      });
      audio.src = next.audio;
      audio.load();
    }

    setCues(current);
    audio.segmented = true;
    audio.dataset.segmentedAudio = 'true';
    document.body.dataset.segmentedAudio = 'true';
    Object.defineProperty(audio, 'segmentRatio', { configurable: true, get: () => Number(current.ratio) });
    audio.src = current.audio;
    audio.setPauseMultiplier = value => {
      const ratio = Number(value);
      if (!RATIOS.includes(ratio)) return;
      if (ratio === Number(current.ratio)) { pendingRatio = null; status(''); return; }
      const cue = cueAt(current.cues, audio.currentTime);
      if (!audio.paused && cue && audio.currentTime < cue.voiceEnd) {
        pendingRatio = ratio;
        status(native.ui === 'en' ?
          'The new pause starts after the current spoken line.' :
          '현재 문장이 끝난 뒤 새 말하기 간격이 적용됩니다.');
      } else swapRatio(ratio);
    };
    audio.addEventListener('timeupdate', () => {
      if (pendingRatio === null || audio.paused) return;
      const cue = cueAt(current.cues, audio.currentTime);
      if (!cue || audio.currentTime >= cue.voiceEnd) swapRatio(pendingRatio);
    });
    audio.addEventListener('pause', () => {
      if (pendingRatio !== null && !switching) swapRatio(pendingRatio);
    });
    audio.addEventListener('error', () => {
      switching = null;
      delete audio.dataset.segmentSwitching;
      fallbackNotice(lesson, native, audio.error?.message || 'Media load failed: ' + audio.src);
    });
    audio.addEventListener('playing', () => status(''));
    audio.addEventListener('ended', () => { pendingRatio = null; });

    return { migratePosition, get audio() { return current.audio; } };
  }

  window.TalkTagNativeGuidedVariants = { forLesson, equivalentTime, toFixedPosition, isValid };
})();
