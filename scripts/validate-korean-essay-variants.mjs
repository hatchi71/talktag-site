#!/usr/bin/env node
// Decode every Korean essay variant and verify line count, hashes, and pauses.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/korean/audio-essays-articles/segments-001');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const js = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'manifest.js'), 'utf8'), js);
assert.deepEqual(JSON.parse(JSON.stringify(js.window.TalkTagKoreanEssayVariants)), manifest);
assert.equal(manifest.cards.length, 6);
assert.deepEqual(manifest.pauseRatios, [2, 2.5, 3, 3.5]);
const catalog = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'native-audio-korean-aea-001.js'), 'utf8'), catalog);
function local(record) {
  assert.ok(record.audio.startsWith(manifest.releaseBase));
  const file = path.join(root, record.audio.split('?')[0].slice(manifest.releaseBase.length));
  assert.equal(fs.statSync(file).size, record.bytes);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), record.sha256);
  return file;
}
function decode(file) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', '48000', '-ac', '1', '-f', 's16le', 'pipe:1'], { maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw Error(`Cannot decode ${file}: ${result.stderr}`);
  return result.stdout;
}
function activity(pcm, start, end) {
  const from = Math.max(0, Math.floor(start * 48000));
  const to = Math.min(pcm.length / 2, Math.ceil(end * 48000));
  const frame = 480;
  let first = -1, last = -1;
  for (let offset = from; offset < to; offset += frame) {
    const finish = Math.min(to, offset + frame);
    let power = 0;
    for (let sample = offset; sample < finish; sample++) {
      const value = pcm.readInt16LE(sample * 2);
      power += value * value;
    }
    if (Math.sqrt(power / (finish - offset)) / 32768 >= 0.001) {
      if (first < 0) first = offset / 48000;
      last = finish / 48000;
    }
  }
  return first < 0 ? null : { first, last };
}
let checked = 0, largestError = 0;
for (const card of manifest.cards) {
  const lesson = catalog.window.TalkTagNativeCatalogs.ko.find(item => item.id === card.id);
  assert.ok(lesson);
  assert.equal(card.lines.length, lesson.expressions.length);
  assert.equal(card.variants.length, 4);
  const original = path.join(repo, 'audio/korean/audio-essays-articles/001', `${card.level.toLowerCase()}.mp3`);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex'), card.sourceSha256);
  card.lines.forEach((line, index) => {
    assert.equal(line.text, lesson.expressions[index]);
    assert.equal(line.meaning, lesson.meanings[index]);
    assert.ok(line.speechSeconds > 0.5);
    const pcm = decode(local(line));
    assert.ok(activity(pcm, 0, pcm.length / 96000), `${card.id} line ${index + 1} is silent`);
  });
  for (const variant of card.variants) {
    const pcm = decode(local(variant));
    const duration = pcm.length / 96000;
    assert.ok(Math.abs(duration - variant.durationSeconds) < 0.001);
    assert.equal(variant.cues.length, card.lines.length);
    for (let index = 0; index < variant.cues.length; index++) {
      const cue = variant.cues[index];
      assert.equal(cue.i, index);
      assert.ok(cue.s < cue.voiceEnd && cue.voiceEnd <= cue.e);
      const voice = activity(pcm, cue.s, Math.min(cue.voiceEnd + 0.04, duration));
      assert.ok(voice, `${card.id} ${variant.ratio}× line ${index + 1} missing`);
      if (index < variant.cues.length - 1) {
        const next = variant.cues[index + 1];
        const nextVoice = activity(pcm, next.s, Math.min(next.voiceEnd + 0.04, duration));
        assert.ok(nextVoice, `${card.id} ${variant.ratio}× next line missing`);
        const target = Math.max(3, card.lines[index].speechSeconds * variant.ratio);
        const gap = nextVoice.first - voice.last;
        const error = Math.abs(gap - target);
        largestError = Math.max(largestError, error);
        assert.ok(error < 0.25, `${card.id} ${variant.ratio}× gap ${index + 1}: ${gap.toFixed(3)}s vs ${target.toFixed(3)}s`);
      }
    }
    checked++;
  }
}
console.log(`Korean essays: ${manifest.cards.length} cards, 29 isolated lines, ${checked} decoded pause variants; worst gap error ${largestError.toFixed(3)}s.`);
