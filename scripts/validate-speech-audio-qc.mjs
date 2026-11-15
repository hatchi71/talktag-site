#!/usr/bin/env node
// General finished-audio gate. Input manifests and output reports stay private.
// Requires ffmpeg and ffprobe; does not generate audio or change source files.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rate = 48000;
export const speechGates = Object.freeze({ minimumSpeechLufs: -19,
  minimumUtteranceRmsDbfs: -25, maximumCueAdvantageDb: 3,
  maximumTruePeakDbtp: -1 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

function run(command, args, maxBuffer = 256 * 1024 * 1024) {
  const result = spawnSync(command, args, { encoding: null, maxBuffer });
  if (result.error || result.status !== 0)
    fail(`${command} failed: ${result.error?.message || String(result.stderr).slice(-500)}`);
  return result;
}

function inspect(file) {
  const result = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'json', file]);
  const seconds = Number(JSON.parse(String(result.stdout)).format?.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) fail(`Cannot measure decoded duration: ${file}`);
  return seconds;
}

function intervalsFor(item, duration) {
  const voice = item.voiceIntervals;
  const cue = item.cueIntervals || [];
  if (!Array.isArray(voice) || !voice.length || !Array.isArray(cue)
    || !['none', 'start-end'].includes(item.cuePolicy))
    fail(`${item.id}: provide voiced intervals and an explicit cue policy`);
  if (item.cuePolicy === 'none' && cue.length
    || item.cuePolicy === 'start-end' && (cue.length !== 2
      || cue[0].kind !== 'start' || cue[1].kind !== 'end'))
    fail(`${item.id}: start/end cues must be measured separately or declared absent`);
  const all = [...voice, ...cue];
  for (const interval of all) {
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end)
      || interval.start < 0 || interval.end <= interval.start
      || interval.end > duration + .05)
      fail(`${item.id}: invalid voice or cue interval`);
  }
  for (const intervals of [voice, cue]) {
    for (let i = 1; i < intervals.length; i++)
      if (intervals[i].start < intervals[i - 1].end)
        fail(`${item.id}: voice or cue intervals overlap or are out of order`);
  }
  for (const spoken of voice) for (const sound of cue)
    if (spoken.start < sound.end && sound.start < spoken.end)
      fail(`${item.id}: a cue overlaps a voiced interval`);
  if (new Set(voice.map((x, i) => x.key ?? String(i))).size !== voice.length)
    fail(`${item.id}: duplicate utterance keys`);
  return { voice, cue };
}

function loudness(file, intervals) {
  const filters = intervals
    ? [`aselect='${intervals.map(x => `between(t,${x.start.toFixed(6)},${x.end.toFixed(6)})`).join('+')}'`,
      'asetpts=N/SR/TB', 'ebur128=peak=true'].join(',')
    : 'ebur128=peak=true';
  const output = String(run('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-i', file,
    '-af', filters, '-f', 'null', '-']).stderr);
  const summaries = [...output.matchAll(/Summary:\s*Integrated loudness:\s*I:\s*(-?(?:\d+(?:\.\d+)?|inf)) LUFS[\s\S]*?True peak:\s*Peak:\s*(-?(?:\d+(?:\.\d+)?|inf)) dBFS/g)];
  const last = summaries.at(-1);
  if (!last) fail(`Missing EBU R128 summary: ${file}`);
  return { lufs: Number(last[1]), truePeakDbtp: Number(last[2]) };
}

function intervalEnergy(pcm, interval) {
  const first = Math.max(0, Math.floor(interval.start * rate));
  const last = Math.min(pcm.length / 2, Math.ceil(interval.end * rate));
  if (last <= first) fail('Voice interval has no decoded samples');
  let sum = 0;
  for (let i = first; i < last; i++) {
    const sample = pcm.readInt16LE(i * 2) / 32768;
    sum += sample * sample;
  }
  return { sum, count: last - first };
}

function rmsDbfs(energy) {
  return energy.sum > 0 ? 10 * Math.log10(energy.sum / energy.count) : -Infinity;
}

export function analyzeSpeechFile(item) {
  if (!item?.id || !isAbsolute(item.file || '') || !/^[a-f0-9]{64}$/.test(item.sha256 || '')
    || !Number.isSafeInteger(item.bytes) || item.bytes <= 0)
    fail('Each audio item needs an ID, absolute path, byte length, and SHA-256');
  const file = resolve(item.file), bytes = readFileSync(file);
  if (bytes.length !== item.bytes || sha(bytes) !== item.sha256)
    fail(`${item.id}: finished audio checksum or byte length changed`);
  const durationSeconds = inspect(file);
  const { voice, cue } = intervalsFor(item, durationSeconds);
  const pcm = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file,
    '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']).stdout;
  const spoken = voice.map((interval, index) => {
    const rmsDbfsValue = rmsDbfs(intervalEnergy(pcm, interval));
    return { key: interval.key ?? String(index), start: interval.start,
      end: interval.end, rmsDbfs: Number(rmsDbfsValue.toFixed(2)) };
  });
  const voiceEnergies = voice.map(x => intervalEnergy(pcm, x));
  const speechRmsDbfs = rmsDbfs(voiceEnergies.reduce((all, x) => ({
    sum: all.sum + x.sum, count: all.count + x.count }), { sum: 0, count: 0 }));
  const cueRmsDbfs = cue.map(x => Number(rmsDbfs(intervalEnergy(pcm, x)).toFixed(2)));
  const whole = loudness(file), speech = loudness(file, voice);
  const weakest = Math.min(...spoken.map(x => x.rmsDbfs));
  const cueAdvantageDb = cueRmsDbfs.length
    ? Math.max(...cueRmsDbfs) - speechRmsDbfs : null;
  const problems = [];
  if (!Number.isFinite(speech.lufs) || speech.lufs < speechGates.minimumSpeechLufs)
    problems.push('speech-too-quiet');
  if (!Number.isFinite(weakest) || weakest < speechGates.minimumUtteranceRmsDbfs)
    problems.push('utterance-too-quiet');
  if (cueAdvantageDb !== null && (!Number.isFinite(cueAdvantageDb)
    || cueAdvantageDb > speechGates.maximumCueAdvantageDb))
    problems.push('cue-overpowers-speech');
  if (!Number.isFinite(whole.truePeakDbtp)
    || whole.truePeakDbtp > speechGates.maximumTruePeakDbtp)
    problems.push('true-peak-too-high');
  return { id: item.id, file, sha256: item.sha256, bytes: item.bytes,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    wholeLufs: whole.lufs, speechLufs: speech.lufs,
    truePeakDbtp: whole.truePeakDbtp,
    speechRmsDbfs: Number(speechRmsDbfs.toFixed(2)),
    weakestUtteranceRmsDbfs: weakest,
    cueRmsDbfs, cueAdvantageDb: cueAdvantageDb === null
      ? null : Number(cueAdvantageDb.toFixed(2)),
    voicedIntervals: spoken, cueIntervals: cue,
    status: problems.length ? 'fail' : 'pass', problems };
}

export function validateSpeechManifest(manifest, sourceSha256) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.media)
    || !manifest.media.length || !/^[a-f0-9]{64}$/.test(sourceSha256 || ''))
    fail('Expected a private speech media manifest and source checksum');
  const ids = new Set(), records = [];
  for (const item of manifest.media) {
    if (ids.has(item.id)) fail(`Duplicate audio ID ${item.id}`);
    ids.add(item.id);
    records.push(analyzeSpeechFile(item));
  }
  const counts = { pass: records.filter(x => x.status === 'pass').length,
    fail: records.filter(x => x.status === 'fail').length };
  return { schemaVersion: 1, sourceManifestSha256: sourceSha256,
    gates: speechGates, counts, records };
}

function main(args) {
  let manifestPath, outPath;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest') manifestPath = resolve(args[++i] || fail('--manifest needs a path'));
    else if (args[i] === '--out') outPath = resolve(args[++i] || fail('--out needs a path'));
    else fail(`Unknown argument ${args[i]}`);
  }
  if (!manifestPath || !outPath || outPath === repository
    || outPath.startsWith(`${repository}${sep}`))
    fail('Use --manifest and a private --out path outside the public repository');
  const manifestBytes = readFileSync(manifestPath);
  const report = validateSpeechManifest(JSON.parse(manifestBytes), sha(manifestBytes));
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Speech audio QC: ${report.counts.pass} pass, ${report.counts.fail} fail. Report: ${outPath}`);
  if (report.counts.fail) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Speech audio QC failed: ${error.message}`); process.exitCode = 1; }
}
