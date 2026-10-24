#!/usr/bin/env node
// Run each English Vocal Camp 002 beat through TalkTag Audio QC Studio.
// A technical pass does not assert that a human listened to pronunciation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { processFile, decideFile, DEFAULT_PATHS } from '/Users/eungjukim/Desktop/TalkTag Audio QC Studio/lib/qc-engine.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'content/bootcamp-002-source.json'), 'utf8'));
const base = process.env.TALKTAG_BOOTCAMP_002_WORKDIR || '/private/tmp/talktag-english-bootcamp-002-audio';
const inputDir = path.join(base, 'raw');
const outputDir = path.join(base, 'qc');
DEFAULT_PATHS.workingDir = path.join(base, 'studio-working');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = [];

for (const [level, data] of Object.entries(source.vocal)) {
  for (let unit = 1; unit <= data.lines.length; unit++) {
    const name = `${level.toLowerCase()}-unit-${String(unit).padStart(2, '0')}.mp3`;
    const raw = path.join(inputDir, name);
    if (!fs.existsSync(raw)) throw new Error(`Missing generated source ${raw}`);
    let gain = 0, result;
    for (let attempt = 0; attempt < 4; attempt++) {
      result = await processFile({ inputDir, outputDir, name, normalizeDualMono: false,
        measureAfterHighpass: true, outputGainDb: gain });
      const m = result.output.metrics;
      if (Math.abs(m.inputLufs + 16) <= 1.2 && m.inputTruePeak <= -1) break;
      gain += Math.max(-6, Math.min(8, (-16 - m.inputLufs) * 1.4));
    }
    const m = result.output.metrics;
    const pass = result.output.assessment.grade === 'pass' && Math.abs(m.inputLufs + 16) <= 1.2
      && m.inputTruePeak <= -1 && m.channels === 1 && m.sampleRate === 48000 && m.duration > 0.5;
    const approved = pass ? await decideFile({ assetId: path.basename(name, '.mp3'), decision: 'processed',
      note: 'Boot Camp 002 technical source QC passed; human listening is separate.', outputDir }) : null;
    report.push({ level, unit, expected: data.lines[unit - 1], raw, rawSha256: hash(raw),
      qcFile: approved?.destination ?? null, qcSha256: approved?.destination ? hash(approved.destination) : null,
      metrics: m, gainDb: Number(gain.toFixed(3)), technicalPass: pass, humanAuditioned: false });
    console.log(`${level} ${unit}: ${pass ? 'PASS' : 'FAIL'}; ${m.duration}s; ${m.inputLufs} LUFS; ${m.inputTruePeak} dBTP`);
  }
}
fs.writeFileSync(path.join(base, 'source-qc.json'), JSON.stringify(report, null, 2) + '\n');
if (report.some(item => !item.technicalPass)) process.exitCode = 1;
