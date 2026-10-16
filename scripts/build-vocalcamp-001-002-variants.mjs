#!/usr/bin/env node
// Rebuild English Vocal Camp 001/002 cumulative steps from their published,
// sample-identical prefixes. No TTS is generated and no existing media is changed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.VOCAL_SOURCE_DIR || '/tmp/talktag-vocalcamp-001-002-sources';
const outputRoot = path.join(repo, 'audio/vocalcamp/segments-001-002');
const releaseBase = 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/segments-001-002/v1-20261016/';
const rate = 48000;
const frame = 480;
const ratios = [2, 2.5, 3, 3.5];
const silence = Buffer.alloc(rate * 2);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sec = samples => Number((samples / rate).toFixed(6));
const count = pcm => pcm.length / 2;

function run(command, args, encoding = null) {
  const result = spawnSync(command, args, { encoding, maxBuffer: 96 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message || String(result.stderr).slice(-900)}`);
  return result.stdout;
}
function decode(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing source: ${file}`);
  return run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']);
}
function activeFrames(pcm) {
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const found = [];
  for (let offset = 0; offset < data.length; offset += frame) {
    let sum = 0;
    const end = Math.min(data.length, offset + frame);
    for (let i = offset; i < end; i++) sum += data[i] * data[i];
    if (Math.sqrt(sum / (end - offset)) / 32768 >= 0.001) found.push(offset);
  }
  if (!found.length) throw new Error('No audible speech in source');
  return found;
}
function writeSilence(fd, samples) {
  if (samples < 0) throw new Error(`Negative silence: ${samples}`);
  for (let left = samples; left > 0;) {
    const n = Math.min(left, rate);
    fs.writeSync(fd, silence, 0, n * 2);
    left -= n;
  }
}
function encodePcm(pcm, output) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-vocal-encode-'));
  try {
    const raw = path.join(scratch, 'source.pcm');
    fs.writeFileSync(raw, pcm);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    run('ffmpeg', ['-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
      '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', output]);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function encodeAssembly(chunks, output) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-vocal-assembly-'));
  const raw = path.join(scratch, 'assembly.pcm');
  try {
    const fd = fs.openSync(raw, 'w');
    try {
      for (const item of chunks) item.kind === 'speech' ? fs.writeSync(fd, item.pcm) : writeSilence(fd, item.samples);
    } finally { fs.closeSync(fd); }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    run('ffmpeg', ['-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
      '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', output]);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function catalog(episode) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(repo, `content/vocalcamp/${episode}.js`), 'utf8'), context);
  const family = context.window.TALKTAG_VOCALCAMP?.families?.[0];
  if (family?.number !== episode) throw new Error(`Wrong Vocal Camp family ${episode}`);
  return family;
}

fs.mkdirSync(outputRoot, { recursive: true });
const cards = [];
for (const episode of ['001', '002']) {
  const family = catalog(episode);
  for (const [level, lesson] of Object.entries(family.levels)) {
    if (lesson.audioSteps.length !== lesson.lines.length) throw new Error(`${episode}/${level}: step/line count mismatch`);
    const paths = lesson.audioSteps.map((track, index) => {
      const expected = `https://audio.talktag.co.kr/English/boot-camp/vocal-camp/${episode}/20261008-qc1/${level.toLowerCase()}/step-${String(index + 1).padStart(2, '0')}.mp3`;
      if (track.step !== index + 1 || track.url !== expected) throw new Error(`${episode}/${level}: source URL mismatch`);
      return path.join(sourceRoot, episode, level, `step-${String(index + 1).padStart(2, '0')}.mp3`);
    });
    const steps = paths.map(decode);
    const final = steps.at(-1);
    const finalActive = activeFrames(final);
    const ends = steps.map((pcm, index) => {
      const energetic = activeFrames(pcm);
      const end = Math.min(count(pcm), energetic.at(-1) + frame + 960);
      if (index < steps.length - 1) {
        const compared = Math.max(0, end - 9600) * 2;
        if (!pcm.subarray(0, compared).equals(final.subarray(0, compared))) {
          throw new Error(`${episode}/${level} step ${index + 1}: cumulative source prefix differs from final recording`);
        }
      }
      return end;
    });
    const lines = [];
    let priorEnd = 0;
    for (let i = 0; i < lesson.lines.length; i++) {
      const firstActive = finalActive.find(sample => sample > priorEnd + (i ? frame : -1));
      const end = ends[i];
      if (firstActive === undefined || end <= firstActive + rate * 0.3) {
        throw new Error(`${episode}/${level} line ${i + 1}: speech boundary is invalid`);
      }
      const start = Math.max(0, firstActive - 960);
      const clip = final.subarray(start * 2, end * 2);
      const lineRelative = `${episode}/${level.toLowerCase()}/line-${String(i + 1).padStart(2, '0')}.mp3`;
      const output = path.join(outputRoot, lineRelative);
      encodePcm(clip, output);
      lines.push({ text: lesson.lines[i], pcm: clip, start: firstActive - start, end: end - start,
        samples: count(clip), audio: `${releaseBase}${lineRelative}?v=${sha(output).slice(0, 12)}`,
        sha256: sha(output), bytes: fs.statSync(output).size,
        speechSeconds: sec(end - firstActive), sourceSha256: sha(paths[i]) });
      priorEnd = end;
    }
    const stepRecords = [];
    for (let k = 1; k <= lines.length; k++) {
      const variants = [];
      for (const ratio of ratios) {
        const parts = [];
        const cues = [];
        let cursor = 0;
        for (let i = 0; i < k; i++) {
          const line = lines[i];
          const voiceStart = cursor + line.start;
          const voiceEnd = cursor + line.end;
          parts.push({ kind: 'speech', pcm: line.pcm });
          cursor += line.samples;
          const target = Math.max(3 * rate, Math.round((line.end - line.start) * ratio));
          const nextLead = i + 1 < k ? lines[i + 1].start : 0;
          const gap = target - (line.samples - line.end) - nextLead;
          if (gap < 0) throw new Error(`${episode}/${level} step ${k} line ${i + 1}: negative pause`);
          parts.push({ kind: 'silence', samples: gap });
          cursor += gap;
          cues.push({ i, s: sec(voiceStart), voiceEnd: sec(voiceEnd), e: sec(cursor) });
        }
        const ratioName = ratio.toFixed(1).replace('.', '_');
        const relative = `${episode}/${level.toLowerCase()}/pause-${ratioName}/step-${String(k).padStart(2, '0')}.mp3`;
        const output = path.join(outputRoot, relative);
        encodeAssembly(parts, output);
        const decoded = decode(output);
        if (Math.abs(count(decoded) - cursor) > 2304) throw new Error(`${episode}/${level} step ${k} ratio ${ratio}: decoded length differs`);
        const digest = sha(output);
        variants.push({ ratio, audio: `${releaseBase}${relative}?v=${digest.slice(0, 12)}`,
          durationSeconds: sec(count(decoded)), bytes: fs.statSync(output).size, sha256: digest, cues });
      }
      stepRecords.push({ step: k, variants });
    }
    cards.push({ id: `family-${episode}-${level}`, episode, level, title: family.title,
      lines: lines.map(({ pcm, samples, start, end, ...data }) => data), steps: stepRecords });
    console.log(`${episode} ${level}: ${lines.length} verified source lines, ${stepRecords.length * 4} pause variants`);
  }
}
const manifest = { version: 1, releaseBase, ratios, minimumPauseSeconds: 3, cards };
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(outputRoot, 'manifest.js'), `window.TalkTagVocal001002Variants = ${JSON.stringify(manifest)};\n`);
console.log(`Built ${cards.length} cards and ${cards.reduce((n, card) => n + card.steps.length * 4, 0)} step variants.`);
