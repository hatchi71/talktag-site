#!/usr/bin/env node
// Reassemble approved Korean essay masters from isolated sentence audio.
// No TTS call; originals remain available as a recoverable playback fallback.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(repo, 'audio/korean/audio-essays-articles/segments-001');
const releaseBase = 'https://audio.talktag.co.kr/Korean/audio-essays-articles/segments-001/v1-20261016/';
const rate = 48000;
const ratios = [2, 2.5, 3, 3.5];
const empty = Buffer.alloc(rate * 2);
const seconds = samples => Number((samples / rate).toFixed(6));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function run(command, args) {
  const result = spawnSync(command, args, { encoding: null, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw Error(`${command}: ${result.error?.message || String(result.stderr).slice(-1000)}`);
  return result.stdout;
}
const decode = file => run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']);
function encode(pcm, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ko-essay-'));
  try {
    const raw = path.join(scratch, 'audio.pcm');
    fs.writeFileSync(raw, pcm);
    run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
      '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', target]);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function active(pcm) {
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
  const frame = 480;
  let first = -1, last = -1;
  for (let offset = 0; offset < data.length; offset += frame) {
    const end = Math.min(data.length, offset + frame);
    let power = 0;
    for (let index = offset; index < end; index++) power += data[index] * data[index];
    if (Math.sqrt(power / (end - offset)) / 32768 >= 0.001) {
      if (first < 0) first = offset;
      last = end;
    }
  }
  if (first < 0 || last <= first) throw Error('Sentence clip contains no speech');
  return { first, last };
}
function record(file, relative) {
  const sha256 = hash(file);
  return { audio: `${releaseBase}${relative}?v=${sha256.slice(0, 12)}`, sha256, bytes: fs.statSync(file).size };
}
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'native-audio-korean-aea-001.js'), 'utf8'), context);
const lessons = context.window.TalkTagNativeCatalogs.ko;
if (lessons.length !== 6) throw Error('Expected six Korean essay levels');
const cards = [];
for (const lesson of lessons) {
  const level = lesson.level.toLowerCase();
  const source = path.join(repo, 'audio/korean/audio-essays-articles/001', `${level}.mp3`);
  const sourceHash = hash(source);
  const master = decode(source);
  const fullSamples = master.length / 2;
  const boundaries = [0, ...lesson.sentenceGaps.map(([end, next]) => Math.round((end + next) * rate / 2)), fullSamples];
  if (boundaries.length !== lesson.expressions.length + 1) throw Error(`${lesson.level}: sentence boundary count mismatch`);
  const lines = [];
  for (let index = 0; index < lesson.expressions.length; index++) {
    const slice = master.subarray(boundaries[index] * 2, boundaries[index + 1] * 2);
    const signal = active(slice);
    const start = Math.max(0, signal.first - Math.round(0.08 * rate));
    const end = Math.min(slice.length / 2, signal.last + Math.round(0.12 * rate));
    const pcm = Buffer.from(slice.subarray(start * 2, end * 2));
    const refined = active(pcm);
    const relative = `${level}/line-${String(index + 1).padStart(2, '0')}.mp3`;
    const target = path.join(outputRoot, relative);
    encode(pcm, target);
    lines.push({ index: index + 1, text: lesson.expressions[index], meaning: lesson.meanings[index], pcm,
      count: pcm.length / 2, voiceStart: refined.first, voiceEnd: refined.last,
      speechSeconds: seconds(refined.last - refined.first), ...record(target, relative) });
  }
  const variants = [];
  for (const ratio of ratios) {
    const buffers = [];
    const cues = [];
    let cursor = 0;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const start = cursor;
      buffers.push(line.pcm);
      cursor += line.count;
      const voiceEnd = cursor - (line.count - line.voiceEnd);
      if (index < lines.length - 1) {
        const nextLead = lines[index + 1].voiceStart;
        const target = Math.max(3 * rate, Math.round((line.voiceEnd - line.voiceStart) * ratio));
        const extra = target - (line.count - line.voiceEnd) - nextLead;
        if (extra < 0) throw Error(`${lesson.level}/${index + 1}: natural gap exceeds requested pause`);
        for (let left = extra; left > 0;) {
          const count = Math.min(left, rate);
          buffers.push(empty.subarray(0, count * 2));
          cursor += count;
          left -= count;
        }
      }
      cues.push({ s: seconds(start), voiceEnd: seconds(voiceEnd), e: seconds(cursor), i: index });
    }
    const relative = `${level}/pause-${ratio.toFixed(1).replace('.', '_')}.mp3`;
    const target = path.join(outputRoot, relative);
    encode(Buffer.concat(buffers), target);
    const durationSeconds = seconds(decode(target).length / 2);
    if (Math.abs(durationSeconds - seconds(cursor)) > 0.05) throw Error(`${lesson.level}/${ratio}: encoded duration changed`);
    variants.push({ ratio, durationSeconds, cues, ...record(target, relative) });
  }
  cards.push({ id: lesson.id, level: lesson.level, sourceSha256: sourceHash,
    lines: lines.map(({ pcm, count, voiceStart, voiceEnd, ...item }) => item), variants });
  console.log(`${lesson.level}: ${lines.length} isolated sentences, four pause variants`);
}
const manifest = { version: 1, releaseBase, pauseRatios: ratios, minimumPauseSeconds: 3,
  publicationReady: true, sourceRevision: 'korean-aea-001-20261015', cards };
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(outputRoot, 'manifest.js'), `window.TalkTagKoreanEssayVariants = ${JSON.stringify(manifest)};\n`);
console.log(`Built ${cards.length} essay cards, ${cards.reduce((count, card) => count + card.lines.length, 0)} line clips, ${cards.length * 4} timed variants.`);
