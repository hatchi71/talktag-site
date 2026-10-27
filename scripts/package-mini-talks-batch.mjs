import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadBatch, assertApprovedScripts, assertAuthoringProvenance, defaultWork, option } from './mini-talks-batch-lib.mjs';

const work = option('--work', defaultWork);
const {documents, cards} = loadBatch();
assertApprovedScripts(documents);
const assembly = JSON.parse(fs.readFileSync(path.join(work, 'assembled/assembly-evidence.json'), 'utf8'));
if (assembly.schema !== 'mini-talks-single-pass-batch-evidence-v1') {
  throw Error('Valid assembly evidence is required before packaging');
}
assertAuthoringProvenance(assembly);
const summary = JSON.parse(fs.readFileSync(path.join(work, 'qc-report.json'), 'utf8'));
if (summary.status !== 'technical-pass' || summary.cards?.length !== 18) {
  throw Error('Complete 18-card technical QC report is required');
}
const byQc = new Map(summary.cards.map(card => [card.id, card]));
const release = path.join(work, 'release');
fs.mkdirSync(release, {recursive: true});
const entries = [];
for (const card of cards) {
  const qc = byQc.get(card.id);
  if (!qc || qc.status !== 'technical-pass' || qc.integratedLufs < -17 ||
      qc.integratedLufs > -15 || qc.truePeakDbtp > -1 ||
      !Number.isFinite(qc.cueToMedianSpeechRmsDb) || qc.cueToMedianSpeechRmsDb > 10 ||
      qc.lineCount !== card.lines.length) {
    throw Error(`${card.id}: QC approval or measurement failed`);
  }
  const source = path.join(work, 'qc-approved', `${card.id}-single-mastered.mp3`);
  const bytes = fs.readFileSync(source);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== qc.sha256 || bytes.length !== qc.bytes) throw Error(`${card.id}: final-file checksum mismatch`);
  const filename = `${card.id}-${sha256.slice(0, 12)}.mp3`;
  const destination = path.join(release, filename);
  fs.copyFileSync(source, destination);
  const key = `English/mini-talks/${card.id.slice(-3)}/${filename}`;
  entries.push({id: card.id, level: card.level, unit: card.id.slice(-3),
    source: destination, key, url: `https://audio.talktag.co.kr/${key}`,
    bytes: bytes.length, sha256, durationSeconds: qc.durationSeconds,
    integratedLufs: qc.integratedLufs, truePeakDbtp: qc.truePeakDbtp,
    cueToMedianSpeechRmsDb: qc.cueToMedianSpeechRmsDb, qcWarnings: qc.warnings,
    audioQcStudioDecision: qc.audioQcStudioDecision,
    sourceTranscriptVerified: true, humanListening: summary.humanListening === true});
  console.log(`${card.id}\t${bytes.length} bytes\t${sha256.slice(0, 12)}\t${qc.durationSeconds.toFixed(2)}s`);
}
if (byQc.size !== 18 || entries.length !== 18 || new Set(entries.map(entry => entry.key)).size !== 18) {
  throw Error('QC/release card inventory differs from 18 expected cards');
}
const inventory = {schema: 'mini-talks-batch-local-inventory-v1', status: 'local-qc-approved',
  scope: 'English A1/A2 002–010', entries};
fs.writeFileSync(path.join(release, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log(`Packaged ${entries.length} local QC-approved files; not uploaded or published`);
