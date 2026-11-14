#!/usr/bin/env node
// Convert the separate private audio assembly and decoded-QC records into the
// payload builder's input. It never uploads or publishes audio.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalCardId } from './build-ppp001-payloads.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const key = item => [item.id, item.language, item.level, item.track,
  item.partIndex || 1, item.stage || 0, item.ratio || 0].join('|');

export function bridgeReleaseMedia(assembly, qc, qcHash) {
  if (assembly.schemaVersion !== 1 || String(assembly.episode).padStart(3, '0') !== '001'
    || !Array.isArray(assembly.audio) || !assembly.audio.length
    || assembly.status === 'synthetic-dry-run')
    fail('Expected real PPP001 audio assembly, not a dry run');
  if (qc.schemaVersion !== 1 || !Array.isArray(qc.records)
    || qc.records.length !== assembly.audio.length || qc.counts?.fail
    || qc.records.some(item => item.status !== 'pass'))
    fail('Every assembled audio item needs a passing decoded QC record');
  const qcByKey = new Map();
  for (const record of qc.records) {
    const k = key(record);
    if (qcByKey.has(k)) fail(`Duplicate decoded QC record ${k}`);
    qcByKey.set(k, record);
  }
  const records = [], seen = new Set();
  for (const item of assembly.audio) {
    const k = key(item), checked = qcByKey.get(k);
    if (!checked || seen.has(k)) fail(`Missing or duplicated decoded QC for ${k}`);
    seen.add(k);
    if (checked.durationSeconds !== item.durationSeconds)
      fail(`${k}: decoded QC duration differs from assembly`);
    const area = { glr: 'guided', 'mini-talks': 'miniTalks', 'vocal-camp': 'vocalCamp' }[item.track];
    if (!area || !['en', 'ko'].includes(item.language)
      || !['A0','A1','A2','B1','B2','C1','C2'].includes(item.level)
      || item.id !== `ppp001-${item.language}-${item.level.toLowerCase()}-${item.track}`)
      fail(`${k}: invalid audio track identity`);
    if (!existsSync(item.audioPath) || statSync(item.audioPath).size !== item.bytes
      || hash(readFileSync(item.audioPath)) !== item.sha256)
      fail(`${k}: assembled MP3 checksum or bytes changed`);
    const lines = item.lines;
    if (!Array.isArray(lines) || !lines.length || lines.some(line => !line.id || !line.text || !line.meaning))
      fail(`${k}: audio has incomplete frozen source lines`);
    const perFileHash = hash(lines.map(line => line.text.normalize('NFC').trim()).join('\n'));
    const cardId = finalCardId(item.language, item.level, area);
    const partIndex = Number(item.partIndex || 1), partCount = Number(item.partCount || 1);
    if (partIndex < 1 || partCount < partIndex) fail(`${k}: invalid part identity`);
    records.push({ id: cardId, language: item.language, level: item.level,
      track: item.track, partIndex, partCount,
      ...(item.track === 'glr' ? { sourceIndices: lines.map((_, i) => Number(item.sentenceOffset || 0) + i) } : {}),
      ...(item.track === 'vocal-camp' ? { stage: item.stage, ratio: item.ratio } : {}),
      audioPath: item.audioPath, sha256: item.sha256, bytes: item.bytes,
      durationSeconds: item.durationSeconds, sourceHash: perFileHash,
      training: item.training,
      ...(item.track === 'mini-talks' ? { timings: item.training?.turns?.map((turn, i) => ({
        s: turn.s, voiceEnd: turn.voiceEnd, e: turn.e, i })) } : {}),
      technicalQcPass: true, qcRecord: `decoded-audio-qc:${qcHash}#${k}` });
  }
  return { episode: '001', status: assembly.status, qcSha256: qcHash,
    cards: records };
}

function main(argv) {
  let assemblyPath, qcPath, outputPath;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--assembly') assemblyPath = resolve(argv[++i] || fail('--assembly needs a file'));
    else if (argv[i] === '--qc') qcPath = resolve(argv[++i] || fail('--qc needs a file'));
    else if (argv[i] === '--out') outputPath = resolve(argv[++i] || fail('--out needs a file'));
    else fail(`Unknown argument ${argv[i]}`);
  }
  if (!assemblyPath || !qcPath || !outputPath || outputPath === repository
    || outputPath.startsWith(`${repository}/`))
    fail('Use --assembly, --qc and a private --out outside the site repository');
  const qcBytes = readFileSync(qcPath);
  const output = bridgeReleaseMedia(JSON.parse(readFileSync(assemblyPath, 'utf8')),
    JSON.parse(qcBytes.toString('utf8')), hash(qcBytes));
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Bridged ${output.cards.length} checksum-verified audio files; status ${output.status}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`PPP001 audio bridge failed: ${error.message}`); process.exitCode = 1; }
}
