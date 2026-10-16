#!/usr/bin/env node
// Independent media and timing validation for segmented GLR 001/002.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const episode = process.env.GLR_EPISODE || '001';
if (!['001', '002'].includes(episode)) throw new Error(`Unsupported GLR episode: ${episode}`);
const manifestFile = path.join(repo, `audio/guided/segments-${episode}/manifest.json`);
const releaseBase = `https://audio.talktag.co.kr/English/guided/segments-${episode}/v1-20261016/`;
const expectedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const expectedMultipliers = [2, 2.5, 3, 3.5];
const errors = [];

function assert(ok, message) {
  if (!ok) errors.push(message);
}

function run(command, args, encoding = 'utf8') {
  const result = spawnSync(command, args, { encoding, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message || String(result.stderr).slice(-1000)}`);
  }
  return result.stdout;
}

function mediaFile(url) {
  if (typeof url !== 'string' || !url.startsWith(releaseBase)) {
    throw new Error(`Invalid segmented media URL: ${url}`);
  }
  const relative = url.slice(releaseBase.length).split('?')[0];
  const file = path.resolve(repo, `audio/guided/segments-${episode}`, relative);
  if (!file.startsWith(path.join(repo, `audio/guided/segments-${episode}/`) )) {
    throw new Error(`Media URL escapes segment directory: ${url}`);
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing media: ${url}`);
  return file;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function decodedSeconds(file) {
  const data = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', file]));
  assert(data.streams?.[0]?.codec_name === 'mp3', `Not MP3: ${file}`);
  assert(Number(data.streams?.[0]?.sample_rate) === 48000, `Not 48 kHz: ${file}`);
  assert(data.streams?.[0]?.channels === 1, `Not mono: ${file}`);
  const headerSeconds = Number(data.format?.duration);
  const pcm = run('ffmpeg', ['-v', 'error', '-i', file, '-ar', '48000', '-ac', '1', '-f', 's16le', 'pipe:1'], null);
  const seconds = pcm.length / (48000 * 2);
  assert(Number.isFinite(headerSeconds) && Math.abs(headerSeconds - seconds) <= 0.06, `Header/decoded duration mismatch: ${file}`);
  return seconds;
}

function close(a, b, tolerance = 0.001) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

function checkMedia(item, label) {
  const file = mediaFile(item.audio);
  assert(sha256(file) === item.sha256, `Checksum mismatch: ${label}`);
  assert(item.audio.endsWith(`?v=${item.sha256.slice(0, 12)}`), `Cache-busting hash mismatch: ${label}`);
  const seconds = decodedSeconds(file);
  assert(close(seconds, item.durationSeconds), `Decoded duration mismatch: ${label} ${seconds} vs ${item.durationSeconds}`);
  return seconds;
}

function expectedRepetitions(level) {
  return level === 'A1' || level === 'A2' ? 10 : level === 'B1' || level === 'B2' ? 15 : 21;
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  assert(manifest.version === 1, 'Unsupported manifest version');
  assert(manifest.releaseBase === releaseBase, 'Release audio host/prefix mismatch');
  assert(JSON.stringify(manifest.defaults?.pauseMultipliers) === JSON.stringify(expectedMultipliers), 'Pause setting mismatch');
  assert(manifest.defaults?.defaultPauseMultiplier === 2.5, 'Default pause setting must be 2.5×');
  assert(manifest.defaults?.minimumPauseSeconds === 3, 'Minimum pause must be 3 seconds');
  assert(Array.isArray(manifest.cards) && manifest.cards.length === 6, `Expected six ${episode} cards`);
  const dingStart = checkMedia(manifest.dings.start, 'start ding');
  const dingEnd = checkMedia(manifest.dings.end, 'end ding');
  const ids = new Set();
  let totalLines = 0;
  for (const [position, card] of manifest.cards.entries()) {
    assert(card.level === expectedLevels[position], `Level order mismatch at ${position}`);
    assert(card.id === `guided-${card.level.toLowerCase()}-${String(Number(episode)).padStart(2, '0')}`, `Card ID mismatch: ${card.id}`);
    assert(!ids.has(card.id), `Duplicate card ID: ${card.id}`);
    ids.add(card.id);
    assert(card.voiceName === (episode === '001' ? 'Lauren' : 'Jarnathan') && card.accentTag === 'US', `Voice/accent mismatch: ${card.id}`);
    assert(card.repetitions === expectedRepetitions(card.level), `Repeat count mismatch: ${card.id}`);
    assert(card.sourceQc?.technical === 'pass', `Source technical QC not passed: ${card.id}`);
    assert(card.lines.length === card.expressions.length && card.lines.length === card.meanings.length,
      `Script/clip count mismatch: ${card.id}`);
    totalLines += card.lines.length;
    for (const [i, line] of card.lines.entries()) {
      const label = `${card.id} line ${i + 1}`;
      assert(line.index === i + 1, `Line index mismatch: ${label}`);
      assert(line.text === card.expressions[i] && line.meaning === card.meanings[i], `Script/meaning mismatch: ${label}`);
      assert(line.audio.split('?')[0] === `${releaseBase}${card.level.toLowerCase()}/line-${String(i + 1).padStart(2, '0')}.mp3`,
        `Media path mismatch: ${label}`);
      checkMedia(line, label);
      assert(line.speechStartSeconds >= 0 && line.speechEndSeconds <= line.durationSeconds + 0.001 &&
        line.speechEndSeconds > line.speechStartSeconds, `Invalid speech bounds: ${label}`);
      assert(close(line.speechSeconds, line.speechEndSeconds - line.speechStartSeconds), `Speech duration mismatch: ${label}`);
      assert(line.speechSeconds > 0.3, `Speech suspiciously short: ${label}`);
    }

    for (const multiplier of expectedMultipliers) {
      let cardSeconds = dingStart + dingEnd;
      let boundaryCount = 0;
      let minScheduledSilence = Infinity;
      for (let i = 0; i < card.lines.length; i++) {
        const current = card.lines[i];
        for (let rep = 0; rep < card.repetitions; rep++) {
          const next = rep + 1 < card.repetitions ? current : card.lines[i + 1] || null;
          const targetGap = Math.max(3, current.speechSeconds * multiplier);
          const tail = current.durationSeconds - current.speechEndSeconds;
          const lead = next ? next.speechStartSeconds : 0;
          const scheduledSilence = targetGap - tail - lead;
          assert(scheduledSilence >= 0, `Clips would overlap at ${card.id} line ${i + 1} rep ${rep + 1}, ${multiplier}×`);
          const actualSpeechGap = tail + scheduledSilence + lead;
          assert(close(actualSpeechGap, targetGap, 0.00001), `Speech gap mismatch: ${card.id} line ${i + 1} rep ${rep + 1}, ${multiplier}×`);
          assert(actualSpeechGap + 0.00001 >= 3, `Sub-three-second gap: ${card.id} line ${i + 1} rep ${rep + 1}, ${multiplier}×`);
          cardSeconds += current.durationSeconds + scheduledSilence;
          minScheduledSilence = Math.min(minScheduledSilence, scheduledSilence);
          boundaryCount++;
        }
      }
      const maximum = card.level.startsWith('C') ? 900 : 600;
      assert(cardSeconds <= maximum, `Card exceeds ${maximum}s at ${multiplier}×: ${card.id} ${cardSeconds.toFixed(2)}s`);
      console.log(`${card.id} ${multiplier.toFixed(1)}×: ${cardSeconds.toFixed(2)}s, ${boundaryCount} repetitions, shortest inserted silence ${minScheduledSilence.toFixed(2)}s (speech-to-speech pause is at least 3.00s)`);
    }
  }
  assert(totalLines === 24, `Expected 24 line clips, got ${totalLines}`);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: 6 cards, ${totalLines} decoded line clips, 2 dings, all four exact-gap schedules within card limits.`);
    if (manifest.cards.some(card => card.sourceQc?.listeningReview !== 'pass')) {
      console.log('WARNING: Source QC records do not confirm human listening/pronunciation review; complete that check before claiming full audio approval.');
    }
  }
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}
