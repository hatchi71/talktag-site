#!/usr/bin/env node
// Independently decode every Japanese Vocal Camp 001 line and pause variant.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/japanese/vocalcamp/segments-001');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(repo, 'content/vocalcamp-japanese-001-source.json'), 'utf8'));
const errors = [];
let checked = 0, measuredGaps = 0, worstGapError = 0, totalBytes = 0;
const fail = message => errors.push(message);
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function local(url) {
  if (!url.startsWith(manifest.localBase)) throw Error(`Unexpected local URL: ${url}`);
  return path.join(root, url.slice(manifest.localBase.length));
}
function publicRecord(record) {
  if (!record.audio?.startsWith(manifest.releaseBase) ||
      record.audio !== `${manifest.releaseBase}${record.localAudio.slice(manifest.localBase.length)}?v=${record.sha256.slice(0, 12)}` ||
      record.r2Key !== `${manifest.r2Base}${record.localAudio.slice(manifest.localBase.length)}`)
    fail(`Public URL/R2 key mismatch: ${record.localAudio}`);
}
function readRms(file) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-vc-check-'));
  const raw = path.join(temp, 'audio.pcm');
  try {
    const run = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file,
      '-ar', '48000', '-ac', '1', '-f', 's16le', raw], {encoding: 'utf8'});
    if (run.error || run.status !== 0) throw Error(`Could not decode ${file}: ${run.error?.message || run.stderr}`);
    const fd = fs.openSync(raw, 'r'), buffer = Buffer.alloc(960), rms = [];
    try {
      for (;;) {
        const n = fs.readSync(fd, buffer, 0, 960, null);
        if (!n) break;
        let sum = 0;
        for (let i = 0; i < n; i += 2) {
          const sample = buffer.readInt16LE(i);
          sum += sample * sample;
        }
        rms.push(Math.sqrt(sum / (n / 2)) / 32768);
      }
    } finally { fs.closeSync(fd); }
    return {rms, duration: fs.statSync(raw).size / 96000};
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
}
function energetic(rms, start, end) {
  let first = -1, last = -1;
  for (let i = Math.max(0, Math.floor(start * 100));
       i < Math.min(rms.length, Math.ceil(end * 100)); i++) {
    if (rms[i] >= 0.001) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return first < 0 ? null : {first: first / 100, end: (last + 1) / 100};
}

const jsContext = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'manifest.js'), 'utf8'), jsContext);
vm.runInNewContext(fs.readFileSync(path.join(repo, 'japanese/J-vocalcamp-furigana.js'), 'utf8'), jsContext);
if (JSON.stringify(jsContext.window.TalkTagJapaneseVocal001Variants) !== JSON.stringify(manifest))
  fail('JavaScript and JSON manifests differ');
if (manifest.version !== 1 || manifest.cards.length !== 6 ||
    manifest.releaseBase !== 'https://audio.talktag.co.kr/Japanese/boot-camp/vocal-camp/segments-001/v2-20261017/' ||
    JSON.stringify(manifest.ratios) !== JSON.stringify([2, 2.5, 3, 3.5]) ||
    manifest.minimumPauseSeconds !== 3)
  fail('Expected six cards and four pause ratios');
const uniqueLines = new Set();
const furigana = jsContext.window.TalkTagJapaneseFurigana;
if (!furigana?.render) fail('Japanese furigana renderer unavailable');
else {
  const turns = Object.values(source.levels).flat();
  for (const turn of turns) {
    const rendered = furigana.render(turn.japanese, turn.reading);
    if (rendered.includes('j-vocal-reading-fallback')) fail(`${turn.id}: furigana alignment fallback`);
    if (turn.id === 'J-VC-001-B1-04' && !rendered.includes('<ruby>一度<rt>いちど</rt></ruby><ruby>聞<rt>き</rt></ruby>'))
      fail(`${turn.id}: 一度/聞 furigana boundary regressed`);
  }
  if (turns.length !== 28) fail(`Expected 28 furigana lines; got ${turns.length}`);
}
for (const card of manifest.cards) {
  const turns = source.levels[card.level];
  if (!turns || card.lines.length !== turns.length || card.steps.length !== turns.length ||
      JSON.stringify(card.lines.map(line => line.id)) !== JSON.stringify(turns.map(turn => turn.id)) ||
      JSON.stringify(card.lines.map(line => line.japanese)) !== JSON.stringify(turns.map(turn => turn.japanese)) ||
      JSON.stringify(card.lines.map(line => line.reading)) !== JSON.stringify(turns.map(turn => turn.reading)) ||
      JSON.stringify(card.lines.map(line => line.korean)) !== JSON.stringify(turns.map(turn => turn.korean)))
    fail(`${card.id}: Japanese/reading/Korean script mismatch`);
  for (const line of card.lines) {
    publicRecord(line);
    const file = local(line.localAudio);
    uniqueLines.add(file);
    if (!fs.existsSync(file) || fs.statSync(file).size !== line.bytes || hash(file) !== line.sha256)
      fail(`${card.id}: isolated line missing or hash mismatch`);
    if (line.scribeTranscript !== line.japanese)
      fail(`${card.id}: Scribe line-boundary transcription mismatch`);
  }
  for (const step of card.steps) {
    if (step.variants.length !== 4) fail(`${card.id} step ${step.step}: ratio count mismatch`);
    for (const variant of step.variants) {
      publicRecord(variant);
      const label = `${card.id} step ${step.step} ${variant.ratio}×`;
      const file = local(variant.localAudio);
      if (!fs.existsSync(file)) { fail(`${label}: MP3 missing`); continue; }
      totalBytes += fs.statSync(file).size;
      if (fs.statSync(file).size !== variant.bytes || hash(file) !== variant.sha256)
        fail(`${label}: MP3 hash/size mismatch`);
      const {rms, duration} = readRms(file);
      checked++;
      if (!near(duration, variant.durationSeconds, 0.001) || variant.cues.length !== step.step)
        fail(`${label}: decoded duration or cue count mismatch`);
      for (let n = 0; n < variant.cues.length; n++) {
        const cue = variant.cues[n], next = variant.cues[n + 1];
        if (cue.lineId !== card.lines[n].id || cue.speaker !== card.lines[n].speaker ||
            cue.start >= cue.voiceEnd || cue.voiceEnd >= cue.pauseEnd || cue.pauseEnd > duration + 0.001)
          fail(`${label}: invalid or misassigned cue ${n + 1}`);
        const audible = energetic(rms, Math.max(0, cue.start - .12), Math.min(duration, cue.voiceEnd + .3));
        if (!audible || !near(audible.first, cue.start, .26) || !near(audible.end, cue.voiceEnd, .26)) {
          fail(`${label}: decoded speech not aligned to cue ${n + 1}`);
          continue;
        }
        const target = next ? .35 : Math.max(3, (cue.voiceEnd - variant.cues[0].start) * variant.ratio);
        if (next) {
          const nextAudible = energetic(rms, Math.max(0, next.start - .12),
            Math.min(duration, next.voiceEnd + .3));
          if (!nextAudible) { fail(`${label}: next voice missing after cue ${n + 1}`); continue; }
          const error = nextAudible.first - audible.end - target;
          worstGapError = Math.max(worstGapError, Math.abs(error)); measuredGaps++;
          if (error < -.11 || error > .31)
            fail(`${label}: decoded speaking gap off by ${error.toFixed(3)}s after cue ${n + 1}`);
        } else {
          const error = duration - audible.end - target;
          worstGapError = Math.max(worstGapError, Math.abs(error)); measuredGaps++;
          if (error < -.11 || error > .31)
            fail(`${label}: decoded final speaking pause off by ${error.toFixed(3)}s`);
        }
      }
    }
  }
}
if (uniqueLines.size !== 28) fail(`Expected 28 isolated lines; got ${uniqueLines.size}`);
console.log(`Japanese Vocal Camp decoded ${checked}/112 variants, ${uniqueLines.size}/28 line MP3s, ${measuredGaps} measured pauses; worst gap error ${worstGapError.toFixed(3)}s; ${(totalBytes / 1048576).toFixed(1)} MiB variants.`);
if (errors.length) {
  for (const error of errors.slice(0, 40)) console.error(`FAIL ${error}`);
  if (errors.length > 40) console.error(`... ${errors.length - 40} further failures`);
  process.exitCode = 1;
} else console.log('Japanese Vocal Camp audio/cue/pause checks passed; human listening/pronunciation review remains separate.');
