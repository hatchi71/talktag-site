/* Adjustable reflection time after each sentence of Korean Audio Essays & Articles. */
(() => {
  'use strict';
  const OPTIONS = [2, 2.5, 3, 3.5];

  function mount({ audio, lesson, anchor, readState, saveState, playButton }) {
    const gaps = lesson?.sentenceGaps;
    if (lesson?.type !== 'plain' || !Array.isArray(gaps) || gaps.length !== lesson.expressions.length - 1 || !anchor) return null;
    let multiplier = OPTIONS.includes(Number(readState().pauseMultiplier)) ? Number(readState().pauseMultiplier) : 2.5;
    let hold = null;
    let lastTime = 0;
    let seeking = false;
    const processed = new Set();
    const control = document.createElement('div');
    control.className = 'guided-pause-control essay-pause-control';
    control.innerHTML = '<div class="guided-pause-heading"><label for="essayPauseRange">Speaking pause</label><output id="essayPauseValue" for="essayPauseRange"></output></div><input id="essayPauseRange" type="range" min="0" max="3" step="1" aria-label="Pause after each sentence: 2, 2.5, 3 or 3.5 times its spoken length"><div class="guided-pause-marks" aria-hidden="true"><span>2.0×</span><span>2.5×</span><span>3.0×</span><span>3.5×</span></div><p>Pause after each sentence to recall or retell it. Voice speed stays natural; the timeline shows the original recording.</p>';
    anchor.after(control);
    const range = control.querySelector('input');
    const output = control.querySelector('output');
    function updateLabel() {
      range.value = String(OPTIONS.indexOf(multiplier));
      output.textContent = multiplier.toFixed(1) + '×';
      range.setAttribute('aria-valuetext', multiplier.toFixed(1) + ' times');
    }
    updateLabel();
    range.addEventListener('input', () => {
      multiplier = OPTIONS[Number(range.value)];
      updateLabel();
      saveState({ pauseMultiplier: multiplier });
    });
    function cancelHold() {
      if (!hold) return false;
      clearTimeout(hold);
      hold = null;
      delete audio.dataset.pauseHold;
      playButton.textContent = '▶ PLAY';
      return true;
    }
    function checkBoundary() {
      const time = audio.currentTime;
      if (time < lastTime - 0.2) processed.clear();
      lastTime = time;
      if (audio.paused || audio.seeking || seeking || hold) return;
      const index = gaps.findIndex(([end, next], i) => !processed.has(i) && time >= end && time < next - 0.08);
      if (index < 0) return;
      const [end, next] = gaps[index];
      const spokenStart = index === 0 ? 0 : gaps[index - 1][1];
      const spokenSeconds = end - spokenStart;
      const waitSeconds = Math.max(3, spokenSeconds * multiplier) - (next - end);
      processed.add(index);
      if (waitSeconds <= 0) return;
      hold = -1;
      audio.dataset.pauseHold = 'true';
      audio.pause();
      hold = setTimeout(() => {
        hold = null;
        delete audio.dataset.pauseHold;
        audio.play().catch(() => { playButton.textContent = '▶ PLAY'; });
      }, waitSeconds * 1000);
    }
    audio.addEventListener('timeupdate', checkBoundary);
    audio.addEventListener('seeking', () => { seeking = true; cancelHold(); processed.clear(); });
    audio.addEventListener('seeked', () => { seeking = false; lastTime = audio.currentTime; });
    audio.addEventListener('ended', () => { cancelHold(); processed.clear(); });
    addEventListener('pagehide', cancelHold);
    return { cancelHold, isHolding: () => Boolean(hold) };
  }
  window.TalkTagEssayPause = { mount };
})();
