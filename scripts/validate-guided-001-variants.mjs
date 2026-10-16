#!/usr/bin/env node
// Independently decode and validate each native-audio GLR 001 pause variant.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/guided/segments-001');
const segments = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'variants/manifest.json'), 'utf8'));
const releaseBase = 'https://audio.talktag.co.kr/English/guided/segments-001/v1-20261016/';
const js = fs.readFileSync(path.join(root, 'variants/manifest.js'), 'utf8');
const rate = 48000;
const frameSamples = 480; // 10 ms windows
const expectedRatios = [2, 2.5, 3, 3.5];
const failures = [];
let checked = 0;
let bytes = 0;
let worstMeasuredError = 0;
let minMeasuredError = Infinity;
let maxMeasuredError = -Infinity;
let deviationsOverTenth = 0;

function fail(message) { failures.push(message); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function near(a, b, allowance) { return Math.abs(a - b) <= allowance; }
function actualFile(url) {
  if (!url.startsWith(`${releaseBase}variants/`)) throw new Error(`Unexpected URL: ${url}`);
  return path.join(root, url.split('?')[0].slice(releaseBase.length));
}
function getRms(file) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-glr001-check-'));
  const raw = path.join(scratch, 'decoded.pcm');
  try {
    const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file,
      '-ar', String(rate), '-ac', '1', '-f', 's16le', raw], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Cannot decode ${file}: ${result.error?.message || result.stderr}`);
    const fd = fs.openSync(raw, 'r');
    const buffer = Buffer.alloc(frameSamples * 2);
    const rms = [];
    try {
      while (true) {
        const n = fs.readSync(fd, buffer, 0, buffer.length, null);
        if (!n) break;
        if (n % 2) throw new Error(`Partial sample in decoded ${file}`);
        let sum = 0;
        for (let p = 0; p < n; p += 2) {
          const sample = buffer.readInt16LE(p);
          sum += sample * sample;
        }
        rms.push(Math.sqrt(sum / (n / 2)) / 32768);
      }
    } finally { fs.closeSync(fd); }
    return { rms, duration: fs.statSync(raw).size / 2 / rate };
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function energeticRange(rms, start, end) {
  const first = Math.max(0, Math.floor(start * 100));
  const last = Math.min(rms.length, Math.ceil(end * 100));
  let foundFirst = -1;
  let foundLast = -1;
  for (let i = first; i < last; i++) {
    if (rms[i] >= 0.001) {
      if (foundFirst < 0) foundFirst = i;
      foundLast = i;
    }
  }
  return foundFirst < 0 ? null : { first: foundFirst / 100, end: (foundLast + 1) / 100 };
}

if (!js.startsWith('window.TalkTagGuided001Variants = ') ||
    JSON.stringify(JSON.parse(js.slice('window.TalkTagGuided001Variants = '.length).replace(/;\s*$/, ''))) !== JSON.stringify(manifest)) {
  fail('JSON and synchronous JS manifests do not match');
}
if (manifest.cards.length !== 6 || JSON.stringify(manifest.pauseRatios) !== JSON.stringify(expectedRatios)) {
  fail('Card count or pause ratios differ from protocol');
}
if (manifest.releaseBase !== releaseBase) fail('Release host/prefix mismatch');

for (const card of manifest.cards) {
  const original = segments.cards.find(item => item.id === card.id);
  if (!original) { fail(`Unknown card ${card.id}`); continue; }
  const reps = card.level.startsWith('A') ? 10 : card.level.startsWith('B') ? 15 : 21;
  if (card.repetitions !== reps || card.variants.length !== 4 || card.lines.length !== original.lines.length ||
      JSON.stringify(card.lines) !== JSON.stringify(original.lines.map(line => ({ text: line.text, meaning: line.meaning })))) {
    fail(`${card.id}: repetitions, variants, or bilingual script mismatch`);
  }
  for (const variant of card.variants) {
    const label = `${card.id} ${variant.ratio.toFixed(1)}×`;
    const file = actualFile(variant.audio);
    if (!fs.existsSync(file)) { fail(`${label}: media missing`); continue; }
    const actualBytes = fs.statSync(file).size;
    bytes += actualBytes;
    if (actualBytes !== variant.bytes || sha256(file) !== variant.sha256) fail(`${label}: byte count/hash mismatch`);
    if (!variant.audio.endsWith(`?v=${variant.sha256.slice(0, 12)}`)) fail(`${label}: cache-busting hash missing`);
    const expectedCount = reps * original.lines.length;
    if (variant.cues.length !== expectedCount || variant.measuredSpeech.length !== expectedCount) {
      fail(`${label}: cue count ${variant.cues.length} != ${expectedCount}`); continue;
    }
    const { rms, duration } = getRms(file);
    checked++;
    if (!near(duration, variant.durationSeconds, 0.001)) fail(`${label}: decoded duration mismatch`);
    const limit = card.level.startsWith('C') ? 900 : 600;
    if (duration > limit) fail(`${label}: ${duration.toFixed(2)}s exceeds ${limit}s`);
    for (let n = 0; n < variant.cues.length; n++) {
      const cue = variant.cues[n];
      const speech = variant.measuredSpeech[n];
      const next = variant.cues[n + 1];
      const nextSpeech = variant.measuredSpeech[n + 1];
      const expectedI = Math.floor(n / reps);
      const expectedR = n % reps + 1;
      if (cue.i !== expectedI || cue.r !== expectedR || speech.i !== expectedI || speech.r !== expectedR ||
          cue.s > speech.start || speech.start >= speech.end || speech.end > cue.e ||
          !near(cue.voiceEnd, speech.end, 0.001) ||
          (next && !near(cue.e, next.s, 0.001))) {
        fail(`${label}: invalid cue ${n + 1}`);
      }
      const sourceVoice = (speech.end - speech.start);
      const target = Math.max(3, sourceVoice * variant.ratio);
      const plannedGap = next ? nextSpeech.start - speech.end :
        variant.endingCueStart + variant.endingToneLeadSeconds - speech.end;
      if (!near(plannedGap, target, next ? 0.002 : 0.025)) {
        fail(`${label}: planned speech gap ${n + 1} ${plannedGap.toFixed(3)} vs ${target.toFixed(3)}s`);
      }
      if (cue.e > duration + 0.001) fail(`${label}: cue past decoded file`);
      const audible = energeticRange(rms, cue.s, Math.min(duration, speech.end + 0.35));
      if (!audible) { fail(`${label}: voice ${n + 1} is silent`); continue; }
      if (!near(audible.first, speech.start, 0.28) || !near(audible.end, speech.end, 0.28)) {
        fail(`${label}: voice ${n + 1} does not align to expected cue`);
      }
      if (next) {
        const nextAudible = energeticRange(rms, next.s, Math.min(duration, nextSpeech.end + 0.35));
        if (!nextAudible) { fail(`${label}: following voice ${n + 2} is silent`); continue; }
        const measuredGap = nextAudible.first - audible.end;
        const error = measuredGap - target;
        worstMeasuredError = Math.max(worstMeasuredError, Math.abs(error));
        minMeasuredError = Math.min(minMeasuredError, error);
        maxMeasuredError = Math.max(maxMeasuredError, error);
        if (Math.abs(error) > 0.1) deviationsOverTenth++;
        if (error < -0.1 || error > 0.3) {
          fail(`${label}: decoded speech gap ${n + 1} ${measuredGap.toFixed(3)} vs ${target.toFixed(3)}s`);
        }
      }
    }
    if (!near(variant.cues.at(-1).e, variant.endingCueStart, 0.001)) fail(`${label}: ending ding boundary mismatch`);
    const endTone = energeticRange(rms, variant.endingCueStart, Math.min(duration, variant.endingCueStart + 0.5));
    if (!endTone) fail(`${label}: missing ending ding`);
    console.log(`PASS ${label}: ${duration.toFixed(2)}s, ${variant.cues.length} repetitions, ${(actualBytes / 1024 / 1024).toFixed(2)} MiB`);
  }
}
console.log(`Decoded ${checked}/24 variants; ${(bytes / 1024 / 1024).toFixed(2)} MiB total; observed gap error ${minMeasuredError.toFixed(3)}s to +${maxMeasuredError.toFixed(3)}s; worst absolute ${worstMeasuredError.toFixed(3)}s; ${deviationsOverTenth} deviations >0.10s.`);
if (failures.length) {
  for (const item of failures.slice(0, 30)) console.error(`FAIL ${item}`);
  if (failures.length > 30) console.error(`... ${failures.length - 30} further failures`);
  process.exitCode = 1;
} else {
  console.log('All native-audio variants passed. Human pronunciation/listening review remains separate.');
}
