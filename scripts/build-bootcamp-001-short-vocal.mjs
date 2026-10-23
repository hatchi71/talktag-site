#!/usr/bin/env node
// Assemble new, short Vocal Camp 001 in en/ko/ja from QC-approved beat masters.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.env.TALKTAG_BOOTCAMP_LANG || 'en';
const config = {
  en: { heading: 'English Vocal Camp 001', root: 'English', output: 'audio/vocalcamp/short-001-v3',
    title: 'The Spare Glove', global: 'TalkTagVocal001ShortVariants' },
  ko: { heading: 'Korean Vocal Camp 001', root: 'Korean', output: 'audio/korean/vocalcamp/short-001-v3',
    title: '정류장의 우산', global: 'TalkTagKoreanVocal001ShortVariants' },
  ja: { heading: 'Japanese Vocal Camp 001', root: 'Japanese', output: 'audio/japanese/vocalcamp/short-001-v3',
    title: '教室のノート', global: 'TalkTagJapaneseVocal001ShortVariants' }
}[lang];
if (!config) throw new Error(`Unsupported language: ${lang}`);
const source = fs.readFileSync(path.join(repo, 'content/bootcamp-001-short-stories.draft.md'), 'utf8');
const section = source.split(/^## /m).find(part => part.startsWith(config.heading));
if (!section) throw new Error(`Missing new ${config.heading} source`);
const rows = section.split('\n').filter(line => /^\| (A1|A2|B1|B2|C1|C2) \|/u.test(line))
  .map(row => row.split('|').slice(1, -1).map(text => text.trim()));
const qc = JSON.parse(fs.readFileSync(path.join(repo, `content/audio/bootcamp-001-v3/${lang}-source-qc.json`), 'utf8'));
const asr = JSON.parse(fs.readFileSync(path.join(repo, `content/audio/bootcamp-001-v3/${lang}-source-asr.json`), 'utf8'));
if (qc.length !== 18 || qc.some(item => !item.technicalPass) || asr.status !== 'exact-transcript-match')
  throw new Error('Every new source beat must pass QC and exact transcript check');
const outputRoot = path.join(repo, config.output);
const releaseBase = `https://audio.talktag.co.kr/${config.root}/boot-camp/vocal-camp/001/short-001-v3/`;
const rate = 48000, frame = 480, ratios = [2, 2.5, 3, 3.5], silence = Buffer.alloc(rate * 2);
const samples = pcm => pcm.length / 2;
const seconds = count => Number((count / rate).toFixed(6));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function run(command, args) {
  const result = spawnSync(command, args, { encoding: null, maxBuffer: 96 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message || String(result.stderr).slice(-900)}`);
  return result.stdout;
}
function decode(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing QC master: ${file}`);
  return run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1']);
}
function activeRange(pcm) {
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, samples(pcm));
  let first = -1, last = -1;
  for (let offset = 0; offset < data.length; offset += frame) {
    const end = Math.min(data.length, offset + frame);
    let energy = 0;
    for (let i = offset; i < end; i++) energy += data[i] * data[i];
    if (Math.sqrt(energy / (end - offset)) / 32768 >= .001) {
      if (first < 0) first = offset;
      last = end;
    }
  }
  if (first < 0) throw new Error('QC master has no audible signal');
  return { first, last };
}
function writeSilence(fd, count) {
  if (count < 0) throw new Error('Negative pause');
  for (let left = count; left > 0;) {
    const n = Math.min(rate, left);
    fs.writeSync(fd, silence, 0, n * 2);
    left -= n;
  }
}
function encode(pcm, destination) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-short-001-'));
  try {
    const raw = path.join(scratch, 'audio.pcm');
    fs.writeFileSync(raw, pcm);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    run('ffmpeg', ['-y', '-v', 'error', '-nostdin', '-f', 's16le', '-ar', String(rate), '-ac', '1',
      '-i', raw, '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-q:a', '4', destination]);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function record(file, relative) {
  const sha256 = hash(file);
  return { audio: `${releaseBase}${relative}?v=${sha256.slice(0, 12)}`,
    bytes: fs.statSync(file).size, sha256 };
}

const cards = [];
for (const [level, ...texts] of rows) {
  if (texts.length !== 3) throw new Error(`${level}: expected exactly 3 new short beats`);
  const lines = texts.map((text, index) => {
    const item = qc.find(x => x.level === level && x.beat === index + 1);
    const spoken = asr.lines.find(x => x.level === level && x.unit === index + 1);
    if (!item?.qcFile || spoken?.expected !== text || !spoken.match) throw new Error(`${level}/${index + 1}: QC or spoken text mismatch`);
    const decoded = decode(item.qcFile);
    const active = activeRange(decoded);
    const first = Math.max(0, active.first - Math.round(rate * .08));
    const last = Math.min(samples(decoded), active.last + Math.round(rate * .12));
    const pcm = Buffer.from(decoded.subarray(first * 2, last * 2));
    const relative = `001/${level.toLowerCase()}/line-${String(index + 1).padStart(2, '0')}.mp3`;
    const output = path.join(outputRoot, relative);
    encode(pcm, output);
    return { text, pcm, samples: samples(pcm), voiceStart: active.first - first,
      voiceEnd: active.last - first, speechSeconds: seconds(active.last - active.first),
      sourceSha256: item.sourceSha256, ...record(output, relative) };
  });
  const steps = [];
  for (let k = 1; k <= 3; k++) {
    const variants = [];
    for (const ratio of ratios) {
      const chunks = [], cues = [];
      let cursor = 0;
      for (let i = 0; i < k; i++) {
        const line = lines[i], voiceStart = cursor + line.voiceStart, voiceEnd = cursor + line.voiceEnd;
        chunks.push(line.pcm);
        cursor += line.samples;
        const nextLead = i + 1 < k ? lines[i + 1].voiceStart : 0;
        const target = i + 1 < k
          ? Math.max(Math.round(.35 * rate), line.samples - line.voiceEnd + nextLead)
          : Math.max(3 * rate, Math.round((voiceEnd - lines[0].voiceStart) * ratio));
        const gap = target - (line.samples - line.voiceEnd) - nextLead;
        if (gap < 0) throw new Error(`${level}/${k}/${ratio}: negative gap`);
        chunks.push(Buffer.alloc(gap * 2));
        cursor += gap;
        cues.push({ i, s: seconds(voiceStart), voiceEnd: seconds(voiceEnd), e: seconds(cursor) });
      }
      const relative = `001/${level.toLowerCase()}/pause-${ratio.toFixed(1).replace('.', '_')}/step-${String(k).padStart(2, '0')}.mp3`;
      const output = path.join(outputRoot, relative);
      encode(Buffer.concat(chunks), output);
      const durationSeconds = seconds(samples(decode(output)));
      if (Math.abs(durationSeconds - seconds(cursor)) > .05) throw new Error(`${level}/${k}/${ratio}: decode duration mismatch`);
      variants.push({ ratio, durationSeconds, cues, ...record(output, relative) });
    }
    steps.push({ step: k, variants });
  }
  cards.push({ id: lang === 'ja' ? `japanese-vocalcamp-001-${level}` : `family-001-${level}`,
    episode: '001', level, title: config.title,
    lines: lines.map(({ pcm, samples: ignored, voiceStart, voiceEnd, ...data }) => data), steps });
  console.log(`${level}: 3 new lines and 12 cumulative variants`);
}
const manifest = { version: 3, language: lang, releaseBase, ratios, minimumPauseSeconds: 3, cards };
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(outputRoot, 'manifest.js'), `window.${config.global} = ${JSON.stringify(manifest)};\n`);
console.log(`Built ${config.heading} short source media.`);
