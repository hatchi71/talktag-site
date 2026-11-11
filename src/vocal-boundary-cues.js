// The closing recording already contains two dings.
const startCue = '/assets/vocal-camp/003-start.mp3';
const endCue = '/assets/vocal-camp/003-end.mp3';

export function createVocalBoundaryCues(makeAudio = () => new Audio()) {
  let audio;
  let cancel;
  let started = false;

  function stop() {
    cancel?.();
  }

  function play(url) {
    stop();
    // Keep one element so the gesture that opens playback also unlocks its closing cue.
    audio ??= makeAudio();
    audio.src = url;
    return new Promise(resolve => {
      let finished = false;
      const finish = played => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        audio.removeEventListener('ended', onEnd);
        audio.removeEventListener('error', onError);
        cancel = undefined;
        resolve(played);
      };
      const onEnd = () => finish(true);
      const onError = () => finish(false);
      cancel = () => {
        audio.pause();
        finish(false);
      };
      const timeout = setTimeout(cancel, 4000);
      audio.addEventListener('ended', onEnd);
      audio.addEventListener('error', onError);
      audio.play().catch(onError);
    });
  }

  return {
    stop,
    reset() {
      stop();
      started = false;
    },
    async start() {
      if (!started && await play(startCue)) started = true;
    },
    async end() {
      if (await play(endCue)) started = false;
    }
  };
}
