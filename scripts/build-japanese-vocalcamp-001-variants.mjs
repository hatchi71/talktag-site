#!/usr/bin/env node
// Assemble one-speaker-turn masters into cumulative Japanese Vocal Camp 001
// steps. This script never calls TTS and never edits the approved source MP3s.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(repo, 'content/vocalcamp-japanese-001-source.json'), 'utf8'));
const outputRoot = path.join(repo, 'audio/japanese/vocalcamp/segments-001');
const localBase = '/audio/japanese/vocalcamp/segments-001/';
const r2Base = 'Japanese/boot-camp/vocal-camp/segments-001/v2-20261017/';
const releaseBase = `https://audio.talktag.co.kr/${r2Base}`;
const rate = 48000;
const ratios = [2, 2.5, 3, 3.5];
const silence = Buffer.alloc(rate * 2);
const count = pcm => pcm.length / 2;
const sec = samples => Number((samples / rate).toFixed(6));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ratioName = ratio => ratio.toFixed(1).replace('.', '_');

function run(command, args) {
  const result = spawnSync(command, args, {encoding: null, maxBuffer: 96 * 1024 * 1024});
  if (result.error || result.status !== 0) {
    throw Error(`${command}: ${result.error?.message || String(result.stderr).slice(-1000)}`);
  }
  return result.stdout;
}
function decode(file) {
  if (!fs.existsSync(file)) throw Error(`Missing Japanese line master: ${file}`);
  return run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']);
}
function activeRange(pcm) {
  const frame = 480, data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  let first = -1, last = -1;
  for (let offset = 0; offset < data.length; offset += frame) {
    const end = Math.min(data.length, offset + frame);
    let energy = 0;
    for (let i = offset; i < end; i++) energy += data[i] * data[i];
    if (Math.sqrt(energy / (end - offset)) / 32768 >= 0.001) {
      if (first < 0) first = offset;
      last = end;
    }
  }
  if (first < 0 || last <= first) throw Error('No audible Japanese speech in master');
  return {first, last};
}
function writeSilence(fd, samples) {
  if (samples < 0) throw Error(`Negative silence requested: ${samples}`);
  for (let left = samples; left > 0;) {
    const n = Math.min(rate, left);
    fs.writeSync(fd, silence, 0, n * 2);
    left -= n;
  }
}
function encode(raw, output) {
  fs.mkdirSync(path.dirname(output), {recursive: true});
  run('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
    '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', output]);
}
function fileRecord(file, relative) {
  const digest = sha(file);
  return {audio: `${releaseBase}${relative}?v=${digest.slice(0, 12)}`,
    localAudio: `${localBase}${relative}`, r2Key: `${r2Base}${relative}`,
    bytes: fs.statSync(file).size, sha256: digest};
}

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const cards = [];
for (const level of levels) {
  const turns = source.levels[level];
  if (!Array.isArray(turns) || !turns.length) throw Error(`Missing ${level} turns`);
  const lines = [];
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.id !== `J-VC-001-${level}-${String(i + 1).padStart(2, '0')}` ||
        !turn.japanese || !turn.reading || !turn.korean ||
        turn.scribeTranscript !== turn.japanese) throw Error(`Script/provenance mismatch: ${turn.id}`);
    const original = path.join(repo, 'audio/japanese/vocalcamp/001', level,
      `line-${String(i + 1).padStart(2, '0')}.mp3`);
    const decoded = decode(original), active = activeRange(decoded);
    const first = Math.max(0, active.first - Math.round(rate * 0.08));
    const last = Math.min(count(decoded), active.last + Math.round(rate * 0.12));
    const pcm = Buffer.from(decoded.subarray(first * 2, last * 2));
    const relative = `001/${level.toLowerCase()}/line-${String(i + 1).padStart(2, '0')}.mp3`;
    const output = path.join(outputRoot, relative);
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-vc-line-'));
    try {
      const raw = path.join(scratch, 'line.pcm');
      fs.writeFileSync(raw, pcm);
      encode(raw, output);
    } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
    lines.push({id: turn.id, speaker: turn.speaker, japanese: turn.japanese,
      reading: turn.reading, korean: turn.korean, generationId: turn.generation_id,
      scribeTranscript: turn.scribeTranscript, sourceSha256: sha(original),
      pcm, samples: count(pcm), voiceStart: active.first - first,
      voiceEnd: active.last - first, speechSeconds: sec(active.last - active.first),
      ...fileRecord(output, relative)});
  }
  const steps = [];
  for (let k = 1; k <= lines.length; k++) {
    const variants = [];
    for (const ratio of ratios) {
      const relative = `001/${level.toLowerCase()}/pause-${ratioName(ratio)}/step-${String(k).padStart(2, '0')}.mp3`;
      const output = path.join(outputRoot, relative);
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-vc-step-'));
      const raw = path.join(scratch, 'assembly.pcm');
      let fd;
      try {
        fd = fs.openSync(raw, 'w');
        let cursor = 0;
        const cues = [];
        for (let i = 0; i < k; i++) {
          const line = lines[i];
          const voiceStart = cursor + line.voiceStart, voiceEnd = cursor + line.voiceEnd;
          fs.writeSync(fd, line.pcm);
          cursor += line.samples;
          const nextLead = i + 1 < k ? lines[i + 1].voiceStart : 0;
          const target = i + 1 < k ? Math.max(Math.round(.35 * rate), line.samples - line.voiceEnd + nextLead) : Math.max(3 * rate, Math.round((voiceEnd - lines[0].voiceStart) * ratio));
          const gap = target - (line.samples - line.voiceEnd) - nextLead;
          writeSilence(fd, gap);
          cursor += gap;
          cues.push({lineId: line.id, speaker: line.speaker,
            start: sec(voiceStart), voiceEnd: sec(voiceEnd), pauseEnd: sec(cursor),
            targetPauseSeconds: sec(target)});
        }
        fs.closeSync(fd); fd = undefined;
        encode(raw, output);
        const decoded = decode(output);
        if (Math.abs(count(decoded) - cursor) > 2304) {
          throw Error(`Decoded duration mismatch: ${level}/${k}/${ratio}`);
        }
        variants.push({ratio, durationSeconds: sec(count(decoded)), cues,
          ...fileRecord(output, relative)});
      } finally {
        if (fd !== undefined) fs.closeSync(fd);
        fs.rmSync(scratch, {recursive: true, force: true});
      }
    }
    steps.push({step: k, variants});
  }
  cards.push({id: `japanese-vocalcamp-001-${level}`, episode: '001', level,
    title: 'First Community Class', lines: lines.map(({pcm, samples, voiceStart, voiceEnd, ...data}) => data), steps});
  console.log(`${level}: ${lines.length} isolated lines and ${steps.length * ratios.length} cumulative variants`);
}
const manifest = {version: 1, status: source.status, episode: '001', title: source.title,
  modelId: source.model_id, voices: source.voices, ratios, minimumPauseSeconds: 3,
  releaseBase, localBase, r2Base, cards};
fs.mkdirSync(outputRoot, {recursive: true});
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(outputRoot, 'manifest.js'),
  `window.TalkTagJapaneseVocal001Variants = ${JSON.stringify(manifest)};\n`);
console.log(`Built ${cards.length} Japanese Vocal Camp cards and ${cards.reduce((n, card) => n + card.steps.length * 4, 0)} cumulative variants.`);
