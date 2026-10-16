#!/usr/bin/env node
// Assemble native-audio fallbacks for English Guided L&R 001/002 from isolated QC WAVs.
// Never re-encode the independently playable line MP3s into these long-form files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const episode = process.env.GLR_EPISODE || '001';
if (!['001', '002'].includes(episode)) throw new Error(`Unsupported GLR episode: ${episode}`);
const segmentRoot = path.join(repo, `audio/guided/segments-${episode}`);
const outputRoot = path.join(segmentRoot, 'variants');
const segments = JSON.parse(fs.readFileSync(path.join(segmentRoot, 'manifest.json'), 'utf8'));
const releaseBase = `https://audio.talktag.co.kr/English/guided/segments-${episode}/v1-20261016/`;
const packageRoot = path.resolve(repo, segments.sourcePackage);
const sampleRate = 48000;
const bytesPerSample = 2;
const ratios = [2, 2.5, 3, 3.5];
const silenceChunk = Buffer.alloc(sampleRate * bytesPerSample);

function run(command, args, encoding = null) {
  const result = spawnSync(command, args, { encoding, maxBuffer: 128 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message || String(result.stderr).slice(-1600)}`);
  }
  return result.stdout;
}

function decode(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing source: ${file}`);
  const pcm = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(sampleRate), '-ac', '1', '-f', 's16le', 'pipe:1']);
  if (!Buffer.isBuffer(pcm) || pcm.length < 9600 || pcm.length % bytesPerSample) {
    throw new Error(`Invalid decoded PCM: ${file}`);
  }
  return pcm;
}

function checksum(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function seconds(samples) { return Number((samples / sampleRate).toFixed(6)); }
function samples(pcm) { return pcm.length / bytesPerSample; }

// Same 10 ms RMS speech-boundary convention as the segmented media manifest.
// The 20 ms guards deliberately err toward a longer, not shorter, response gap.
function measureActive(pcm, guardSamples = 0) {
  const frame = 480;
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const rms = [];
  for (let offset = 0; offset < data.length; offset += frame) {
    const end = Math.min(offset + frame, data.length);
    let sum = 0;
    for (let i = offset; i < end; i++) sum += data[i] * data[i];
    const value = Math.sqrt(sum / (end - offset)) / 32768;
    rms.push(value);
  }
  // A relative-to-peak threshold cut off quiet consonant tails (up to 350 ms).
  // Keep this absolute threshold identical to the decoded-output validator.
  const threshold = 0.001;
  const first = rms.findIndex(value => value >= threshold);
  const last = rms.findLastIndex(value => value >= threshold);
  if (first < 0 || last < first) throw new Error('No audible waveform in decoded source');
  return {
    start: Math.max(0, first * frame - guardSamples),
    end: Math.min(data.length, (last + 1) * frame + guardSamples),
  };
}

function writeSilence(fd, count) {
  if (count < 0) throw new Error(`A negative response silence was required: ${count} samples`);
  let remaining = count;
  while (remaining > 0) {
    const n = Math.min(remaining, sampleRate);
    fs.writeSync(fd, silenceChunk, 0, n * bytesPerSample);
    remaining -= n;
  }
}

function fullPath(url) {
  if (!url.startsWith(releaseBase)) throw new Error(`Unexpected segment URL: ${url}`);
  return path.join(segmentRoot, url.slice(releaseBase.length).split('?')[0]);
}

if (segments.releaseBase !== releaseBase) throw new Error('Segment release URL prefix changed');
if (JSON.stringify(segments.defaults.pauseMultipliers) !== JSON.stringify(ratios)) {
  throw new Error('Segment and fallback pause multipliers differ');
}
const dings = {
  start: decode(fullPath(segments.dings.start.audio)),
  end: decode(fullPath(segments.dings.end.audio)),
};
const endTone = measureActive(dings.end);
const cards = [];
let totalBytes = 0;
fs.mkdirSync(outputRoot, { recursive: true });

for (const card of segments.cards) {
  const sourceLines = card.lines.map(line => {
    const wav = path.resolve(packageRoot, line.sourceWav);
    if (!wav.startsWith(`${packageRoot}${path.sep}`) || checksum(wav) !== line.sourceSha256) {
      throw new Error(`Source WAV path/hash mismatch: ${card.id} line ${line.index}`);
    }
    const pcm = decode(wav);
    return { pcm, active: measureActive(pcm, 960), count: samples(pcm) };
  });
  const reps = card.repetitions;
  const expectedReps = /^[AB]/.test(card.level) ? card.level.startsWith('A') ? 10 : 15 : 21;
  if (reps !== expectedReps || sourceLines.length !== card.lines.length) {
    throw new Error(`Line/repetition mismatch: ${card.id}`);
  }
  const cardVariants = [];
  for (const ratio of ratios) {
    const level = card.level.toLowerCase();
    const ratioName = ratio.toFixed(1).replace('.', '_');
    const relative = `audio/guided/segments-${episode}/variants/${level}/pause-${ratioName}.mp3`;
    const output = path.join(repo, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `talktag-glr${episode}-`));
    const raw = path.join(scratch, 'assembly.pcm');
    const encoded = path.join(scratch, 'variant.mp3');
    let fd;
    try {
      fd = fs.openSync(raw, 'w');
      let cursor = 0;
      fs.writeSync(fd, dings.start);
      cursor += samples(dings.start);
      const cues = [];
      const measuredSpeech = [];
      const events = [];
      for (let i = 0; i < sourceLines.length; i++) {
        for (let r = 1; r <= reps; r++) events.push({ i, r, line: sourceLines[i] });
      }
      for (let n = 0; n < events.length; n++) {
        const event = events[n];
        const { i, r, line } = event;
        const clipStart = cursor;
        const speechStart = cursor + line.active.start;
        const speechEnd = cursor + line.active.end;
        fs.writeSync(fd, line.pcm);
        cursor += line.count;
        const next = events[n + 1];
        const voiceLength = line.active.end - line.active.start;
        const targetGap = Math.max(3 * sampleRate, Math.round(voiceLength * ratio));
        const currentTail = line.count - line.active.end;
        const nextLead = next ? next.line.active.start : endTone.start;
        const responseSilence = targetGap - currentTail - nextLead;
        if (responseSilence < 0) throw new Error(`Clip tail overlaps required gap: ${card.id} ${ratio} ${i + 1}.${r}`);
        writeSilence(fd, responseSilence);
        cursor += responseSilence;
        cues.push({ s: seconds(clipStart), e: seconds(cursor), voiceEnd: seconds(speechEnd), i, r });
        measuredSpeech.push({ start: seconds(speechStart), end: seconds(speechEnd), i, r });
      }
      const endingCueStart = seconds(cursor);
      fs.writeSync(fd, dings.end);
      cursor += samples(dings.end);
      fs.closeSync(fd);
      fd = undefined;
      const args = ['-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', raw,
        '-map_metadata', '-1', '-id3v2_version', '3', '-codec:a', 'libmp3lame', '-q:a', '4', encoded];
      run('ffmpeg', args);
      const decoded = decode(encoded);
      const decodedSamples = samples(decoded);
      if (Math.abs(decodedSamples - cursor) > 2 * 1152) {
        throw new Error(`Decoded sample length differs from assembly: ${card.id} ${ratio} ${decodedSamples} vs ${cursor}`);
      }
      fs.renameSync(encoded, output);
      const bytes = fs.statSync(output).size;
      const digest = checksum(output);
      totalBytes += bytes;
      cardVariants.push({
        ratio, audio: `${releaseBase}${relative.slice(`audio/guided/segments-${episode}/`.length)}?v=${digest.slice(0, 12)}`, durationSeconds: seconds(decodedSamples),
        bytes, sha256: digest, endingCueStart,
        endingToneLeadSeconds: seconds(endTone.start), cues, measuredSpeech,
      });
      console.log(`${card.id} ${ratio.toFixed(1)}× ${seconds(decodedSamples).toFixed(2)}s ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }
  cards.push({
    id: card.id, level: card.level, title: card.title, repetitions: reps,
    lines: card.lines.map(line => ({ text: line.text, meaning: line.meaning })),
    variants: cardVariants,
  });
}

const manifest = {
  version: 1, releaseBase, sourceRevision: segments.sourceRevision,
  sourceManifest: `/audio/guided/segments-${episode}/manifest.json`,
  pauseRatios: ratios, minimumPauseSeconds: 3,
  cards,
};
const json = JSON.stringify(manifest, null, 2);
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${json}\n`);
fs.writeFileSync(path.join(outputRoot, 'manifest.js'), `window.TalkTagGuided${episode}Variants = ${json};\n`);
console.log(`Built ${cards.length * ratios.length} fallbacks, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB total.`);
