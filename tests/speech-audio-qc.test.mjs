import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeSpeechFile, validateSpeechManifest } from '../scripts/validate-speech-audio-qc.mjs';

const ffmpegAvailable = spawnSync('ffmpeg', ['-version']).status === 0
  && spawnSync('ffprobe', ['-version']).status === 0;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sampleRate = 48000;

function wavFixture(folder, name, voicePeak, cuePeak) {
  const samples = sampleRate * 3, pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const cue = t >= .1 && t < .3 || t >= 2.4 && t < 2.6;
    const voice = t >= .6 && t < 1.6;
    const peak = cue ? cuePeak : voice ? voicePeak : 0;
    pcm.writeInt16LE(Math.round(peak * 32767 * Math.sin(2 * Math.PI * 440 * t)), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  const bytes = Buffer.concat([header, pcm]), file = join(folder, name);
  writeFileSync(file, bytes);
  return { id: name, file, sha256: sha(bytes), bytes: bytes.length,
    cuePolicy: 'start-end',
    voiceIntervals: [{ key: 'line-1', start: .6, end: 1.6 }],
    cueIntervals: [{ kind: 'start', start: .1, end: .3 },
      { kind: 'end', start: 2.4, end: 2.6 }] };
}

test('decoded speech gate catches quiet speech hidden by loud cues',
  { skip: !ffmpegAvailable }, () => {
    const folder = mkdtempSync(join(tmpdir(), 'talktag-speech-qc-'));
    const quiet = wavFixture(folder, 'quiet.wav', .01, .5);
    const measured = analyzeSpeechFile(quiet);
    assert.equal(measured.status, 'fail');
    assert(measured.problems.includes('speech-too-quiet'));
    assert(measured.problems.includes('cue-overpowers-speech'));
    assert(measured.wholeLufs > measured.speechLufs);
    const changed = { ...quiet, sha256: '0'.repeat(64) };
    assert.throws(() => analyzeSpeechFile(changed), /checksum or byte length changed/);
  });

test('balanced speech passes and the report binds to the source manifest',
  { skip: !ffmpegAvailable }, () => {
    const folder = mkdtempSync(join(tmpdir(), 'talktag-speech-qc-'));
    const balanced = wavFixture(folder, 'balanced.wav', .3, .08);
    const manifest = { schemaVersion: 1, media: [balanced] };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    const report = validateSpeechManifest(manifest, sha(manifestBytes));
    assert.deepEqual(report.counts, { pass: 1, fail: 0 });
    assert.equal(report.sourceManifestSha256, sha(manifestBytes));
    assert.equal(report.records[0].sha256, sha(readFileSync(balanced.file)));
    assert(report.records[0].speechLufs >= report.gates.minimumSpeechLufs);
    assert(report.records[0].cueAdvantageDb <= report.gates.maximumCueAdvantageDb);
  });
