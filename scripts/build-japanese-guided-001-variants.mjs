#!/usr/bin/env node
// Reassemble published Japanese GLR 001 from its isolated, QC-reviewed Miki takes.
// This does not synthesize new speech or change the published catalog.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.JAPANESE_GLR001_SOURCE ||
  '/Users/eungjukim/Desktop/Snowbaling자료작업실/1. TalkTag자료실/Japanese/1. Japanese Sound Check/1. Guided Listen & Repeat/001 Japanese (Miki)';
const auditRoot = path.resolve(repo, '../2026-09-19/referenced-chatgpt-conversation-this-is-an/output/japanese-glr-001');
const outputRoot = path.join(repo, 'audio/japanese/guided/segments-001');
const releaseBase = 'https://audio.talktag.co.kr/Japanese/guided/segments-001/v1-20261016/';
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const ratios = [2, 2.5, 3, 3.5];
const rate = 48000;
const bytesPerSample = 2;
const silenceChunk = Buffer.alloc(rate * bytesPerSample);

function run(command, args, encoding = null) {
  const result = spawnSync(command, args, { encoding, maxBuffer: 128 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message || String(result.stderr).slice(-1800)}`);
  }
  return result.stdout;
}
function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing source: ${file}`);
  return file;
}
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function sampleCount(pcm) { return pcm.length / bytesPerSample; }
function seconds(sampleCountValue) { return Number((sampleCountValue / rate).toFixed(6)); }
function decode(file) {
  const pcm = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', requireFile(file), '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']);
  if (!Buffer.isBuffer(pcm) || pcm.length < 9600 || pcm.length % bytesPerSample) throw new Error(`Invalid decoded audio: ${file}`);
  return pcm;
}
function encode(pcm, output, bitRate = '192k') {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-glr001-encode-'));
  const raw = path.join(scratch, 'audio.pcm');
  const mp3 = path.join(scratch, 'audio.mp3');
  try {
    fs.writeFileSync(raw, pcm);
    run('ffmpeg', ['-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
      '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-b:a', bitRate, mp3]);
    fs.renameSync(mp3, output);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
// Fixed absolute RMS threshold, matching the decoded-file validator. Twenty-ms
// guards err toward a longer response gap around quiet consonant boundaries.
function active(pcm, guardSamples = 0) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const frame = 480;
  let first = -1, last = -1;
  for (let start = 0, index = 0; start < samples.length; start += frame, index++) {
    const end = Math.min(samples.length, start + frame);
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    if (Math.sqrt(sum / (end - start)) / 32768 >= 0.001) { if (first < 0) first = index; last = index; }
  }
  if (first < 0) throw new Error('No audible waveform');
  return { start: Math.max(0, first * frame - guardSamples), end: Math.min(samples.length, (last + 1) * frame + guardSamples) };
}
function writeSilence(fd, samples) {
  if (samples < 0) throw new Error(`Negative pause: ${samples} samples`);
  for (let left = samples; left > 0;) {
    const count = Math.min(left, rate);
    fs.writeSync(fd, silenceChunk, 0, count * bytesPerSample);
    left -= count;
  }
}
function sourceFolder(level) {
  const matches = fs.readdirSync(sourceRoot).filter(name => name.includes(` ${level} (Japanese) Miki`));
  if (matches.length !== 1) throw new Error(`Expected one Miki source folder for ${level}, found ${matches.length}`);
  return path.join(sourceRoot, matches[0]);
}
function publishedCards() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(repo, 'native-guided-data.js'), 'utf8'), context, { filename: 'native-guided-data.js' });
  const cards = context.window.TalkTagNativeCatalogs?.ja;
  if (!Array.isArray(cards) || cards.length !== 8 || cards.some(card => card.unit !== 1 || card.voiceName !== 'Miki')) {
    throw new Error('Published Japanese GLR 001 catalog differs from the approved Miki set');
  }
  return cards;
}

const cards = publishedCards();
const plan = JSON.parse(fs.readFileSync(path.join(auditRoot, 'production-plan.json'), 'utf8'));
const cutAudit = JSON.parse(fs.readFileSync(path.join(auditRoot, 'cut-speech-audit.json'), 'utf8'));
const qc = JSON.parse(fs.readFileSync(path.join(auditRoot, 'qc-summary.json'), 'utf8'));
const lineSources = new Map();
for (const level of levels) {
  const script = plan.find(item => item.level === level);
  const review = qc.find(item => item.level === level);
  if (!script || !review || review.technicalQc !== 'pass') throw new Error(`Missing source script or technical QC: ${level}`);
  const folder = sourceFolder(level);
  for (let index = 1; index <= script.ja.length; index++) {
    // Split cards keep the original episode-wide sentence index in the audit.
    const evidence = cutAudit.filter(item => item.card.startsWith(`ja-guided-${level.toLowerCase()}-001`) && item.sentence === index);
    if (evidence.length !== 1 || evidence[0].expected !== script.ja[index - 1] || /ブレイクタイム/.test(evidence[0].recognized)) {
      throw new Error(`Japanese line boundary or source script audit failed: ${level} sentence ${index}`);
    }
    const wav = requireFile(path.join(folder, '04 Training Cards', `sentence-${index}.wav`));
    const file = path.join(outputRoot, level.toLowerCase(), `line-${String(index).padStart(2, '0')}.mp3`);
    if (!fs.existsSync(file)) encode(decode(wav), file);
    const pcm = decode(file);
    const measured = active(pcm, 960);
    lineSources.set(`${level}:${index}`, {
      text: script.ja[index - 1], meaning: script.ko[index - 1], englishMeaning: script.en[index - 1],
      file, pcm, measured, count: sampleCount(pcm), sourceWav: wav, sourceSha256: sha256(wav),
      audio: `${releaseBase}${level.toLowerCase()}/line-${String(index).padStart(2, '0')}.mp3?v=${sha256(file).slice(0, 12)}`,
      durationSeconds: seconds(sampleCount(pcm)), speechSeconds: seconds(measured.end - measured.start),
      bytes: fs.statSync(file).size, sha256: sha256(file),
    });
  }
}

// Preserve the original Miki card's opening/closing sounds, now on every variant.
const a1Folder = sourceFolder('A1');
const a1Card = JSON.parse(fs.readFileSync(path.join(a1Folder, '04 Training Cards', 'ja-guided-a1-001.json'), 'utf8'));
const a1Training = a1Card.card?.training || a1Card.training;
if (!(a1Training?.startCueEnd > 0 && a1Training?.endingCueStart > a1Training.startCueEnd)) {
  throw new Error('Original Japanese A1 start/end ding cues are missing');
}
const assembled = decode(path.join(a1Folder, '04 Training Cards', 'ja-guided-a1-001.mp3'));
const opening = assembled.subarray(0, Math.round(a1Training.startCueEnd * rate) * bytesPerSample);
const closing = assembled.subarray(Math.round(a1Training.endingCueStart * rate) * bytesPerSample);
const dingFiles = { start: path.join(outputRoot, 'ding-start.mp3'), end: path.join(outputRoot, 'ding-end.mp3') };
if (!fs.existsSync(dingFiles.start)) encode(opening, dingFiles.start);
if (!fs.existsSync(dingFiles.end)) encode(closing, dingFiles.end);
const dings = { start: decode(dingFiles.start), end: decode(dingFiles.end) };
const endTone = active(dings.end);
const manifestCards = [];
let totalBytes = 0;

for (const card of cards) {
  const script = plan.find(item => item.level === card.level);
  const start = card.sentenceStart - 1;
  if (JSON.stringify(Array.from(card.expressions)) !== JSON.stringify(script.ja.slice(start, card.sentenceEnd)) ||
      JSON.stringify(Array.from(card.meanings)) !== JSON.stringify(script.ko.slice(start, card.sentenceEnd))) {
    throw new Error(`Published Japanese/Korean lines changed: ${card.id}`);
  }
  const reps = card.level.startsWith('A') ? 10 : card.level.startsWith('B') ? 15 : 21;
  if (card.training?.defaultReps !== reps || card.training?.cues?.length !== reps * card.expressions.length) {
    throw new Error(`Repetition count changed: ${card.id}`);
  }
  const lines = card.expressions.map((_, index) => lineSources.get(`${card.level}:${start + index + 1}`));
  const variants = [];
  for (const ratio of ratios) {
    const ratioName = ratio.toFixed(1).replace('.', '_');
    const relative = `variants/${card.level.toLowerCase()}/${card.partIndex > 1 ? `part-${card.partIndex}/` : ''}pause-${ratioName}.mp3`;
    const output = path.join(outputRoot, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'talktag-ja-glr001-assemble-'));
    const raw = path.join(scratch, 'assembly.pcm');
    const encoded = path.join(scratch, 'variant.mp3');
    let fd;
    try {
      fd = fs.openSync(raw, 'w');
      fs.writeSync(fd, dings.start);
      let cursor = sampleCount(dings.start);
      const events = lines.flatMap((line, i) => Array.from({ length: reps }, (_, n) => ({ line, i, r: n + 1 })));
      const cues = [], measuredSpeech = [];
      for (let n = 0; n < events.length; n++) {
        const { line, i, r } = events[n];
        const clipStart = cursor;
        const speechStart = cursor + line.measured.start;
        const speechEnd = cursor + line.measured.end;
        fs.writeSync(fd, line.pcm);
        cursor += line.count;
        const next = events[n + 1];
        const voiceSamples = line.measured.end - line.measured.start;
        const targetGap = Math.max(rate * 3, Math.round(voiceSamples * ratio));
        const tail = line.count - line.measured.end;
        const nextLead = next ? next.line.measured.start : endTone.start;
        const silentSamples = targetGap - tail - nextLead;
        writeSilence(fd, silentSamples);
        cursor += silentSamples;
        cues.push({ s: seconds(clipStart), voiceEnd: seconds(speechEnd), e: seconds(cursor), i, r });
        measuredSpeech.push({ start: seconds(speechStart), end: seconds(speechEnd), i, r });
      }
      const endingCueStart = seconds(cursor);
      fs.writeSync(fd, dings.end);
      cursor += sampleCount(dings.end);
      fs.closeSync(fd); fd = undefined;
      run('ffmpeg', ['-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw,
        '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', encoded]);
      const decoded = decode(encoded);
      if (Math.abs(sampleCount(decoded) - cursor) > 2 * 1152) throw new Error(`Encoded duration mismatch: ${card.id} ${ratio}`);
      fs.renameSync(encoded, output);
      const digest = sha256(output), bytes = fs.statSync(output).size;
      totalBytes += bytes;
      variants.push({ ratio, audio: `${releaseBase}${relative}?v=${digest.slice(0, 12)}`, durationSeconds: seconds(sampleCount(decoded)),
        bytes, sha256: digest, endingCueStart, endingToneLeadSeconds: seconds(endTone.start), cues, measuredSpeech });
      console.log(`${card.id} ${ratio.toFixed(1)}× ${seconds(sampleCount(decoded)).toFixed(2)}s ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }
  manifestCards.push({ id: card.id, level: card.level, partIndex: card.partIndex, repetitions: reps, title: card.title,
    lines: lines.map(line => ({ text: line.text, meaning: line.meaning, englishMeaning: line.englishMeaning,
      audio: line.audio, durationSeconds: line.durationSeconds, speechSeconds: line.speechSeconds,
      bytes: line.bytes, sha256: line.sha256, sourceSha256: line.sourceSha256 })), variants });
}

const manifest = { version: 1, releaseBase, sourceRevision: 'ja-glr-001-Miki-QC-20261010',
  pauseRatios: ratios, defaultPauseRatio: 2.5, minimumPauseSeconds: 3,
  dings: Object.fromEntries(Object.entries(dingFiles).map(([name, file]) => [name, {
    audio: `${releaseBase}ding-${name}.mp3?v=${sha256(file).slice(0, 12)}`, bytes: fs.statSync(file).size,
    sha256: sha256(file), durationSeconds: seconds(sampleCount(dings[name])) }])),
  cards: manifestCards };
const json = JSON.stringify(manifest, null, 2);
fs.mkdirSync(path.join(outputRoot, 'variants'), { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'variants/manifest.json'), `${json}\n`);
fs.writeFileSync(path.join(outputRoot, 'variants/manifest.js'), `window.TalkTagJapaneseGuidedVariants = ${json};\n`);
console.log(`Built ${manifestCards.length} Japanese cards, ${lineSources.size} isolated MP3s and ${manifestCards.length * ratios.length} variants (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`);
