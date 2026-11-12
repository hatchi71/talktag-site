export function connectAudioTimeline(audio, timeline, formatTime, label) {
  const seek = timeline.querySelector('#seek');
  const wave = timeline.querySelector('.practice-wave');
  const elapsed = document.querySelector('#elapsed');
  const duration = document.querySelector('#duration');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const bars = Array.from({ length: 32 }, () => document.createElement('span'));
  wave.append(...bars);
  seek.setAttribute('aria-label', label);

  let context;
  let analyser;
  let samples;
  let frame = 0;
  let playing = false;
  let lastPosition = -1;
  let lastTimeText = '';

  function updatePosition() {
    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    seek.disabled = !ready;
    const progress = ready ? Math.min(1, Math.max(0, audio.currentTime / audio.duration)) : 0;
    const position = Math.round(progress * Number(seek.max));
    if (position !== lastPosition) {
      lastPosition = position;
      seek.value = String(position);
      timeline.style.setProperty('--progress', String(progress));
      timeline.toggleAttribute('data-started', position > 0);
      timeline.toggleAttribute('data-ended', position === Number(seek.max));
      bars.forEach((bar, index) => bar.toggleAttribute('data-played', (index + 0.5) / bars.length <= progress));
    }
    const elapsedText = formatTime(ready ? audio.currentTime : 0);
    const durationText = formatTime(ready ? audio.duration : 0);
    const timeText = elapsedText + ' / ' + durationText;
    if (timeText !== lastTimeText) {
      lastTimeText = timeText;
      elapsed.textContent = elapsedText;
      duration.textContent = durationText;
      seek.setAttribute('aria-valuetext', timeText);
    }
  }

  function clearWave() {
    for (const bar of bars) bar.style.removeProperty('--level');
  }

  function draw() {
    updatePosition();
    if (analyser && context.state === 'running' && !reducedMotion.matches) {
      analyser.getByteFrequencyData(samples);
      bars.forEach((bar, index) => {
        const distance = Math.abs(index - (bars.length - 1) / 2);
        const bin = 2 + Math.round(distance * 1.8);
        const level = 0.08 + 0.92 * (samples[bin] / 255) ** 2;
        bar.style.setProperty('--level', level.toFixed(3));
      });
    }
    frame = requestAnimationFrame(draw);
  }

  function stopDrawing() {
    playing = false;
    cancelAnimationFrame(frame);
    frame = 0;
    updatePosition();
    clearWave();
  }

  // Connect once per media element, during a playback gesture for mobile browsers.
  function enableWave() {
    if (reducedMotion.matches || !timeline.getClientRects().length) return;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        const audioContext = new AudioContext();
        const meter = audioContext.createAnalyser();
        meter.fftSize = 1024;
        meter.smoothingTimeConstant = 0.65;
        meter.connect(audioContext.destination);
        audioContext.createMediaElementSource(audio).connect(meter);
        context = audioContext;
        analyser = meter;
        samples = new Uint8Array(meter.frequencyBinCount);
      } catch {
        return;
      }
    }
    if (context.state !== 'running') context.resume().catch(() => {});
  }

  seek.addEventListener('input', () => {
    if (seek.disabled) return;
    audio.currentTime = audio.duration * Number(seek.value) / Number(seek.max);
    updatePosition();
  });
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked']) {
    audio.addEventListener(event, updatePosition);
  }
  for (const event of ['pause', 'waiting', 'seeking', 'ended', 'emptied', 'error']) {
    audio.addEventListener(event, stopDrawing);
  }
  function startDrawing() {
    if (frame || !playing || !timeline.getClientRects().length) return;
    draw();
  }
  audio.addEventListener('playing', () => {
    playing = true;
    startDrawing();
  });
  // Buffered seeks can finish without another playing event.
  audio.addEventListener('seeked', () => {
    if (audio.paused || audio.ended || audio.readyState < 3) return;
    playing = true;
    startDrawing();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#play-toggle, #replay, .line-play, #clips button')) enableWave();
  }, { capture: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) clearWave();
  });
  updatePosition();
}
