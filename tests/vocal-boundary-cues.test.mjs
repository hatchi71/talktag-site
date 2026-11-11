import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVocalBoundaryCues } from '../src/vocal-boundary-cues.js';

function player() {
  const instances = [];
  class FakeAudio extends EventTarget {
    play() {
      const play = { url: this.src, pauses: 0, finish: () => this.dispatchEvent(new Event('ended')) };
      instances.push(play);
      return new Promise((_, reject) => { play.reject = reject; });
    }
    pause() { instances.at(-1).pauses++; }
  }
  return { instances, cues: createVocalBoundaryCues(() => new FakeAudio()) };
}

test('cue plays once before speech, then the closing double cue and a new start', async () => {
  const { cues, instances } = player();
  const start = cues.start();
  assert.match(instances[0].url, /003-start\.mp3$/);
  instances[0].finish();
  await start;
  await cues.start();
  assert.equal(instances.length, 1);
  const end = cues.end();
  assert.match(instances[1].url, /003-end\.mp3$/);
  instances[1].finish();
  await end;
  const restart = cues.start();
  assert.match(instances[2].url, /003-start\.mp3$/);
  instances[2].finish();
  await restart;
});

test('interruption stops the cue, and an old play rejection cannot cancel the next cue', async () => {
  const { cues, instances } = player();
  const first = cues.start();
  cues.stop();
  await first;
  assert.equal(instances[0].pauses, 1);
  const second = cues.start();
  instances[0].reject(new Error('cancelled playback'));
  await Promise.resolve();
  cues.stop();
  await second;
  assert.equal(instances[1].pauses, 1);
});

test('a blocked start does not hold the lesson and can be retried', async () => {
  const { cues, instances } = player();
  const first = cues.start();
  instances[0].reject(new Error('blocked playback'));
  await first;
  const next = cues.start();
  instances[1].finish();
  await next;
  cues.reset();
  const afterReset = cues.start();
  assert.equal(instances.length, 3);
  cues.stop();
  await afterReset;
});
