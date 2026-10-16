#!/usr/bin/env node
// Build one independently playable clip per published English GLR 001 line.
// Source WAVs were isolated from technically QC-passed Lauren recordings in 2026-10.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.resolve(repo, '../2026-09-19/referenced-chatgpt-conversation-this-is-an/output/glr-replacement-001-002');
const source = path.resolve(process.env.GLR001_SOURCE_DIR || path.join(packageRoot, '04_ASSEMBLED'));
const scriptsPath = path.resolve(process.env.GLR001_SCRIPTS_JSON || path.join(packageRoot, 'scripts-v2.json'));
const destination = path.join(repo, 'audio/guided/segments-001');
const releaseBase = 'https://audio.talktag.co.kr/English/guided/segments-001/v1-20261016/';
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const multipliers = [2, 2.5, 3, 3.5];
const minimumPauseSeconds = 3;

function run(command, args, encoding = 'utf8') {
  const result = spawnSync(command, args, { encoding, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message || String(result.stderr).slice(-1200)}`);
  }
  return result.stdout;
}

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing file: ${file}`);
  return file;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function probeSeconds(file) {
  const data = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file]));
  const seconds = Number(data.format?.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Invalid media duration: ${file}`);
  return seconds;
}

// Measure boundaries in decoded output, not in MP3 headers or source WAV metadata.
function decodedSpeech(file) {
  const pcm = run('ffmpeg', ['-v', 'error', '-i', file, '-ar', '48000', '-ac', '1', '-f', 's16le', 'pipe:1'], null);
  if (pcm.length < 9600 || pcm.length % 2) throw new Error(`Empty or invalid decoded PCM: ${file}`);
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const windowSamples = 480; // 10 ms at 48 kHz
  const rms = [];
  let maxRms = 0;
  for (let offset = 0; offset < samples.length; offset += windowSamples) {
    const end = Math.min(offset + windowSamples, samples.length);
    let sum = 0;
    for (let i = offset; i < end; i++) sum += samples[i] * samples[i];
    const value = Math.sqrt(sum / (end - offset)) / 32768;
    rms.push(value);
    maxRms = Math.max(maxRms, value);
  }
  const threshold = Math.max(0.001, maxRms * 0.025);
  const first = rms.findIndex(value => value >= threshold);
  const last = rms.findLastIndex(value => value >= threshold);
  if (first < 0 || last < first) throw new Error(`No measurable speech: ${file}`);
  const decodedSeconds = samples.length / 48000;
  const start = Math.max(0, first * 0.01 - 0.02);
  const end = Math.min(decodedSeconds, (last + 1) * 0.01 + 0.02);
  return {
    decodedSeconds,
    speechStartSeconds: Number(start.toFixed(6)),
    speechEndSeconds: Number(end.toFixed(6)),
    speechSeconds: Number((end - start).toFixed(6)),
  };
}

function encode(input, output, filter = null) {
  if (fs.existsSync(output)) {
    if (fs.statSync(output).mtimeMs < fs.statSync(input).mtimeMs) {
      throw new Error(`Existing output is older than its source; refusing to overwrite: ${output}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const args = ['-v', 'error', '-nostdin', '-i', input];
  if (filter) args.push('-af', filter);
  args.push('-ar', '48000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '192k', output);
  run('ffmpeg', args);
}

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'audio-lessons.js'), 'utf8'), context, { filename: 'audio-lessons.js' });
const catalog = context.window.TalkTagAudioLessons;
if (!Array.isArray(catalog)) throw new Error('Cannot read audio-lessons.js catalog');
const scripts = JSON.parse(fs.readFileSync(requireFile(scriptsPath), 'utf8'));
const verificationPath = path.join(source, 'isolated-sentence-verification.json');
const verification = JSON.parse(fs.readFileSync(requireFile(verificationPath), 'utf8'));
const qcSummary = JSON.parse(fs.readFileSync(requireFile(path.join(packageRoot, '03_QC_FINAL/summary.json')), 'utf8'));
const cards = [];

for (const level of levels) {
  const lower = level.toLowerCase();
  const id = `guided-${lower}-01`;
  const matches = catalog.filter(card => card.id === id);
  if (matches.length !== 1) throw new Error(`Expected exactly one catalog entry for ${id}`);
  const card = matches[0];
  const scriptMatches = scripts.filter(item => item.episode === 1 && item.level === level);
  if (scriptMatches.length !== 1) throw new Error(`Expected exactly one script set for ${id}`);
  const script = scriptMatches[0];
  if (JSON.stringify(Array.from(card.expressions)) !== JSON.stringify(script.en) ||
      JSON.stringify(Array.from(card.meanings)) !== JSON.stringify(script.ko)) {
    throw new Error(`Catalog and script text/meaning mismatch: ${id}`);
  }
  const expectedReps = level === 'A1' || level === 'A2' ? 10 : level === 'B1' || level === 'B2' ? 15 : 21;
  if (card.training?.defaultReps !== expectedReps || card.voiceName !== 'Lauren' || card.accentTag !== 'US') {
    throw new Error(`Published repetition/voice/accent mismatch: ${id}`);
  }
  const qcMatches = qcSummary.files.filter(item => item.id === id);
  if (qcMatches.length !== 1 || qcMatches[0].technicalQc !== 'pass') {
    throw new Error(`Source technical QC did not pass: ${id}`);
  }
  const sourceDir = path.join(source, id);
  const wavs = fs.readdirSync(sourceDir).filter(name => /^sentence-\d+\.wav$/.test(name));
  if (wavs.length !== script.en.length) throw new Error(`Line file count mismatch: ${id}`);
  const lines = [];
  for (let i = 0; i < script.en.length; i++) {
    const index = i + 1;
    const sourceWav = requireFile(path.join(sourceDir, `sentence-${index}.wav`));
    const verified = verification.filter(item => item.id === id && item.sentence === index);
    if (verified.length !== 1 || verified[0].expected !== script.en[i]) {
      throw new Error(`Isolated-line verification mismatch: ${id} line ${index}`);
    }
    const output = path.join(destination, lower, `line-${String(index).padStart(2, '0')}.mp3`);
    encode(sourceWav, output);
    const measurement = decodedSpeech(output);
    const headerSeconds = probeSeconds(output);
    if (Math.abs(headerSeconds - measurement.decodedSeconds) > 0.06) {
      throw new Error(`MP3 header and decoded length differ: ${output}`);
    }
    lines.push({
      index,
      audio: `${releaseBase}${lower}/line-${String(index).padStart(2, '0')}.mp3?v=${sha256(output).slice(0, 12)}`,
      text: script.en[i],
      meaning: script.ko[i],
      durationSeconds: Number(measurement.decodedSeconds.toFixed(6)),
      speechStartSeconds: measurement.speechStartSeconds,
      speechEndSeconds: measurement.speechEndSeconds,
      speechSeconds: measurement.speechSeconds,
      sourceWav: path.relative(packageRoot, sourceWav),
      sourceSha256: sha256(sourceWav),
      sha256: sha256(output),
      asrScore: verified[0].score,
      asrRecognized: verified[0].recognized,
    });
  }
  cards.push({
    id, level, title: card.title, voiceName: card.voiceName, accentTag: card.accentTag,
    expressions: script.en, meanings: script.ko, repetitions: expectedReps, lines,
    sourceQc: { technical: qcMatches[0].technicalQc, listeningReview: qcMatches[0].listeningReview },
  });
}

// The two dings are isolated from the same locally assembled 001 training card.
const dingSource = requireFile(path.join(source, 'guided-a1-01/training-10.mp3'));
const originalManifest = JSON.parse(fs.readFileSync(requireFile(path.join(source, 'manifest.json')), 'utf8'));
const originalA1 = originalManifest.find(item => item.card?.id === 'guided-a1-01')?.card;
if (!originalA1) throw new Error('Original assembled 001 card missing from source manifest');
const startEnd = Number(originalA1.training?.startCueEnd);
const endStart = Number(originalA1.training?.endingCueStart);
const originalDuration = probeSeconds(dingSource);
if (!(startEnd > 0 && endStart > startEnd && originalDuration > endStart)) {
  throw new Error('Original 001 ding cue metadata is invalid');
}
const dings = {};
for (const [name, start, end] of [['start', 0, startEnd], ['end', endStart, originalDuration]]) {
  const output = path.join(destination, `ding-${name}.mp3`);
  encode(dingSource, output, `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS`);
  const decoded = decodedSpeech(output);
  dings[name] = {
    audio: `${releaseBase}ding-${name}.mp3?v=${sha256(output).slice(0, 12)}`,
    durationSeconds: Number(decoded.decodedSeconds.toFixed(6)),
    sha256: sha256(output),
  };
}

const manifest = {
  version: 1,
  releaseBase,
  sourceRevision: 'v2-20261010',
  sourcePackage: path.relative(repo, packageRoot),
  defaults: { pauseMultipliers: multipliers, defaultPauseMultiplier: 2.5, minimumPauseSeconds },
  dings,
  cards,
};
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${cards.length} GLR 001 cards, ${cards.reduce((n, c) => n + c.lines.length, 0)} clips, two dings.`);
console.log(path.join(destination, 'manifest.json'));
