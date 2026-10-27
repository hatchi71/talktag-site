import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const work = process.argv[2] || '/private/tmp/talktag-mini-talks-001-single-pass';
const approved = path.join(work, 'qc-approved');
const release = path.join(work, 'release');
const reports = '/Users/eungjukim/Desktop/TalkTag Audio QC Studio/02_WORKING/reports';
fs.mkdirSync(release, { recursive: true });
const inventory = [];
for (const level of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']) {
  const id = `mt-en-${level}-001`;
  const report = JSON.parse(fs.readFileSync(path.join(reports, `${id}-single-mastered.qc.json`)));
  if (report.decision !== 'original' || report.input.assessment.grade !== 'pass') throw new Error(`${id}: not approved`);
  const metrics = report.input.metrics;
  if (Math.abs(metrics.inputLufs + 16) > 1 || metrics.inputTruePeak > -1) throw new Error(`${id}: loudness failed`);
  const source = path.join(approved, `${id}-single-mastered.mp3`);
  const bytes = fs.readFileSync(source);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== report.input.sha256) throw new Error(`${id}: source checksum mismatch`);
  const filename = `${id}-${sha256.slice(0, 12)}.mp3`;
  const destination = path.join(release, filename);
  fs.copyFileSync(source, destination);
  const key = `English/mini-talks/001/${filename}`;
  inventory.push({ id, level: level.toUpperCase(), source: destination, key,
    url: `https://audio.talktag.co.kr/${key}`, bytes: bytes.length, sha256,
    duration: metrics.duration, lufs: metrics.inputLufs, truePeakDbtp: metrics.inputTruePeak });
}
fs.writeFileSync(path.join(release, 'inventory.json'), JSON.stringify({ schema: 'mini-talks-single-pass-release-v2', entries: inventory }, null, 2) + '\n');
for (const item of inventory) console.log(`${item.id}\t${item.bytes}\t${item.sha256.slice(0, 12)}\t${item.duration.toFixed(2)}s`);
