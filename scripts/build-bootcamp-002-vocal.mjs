#!/usr/bin/env node
// Build independent English Vocal Camp 002 cumulative speech/pause variants.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(repo, 'content/bootcamp-002-source.json'), 'utf8'));
const base = process.env.TALKTAG_BOOTCAMP_002_WORKDIR || '/private/tmp/talktag-english-bootcamp-002-audio';
const qc = JSON.parse(fs.readFileSync(path.join(base, 'source-qc.json'), 'utf8'));
const output = path.join(base, 'rendered');
const publicBase = 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/002/short-002-v1/';
const sampleRate = 48000, frame = 480, ratios = [2, 2.5, 3, 3.5];
const sec = count => Number((count / sampleRate).toFixed(6));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: null, maxBuffer: 96 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${cmd}: ${result.error?.message || String(result.stderr).slice(-900)}`);
  return result.stdout;
};
const decode = file => run('ffmpeg', ['-v','error','-nostdin','-i',file,'-ar',String(sampleRate),'-ac','1','-f','s16le','pipe:1']);
function activeRange(pcm) {
  const data = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
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
  if (first < 0) throw new Error('QC source has no audible signal');
  return { first, last };
}
function encode(pcm, destination) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-vocal-002-'));
  try {
    const raw = path.join(scratch, 'audio.pcm');
    fs.writeFileSync(raw, pcm);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    run('ffmpeg', ['-y','-v','error','-nostdin','-f','s16le','-ar',String(sampleRate),'-ac','1',
      '-i',raw,'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',destination]);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
const upload = [], cards = [];
for (const [level, data] of Object.entries(source.vocal)) {
  const expected = level.startsWith('C') ? 5 : 3;
  if (data.lines.length !== expected || data.translation.length !== expected) throw new Error(`${level}: stage count`);
  const lines = data.lines.map((text, index) => {
    const item = qc.find(x => x.level === level && x.unit === index + 1);
    if (!item?.technicalPass || item.expected !== text || !item.qcFile || hash(item.qcFile) !== item.qcSha256)
      throw new Error(`${level}/${index + 1}: missing exact QC-approved beat`);
    const decoded = decode(item.qcFile), active = activeRange(decoded);
    const first = Math.max(0, active.first - Math.round(sampleRate * .08));
    const last = Math.min(decoded.length / 2, active.last + Math.round(sampleRate * .12));
    return { text, pcm: Buffer.from(decoded.subarray(first * 2, last * 2)),
      samples: last - first, voiceStart: active.first - first, voiceEnd: active.last - first,
      speechSeconds: sec(active.last - active.first), sourceSha256: item.rawSha256, qcSha256: item.qcSha256 };
  });
  const steps = [];
  for (let k = 1; k <= expected; k++) {
    const variants = [];
    for (const ratio of ratios) {
      const chunks = [], cues = [];
      let cursor = 0;
      for (let i = 0; i < k; i++) {
        const line = lines[i], voiceStart = cursor + line.voiceStart, voiceEnd = cursor + line.voiceEnd;
        chunks.push(line.pcm); cursor += line.samples;
        const nextLead = i + 1 < k ? lines[i + 1].voiceStart : 0;
        const target = i + 1 < k
          ? Math.max(Math.round(.35 * sampleRate), line.samples - line.voiceEnd + nextLead)
          : Math.max(3 * sampleRate, Math.round((voiceEnd - lines[0].voiceStart) * ratio));
        const gap = target - (line.samples - line.voiceEnd) - nextLead;
        if (gap < 0) throw new Error(`${level}/${k}/${ratio}: negative speaking gap`);
        chunks.push(Buffer.alloc(gap * 2)); cursor += gap;
        cues.push({ i, s: sec(voiceStart), voiceEnd: sec(voiceEnd), e: sec(cursor) });
      }
      const relative = `${level.toLowerCase()}/pause-${ratio.toFixed(1).replace('.', '_')}/step-${String(k).padStart(2, '0')}.mp3`;
      const file = path.join(output, relative);
      encode(Buffer.concat(chunks), file);
      const durationSeconds = sec(decode(file).length / 2), sha256 = hash(file);
      if (Math.abs(durationSeconds - sec(cursor)) > .05) throw new Error(`${level}/${k}/${ratio}: decoded duration mismatch`);
      const audio = `${publicBase}${relative}?v=${sha256.slice(0, 12)}`;
      variants.push({ ratio, durationSeconds, cues, audio, bytes: fs.statSync(file).size, sha256 });
      upload.push({ file, key: `English/boot-camp/vocal-camp/002/short-002-v1/${relative}`, audio, bytes: fs.statSync(file).size, sha256 });
    }
    steps.push({ step: k, variants });
  }
  cards.push({ id: `family-002-${level}`, episode: '002', level, title: source.title,
    lines: lines.map(({ pcm, samples, voiceStart, voiceEnd, ...line }) => line), steps });
  console.log(`${level}: ${expected} original beats, ${expected * ratios.length} independently decoded cumulative variants`);
}
const manifest = { version: 1, language: 'en', releaseBase: publicBase, ratios,
  minimumPauseSeconds: 3, voice: { name: 'Roger', accent: 'US', model: 'eleven_multilingual_v2' }, cards };
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'upload-inventory.json'), JSON.stringify(upload, null, 2) + '\n');
const script = `window.TalkTagVocal002ShortVariants = ${JSON.stringify(manifest)};\n`;
const repoManifest = path.join(repo, 'audio/vocalcamp/short-002-v1/manifest.js');
fs.mkdirSync(path.dirname(repoManifest), { recursive: true });
fs.writeFileSync(repoManifest, script);
console.log(`Built ${upload.length} versioned R2 objects; manifest is ${repoManifest}`);
