/* Speaking-gap control for cue-timed Guided Listen & Repeat cards. */
(() => {
  'use strict';
  const OPTIONS = [2, 2.5, 3, 3.5];
  const targetSeconds = (cue, multiplier) => Math.max(3, (cue.voiceEnd - cue.s) * multiplier);
  const adjustmentSeconds = (cue, multiplier) => targetSeconds(cue, multiplier) - (cue.e - cue.voiceEnd);

  function mount({ audio, lesson, anchor, readState, saveState, playButton, english = false }) {
    const cues = lesson?.training?.cues;
    if (lesson?.type !== 'guided' || !Array.isArray(cues) || !cues.length || !anchor) return null;
    let multiplier = OPTIONS.includes(Number(readState().pauseMultiplier)) ? Number(readState().pauseMultiplier) : 2.5;
    let hold = null;
    let internalSeek = false;
    let previousTime = 0;
    const processed = new Set();
    const control = document.createElement('div');
    control.className = 'guided-pause-control';
    control.innerHTML = `<div class="guided-pause-heading"><label for="guidedPauseRange">${english ? 'Speaking pause' : '말하기 간격'}</label><output id="guidedPauseValue" for="guidedPauseRange"></output></div><input id="guidedPauseRange" type="range" min="0" max="3" step="1" aria-label="${english ? 'Speaking pause: 2, 2.5, 3 or 3.5 times the voice length' : '문장 뒤 말하기 간격: 음성 길이의 2배, 2.5배, 3배, 3.5배'}"><div class="guided-pause-marks" aria-hidden="true"><span>2.0×</span><span>2.5×</span><span>3.0×</span><span>3.5×</span></div><p>${audio.segmented ? (english ? 'At least 3 seconds after each spoken line. The timeline changes with your pause setting.' : '말한 문장이 끝난 뒤 최소 3초. 간격 설정에 따라 전체 재생 시간이 바뀝니다.') : (english ? 'At least 3 seconds. Voice speed stays natural; only the speaking pause changes. The timeline shows the original recording.' : '최소 3초. 음성 속도는 그대로 두고 말하기 무음만 조절합니다. 탐색 막대는 원본 음원 시간을 표시합니다.')}</p>`;
    if (audio.segmented) {
      const status = document.createElement('p');
      status.id = 'guidedPausePending';
      status.className = 'guided-pause-pending';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      control.append(status);
    }
    anchor.after(control);
    const range = control.querySelector('input');
    const output = control.querySelector('output');
    function updateLabel() { range.value = String(OPTIONS.indexOf(multiplier)); output.textContent = multiplier.toFixed(1) + '×'; range.setAttribute('aria-valuetext', multiplier.toFixed(1) + ' times'); }
    updateLabel();
    range.addEventListener('input', () => {
      multiplier = OPTIONS[Number(range.value)];
      updateLabel();
      saveState({ pauseMultiplier: multiplier });
      if (audio.segmented) audio.setPauseMultiplier(multiplier);
    });
    if (audio.segmented) return { cancelHold: () => false, isHolding: () => false };
    function cancelHold() {
      if (!hold) return false;
      clearTimeout(hold.timer);
      hold = null;
      delete audio.dataset.pauseHold;
      playButton.textContent = english ? '▶ PLAY' : '▶ 재생';
      return true;
    }
    function adjust() {
      const time = audio.currentTime;
      if (time < previousTime - 0.2 && !internalSeek) processed.clear();
      previousTime = time;
      if (multiplier === 2.5 || hold || audio.paused || audio.seeking || internalSeek) return;
      const index = cues.findIndex(cue => time >= cue.voiceEnd + 0.05 && time < cue.e - 0.08);
      if (index < 0 || processed.has(index)) return;
      const cue = cues[index];
      const delta = adjustmentSeconds(cue, multiplier);
      processed.add(index);
      if (delta > 0.08) {
        hold = { timer: null };
        audio.dataset.pauseHold = 'true';
        audio.pause();
        hold.timer = setTimeout(() => {
          hold = null;
          delete audio.dataset.pauseHold;
          audio.play().catch(() => { playButton.textContent = english ? '▶ PLAY' : '▶ 재생'; });
        }, delta * 1000);
      } else if (delta < -0.08) {
        const next = Math.min(cue.e - 0.08, time - delta);
        if (next > time + 0.04) {
          internalSeek = true;
          audio.currentTime = next;
        }
      }
    }
    audio.addEventListener('timeupdate', adjust);
    audio.addEventListener('seeking', () => { if (!internalSeek) { cancelHold(); processed.clear(); } });
    audio.addEventListener('seeked', () => { internalSeek = false; previousTime = audio.currentTime; });
    audio.addEventListener('ended', () => { cancelHold(); processed.clear(); });
    addEventListener('pagehide', cancelHold);
    return { cancelHold, isHolding: () => Boolean(hold) };
  }
  window.TalkTagGuidedPause = { mount, targetSeconds, adjustmentSeconds };
})();
