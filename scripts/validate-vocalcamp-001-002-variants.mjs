#!/usr/bin/env node
// Decode every English Vocal Camp 001/002 variant and verify actual speech gaps.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'audio/vocalcamp/segments-001-002');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const releaseBase = 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/segments-001-002/v2-20261017/';
const rate = 48000;
const frame = 480;
let files = 0;
let worstError = 0;
let totalBytes = 0;
const fail = message => { throw new Error(message); };
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const seconds = samples => samples / rate;
function media(record) {
  if (!record.audio.startsWith(releaseBase) || !record.audio.endsWith(`?v=${record.sha256.slice(0, 12)}`)) fail(`Invalid URL ${record.audio}`);
  const relative = record.audio.slice(releaseBase.length).split('?')[0];
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) fail(`Missing or unsafe file ${relative}`);
  if (fs.statSync(file).size !== record.bytes || sha(file) !== record.sha256) fail(`Size/hash mismatch ${relative}`);
  totalBytes += record.bytes;
  files++;
  return file;
}
function decode(file) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1'],
    { encoding: null, maxBuffer: 96 * 1024 * 1024 });
  if (result.error || result.status !== 0) fail(`Decode failed ${file}: ${result.error?.message || result.stderr}`);
  return result.stdout;
}
function active(pcm, start, end) {
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  let first = -1, last = -1;
  for (let offset = Math.max(0, Math.floor(start * rate / frame) * frame); offset < Math.min(data.length, Math.ceil(end * rate / frame) * frame); offset += frame) {
    const stop = Math.min(data.length, offset + frame);
    let sum = 0;
    for (let i = offset; i < stop; i++) sum += data[i] * data[i];
    if (Math.sqrt(sum / (stop - offset)) / 32768 >= 0.001) {
      if (first < 0) first = offset;
      last = stop;
    }
  }
  if (first < 0) fail(`Silent expected speech at ${start.toFixed(2)}s`);
  return { start: seconds(first), end: seconds(last) };
}
function catalog(episode) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(repo, `content/vocalcamp/${episode}.js`), 'utf8'), context);
  return context.window.TALKTAG_VOCALCAMP.families[0];
}

if (manifest.version !== 1 || manifest.releaseBase !== releaseBase || manifest.minimumPauseSeconds !== 3 ||
    JSON.stringify(manifest.ratios) !== JSON.stringify([2, 2.5, 3, 3.5]) || manifest.cards.length !== 12) fail('Wrong release manifest');
const js = fs.readFileSync(path.join(root, 'manifest.js'), 'utf8');
if (js !== `window.TalkTagVocal001002Variants = ${JSON.stringify(manifest)};\n`) fail('Browser and JSON manifests differ');
for (const card of manifest.cards) {
  const lesson = catalog(card.episode).levels[card.level];
  if (card.id !== `family-${card.episode}-${card.level}` ||
      card.lines.length !== lesson.lines.length || card.steps.length !== lesson.lines.length ||
      card.lines.some((line, i) => line.text !== lesson.lines[i])) fail(`Catalog mismatch ${card.id}`);
  for (const line of card.lines) media(line);
  for (const [stepIndex, step] of card.steps.entries()) {
    if (step.step !== stepIndex + 1 || step.variants.length !== 4) fail(`Step shape mismatch ${card.id} ${stepIndex + 1}`);
    for (const [ratioIndex, variant] of step.variants.entries()) {
      if (variant.ratio !== manifest.ratios[ratioIndex] || variant.cues.length !== step.step) fail(`Ratio/cue count mismatch ${card.id}`);
      const pcm = decode(media(variant));
      const duration = seconds(pcm.length / 2);
      if (Math.abs(duration - variant.durationSeconds) > 0.001) fail(`Duration mismatch ${card.id} step ${step.step}`);
      for (const [i, cue] of variant.cues.entries()) {
        if (cue.i !== i || cue.s >= cue.voiceEnd || cue.voiceEnd >= cue.e || cue.e > duration + 0.001) fail(`Cue invalid ${card.id} step ${step.step} line ${i + 1}`);
        const audible = active(pcm, cue.s - 0.08, cue.voiceEnd + 0.08);
        if (Math.abs(audible.start - cue.s) > 0.11 || Math.abs(audible.end - cue.voiceEnd) > 0.11) fail(`Speech alignment ${card.id} step ${step.step} line ${i + 1}`);
        const next = variant.cues[i + 1];
        const nextStart = next ? active(pcm, next.s - 0.08, next.voiceEnd + 0.08).start : duration;
        const target = next ? .35 : Math.max(3, (cue.voiceEnd - variant.cues[0].s) * variant.ratio);
        const actual = nextStart - audible.end;
        const error = actual - target;
        worstError = Math.max(worstError, Math.abs(error));
        if (actual + 0.11 < target || Math.abs(error) > 0.13) fail(`Pause ${card.id} step ${step.step} line ${i + 1}: ${actual.toFixed(3)}s versus ${target.toFixed(3)}s`);
      }
    }
  }
  console.log(`PASS ${card.id}: ${card.lines.length} lines, ${card.steps.length * 4} decoded variants`);
}
console.log(`PASS ${manifest.cards.length} cards, ${files} verified MP3s, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB; worst decoded pause error ${worstError.toFixed(3)}s.`);
