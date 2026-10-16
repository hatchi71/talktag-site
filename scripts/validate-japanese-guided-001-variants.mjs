#!/usr/bin/env node
// Decode the produced files independently of the Japanese GLR 001 assembler.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/japanese/guided/segments-001');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'variants/manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'variants/manifest.js'), 'utf8');
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'native-guided-data.js'), 'utf8'), catalogContext);
const catalog = Array.from(catalogContext.window.TalkTagNativeCatalogs.ja);
const rate = 48000;
const frameSamples = 480;
const ratios = [2, 2.5, 3, 3.5];
const failures = [];
let checked = 0, repetitions = 0, totalBytes = 0;
let minGapError = Infinity, maxGapError = -Infinity;

function fail(message) { failures.push(message); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function near(a, b, tolerance) { return Math.abs(a - b) <= tolerance; }
function localFile(url) {
  if (!url.startsWith(manifest.releaseBase)) throw new Error(`Unexpected release URL ${url}`);
  return path.join(root, url.split('?')[0].slice(manifest.releaseBase.length));
}
function decodeRms(file) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-glr001-validate-'));
  const raw = path.join(scratch, 'decoded.pcm');
  try {
    const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file,
      '-ar', String(rate), '-ac', '1', '-f', 's16le', raw], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Decode failed ${file}: ${result.error?.message || result.stderr}`);
    const fd = fs.openSync(raw, 'r');
    const buffer = Buffer.alloc(frameSamples * 2);
    const rms = [];
    try {
      while (true) {
        const count = fs.readSync(fd, buffer, 0, buffer.length, null);
        if (!count) break;
        if (count % 2) throw new Error(`Partial decoded sample in ${file}`);
        let square = 0;
        for (let offset = 0; offset < count; offset += 2) {
          const value = buffer.readInt16LE(offset);
          square += value * value;
        }
        rms.push(Math.sqrt(square / (count / 2)) / 32768);
      }
    } finally { fs.closeSync(fd); }
    return { rms, seconds: fs.statSync(raw).size / 2 / rate };
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function audible(rms, begin, end) {
  const first = Math.max(0, Math.floor(begin * 100));
  const last = Math.min(rms.length, Math.ceil(end * 100));
  let foundFirst = -1, foundLast = -1;
  for (let index = first; index < last; index++) {
    if (rms[index] >= 0.001) {
      if (foundFirst < 0) foundFirst = index;
      foundLast = index;
    }
  }
  return foundFirst < 0 ? null : { start: foundFirst / 100, end: (foundLast + 1) / 100 };
}

const assignment = 'window.TalkTagJapaneseGuidedVariants = ';
if (!script.startsWith(assignment) ||
    JSON.stringify(JSON.parse(script.slice(assignment.length).replace(/;\s*$/, ''))) !== JSON.stringify(manifest)) {
  fail('Synchronous JS manifest and JSON manifest differ');
}
if (JSON.stringify(manifest.pauseRatios) !== JSON.stringify(ratios) ||
    manifest.minimumPauseSeconds !== 3 || manifest.defaultPauseRatio !== 2.5 ||
    manifest.cards.length !== 8 || catalog.length !== 8) fail('Japanese catalog or pause-protocol count changed');
if (manifest.releaseBase !== 'https://audio.talktag.co.kr/Japanese/guided/segments-001/v1-20261016/') fail('Release URL changed');

for (const [name, ding] of Object.entries(manifest.dings)) {
  const file = localFile(ding.audio);
  if (!fs.existsSync(file) || sha256(file) !== ding.sha256 || fs.statSync(file).size !== ding.bytes ||
      !ding.audio.endsWith(`?v=${ding.sha256.slice(0, 12)}`)) fail(`${name} ding missing or metadata mismatch`);
  else if (!audible(decodeRms(file).rms, 0, ding.durationSeconds)) fail(`${name} ding is silent`);
}
for (const card of manifest.cards) {
  const original = catalog.find(item => item.id === card.id);
  if (!original) { fail(`Unknown card ${card.id}`); continue; }
  const reps = card.level.startsWith('A') ? 10 : card.level.startsWith('B') ? 15 : 21;
  if (card.repetitions !== reps || card.variants.length !== 4 ||
      card.lines.length !== original.expressions.length ||
      JSON.stringify(card.lines.map(line => line.text)) !== JSON.stringify(Array.from(original.expressions)) ||
      JSON.stringify(card.lines.map(line => line.meaning)) !== JSON.stringify(Array.from(original.meanings))) {
    fail(`${card.id}: published scripts, repetition count, or variant count changed`);
  }
  for (const [index, line] of card.lines.entries()) {
    const file = localFile(line.audio);
    if (!fs.existsSync(file) || sha256(file) !== line.sha256 || fs.statSync(file).size !== line.bytes ||
        !line.audio.endsWith(`?v=${line.sha256.slice(0, 12)}`)) fail(`${card.id}: line ${index + 1} missing or metadata mismatch`);
  }
  for (const ratio of ratios) {
    const variant = card.variants.find(item => item.ratio === ratio);
    if (!variant) { fail(`${card.id}: missing ${ratio}× variant`); continue; }
    const label = `${card.id} ${ratio.toFixed(1)}×`;
    const file = localFile(variant.audio);
    if (!fs.existsSync(file)) { fail(`${label}: media missing`); continue; }
    totalBytes += fs.statSync(file).size;
    if (variant.bytes !== fs.statSync(file).size || sha256(file) !== variant.sha256 ||
        !variant.audio.endsWith(`?v=${variant.sha256.slice(0, 12)}`)) fail(`${label}: hash, size or cache key mismatch`);
    if (variant.cues.length !== reps * card.lines.length || variant.measuredSpeech.length !== variant.cues.length) {
      fail(`${label}: expected ${reps * card.lines.length} cue pairs`); continue;
    }
    const { rms, seconds: duration } = decodeRms(file);
    checked++;
    repetitions += variant.cues.length;
    if (!near(duration, variant.durationSeconds, 0.001)) fail(`${label}: decoded duration mismatch`);
    // A/B cards must remain below the approved 11-minute hard ceiling; C uses 15 minutes.
    if (duration > (card.level.startsWith('C') ? 900 : 660)) fail(`${label}: exceeds card length ceiling`);
    if (!audible(rms, 0, Math.min(variant.cues[0].s, duration))) fail(`${label}: opening ding is silent`);
    for (let index = 0; index < variant.cues.length; index++) {
      const cue = variant.cues[index], speech = variant.measuredSpeech[index];
      const next = variant.cues[index + 1], nextSpeech = variant.measuredSpeech[index + 1];
      const expectedI = Math.floor(index / reps), expectedR = index % reps + 1;
      if (cue.i !== expectedI || cue.r !== expectedR || speech.i !== expectedI || speech.r !== expectedR ||
          cue.s > speech.start || speech.start >= speech.end || speech.end > cue.e ||
          !near(cue.voiceEnd, speech.end, 0.001) ||
          (next && !near(cue.e, next.s, 0.001)) || cue.e > duration + 0.001) {
        fail(`${label}: invalid cue ${index + 1}`);
      }
      const sourceVoice = speech.end - speech.start;
      const target = Math.max(3, sourceVoice * ratio);
      const planned = next ? nextSpeech.start - speech.end :
        variant.endingCueStart + variant.endingToneLeadSeconds - speech.end;
      if (!near(planned, target, next ? 0.002 : 0.025)) {
        fail(`${label}: planned gap ${index + 1} ${planned.toFixed(3)}s vs ${target.toFixed(3)}s`);
      }
      const voice = audible(rms, cue.s, Math.min(duration, speech.end + 0.35));
      if (!voice || !near(voice.start, speech.start, 0.28) || !near(voice.end, speech.end, 0.28)) {
        fail(`${label}: voice ${index + 1} does not align to its cue`);
      }
      if (next && voice) {
        const following = audible(rms, next.s, Math.min(duration, nextSpeech.end + 0.35));
        if (!following) { fail(`${label}: next voice ${index + 2} silent`); continue; }
        const observed = following.start - voice.end;
        const error = observed - target;
        minGapError = Math.min(minGapError, error);
        maxGapError = Math.max(maxGapError, error);
        if (error < -0.1 || error > 0.3) fail(`${label}: decoded gap ${index + 1} ${observed.toFixed(3)}s vs ${target.toFixed(3)}s`);
      }
    }
    const lastCue = variant.cues.at(-1), lastSpeech = variant.measuredSpeech.at(-1);
    const lastVoice = audible(rms, lastCue.s, Math.min(duration, lastSpeech.end + 0.35));
    const endingTone = audible(rms, variant.endingCueStart, Math.min(duration, variant.endingCueStart + 0.5));
    if (!near(lastCue.e, variant.endingCueStart, 0.001) || !endingTone) {
      fail(`${label}: ending ding or boundary missing`);
    }
    if (lastVoice && endingTone) {
      const target = Math.max(3, (lastSpeech.end - lastSpeech.start) * ratio);
      const observed = endingTone.start - lastVoice.end;
      const error = observed - target;
      minGapError = Math.min(minGapError, error);
      maxGapError = Math.max(maxGapError, error);
      if (error < -0.1 || error > 0.3) fail(`${label}: decoded final gap ${observed.toFixed(3)}s vs ${target.toFixed(3)}s`);
    }
    console.log(`PASS ${label}: ${duration.toFixed(2)}s; ${variant.cues.length} cues`);
  }
}
console.log(`Decoded ${checked}/32 Japanese variants, ${repetitions} speech cues, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB; observed gap error ${minGapError.toFixed(3)}..${maxGapError.toFixed(3)}s.`);
if (failures.length) {
  failures.slice(0, 40).forEach(item => console.error(`FAIL ${item}`));
  if (failures.length > 40) console.error(`... ${failures.length - 40} more failures`);
  process.exitCode = 1;
} else console.log('All encoded Japanese GLR 001 variants pass technical QC; human listening/pronunciation review is separate.');
