#!/usr/bin/env node
// Make the 002–010 learner catalog only after approved media and artwork exist.
// This script prepares a local site change; it does not deploy the site.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  root, defaultWork, expectedIds, loadBatch, assertApprovedScripts, assertAuthoringProvenance, option,
} from './mini-talks-batch-lib.mjs';

const work = option('--work', defaultWork);
const publishedAt = option('--published-at', undefined);
if (!publishedAt || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(publishedAt) ||
    Number.isNaN(Date.parse(publishedAt))) {
  throw Error('Provide the actual publication time with --published-at ISO-8601');
}

const {documents, cards} = loadBatch();
assertApprovedScripts(documents);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const assembly = readJson(path.join(work, 'assembled/assembly-evidence.json'));
const qc = readJson(path.join(work, 'qc-report.json'));
const verified = readJson(path.join(work, 'release/verified-inventory.json'));
if (assembly.schema !== 'mini-talks-single-pass-batch-evidence-v1' ||
    qc.schema !== 'mini-talks-batch-qc-v1' || qc.status !== 'technical-pass' ||
    verified.schema !== 'mini-talks-batch-verified-inventory-v1' ||
    verified.status !== 'public-verified') {
  throw Error('Complete assembly, technical QC, and public R2 verification are required');
}
assertAuthoringProvenance(assembly);
for (const [label, entries] of [
  ['assembly', assembly.cards], ['QC', qc.cards], ['public inventory', verified.entries],
]) {
  if (!Array.isArray(entries) || entries.length !== 18 ||
      new Set(entries.map(item => item.id)).size !== 18 ||
      entries.some(item => !expectedIds.has(item.id))) {
    throw Error(`${label}: expected all 18 A1/A2 002–010 cards exactly once`);
  }
}
const byAssembly = new Map(assembly.cards.map(item => [item.id, item]));
const byQc = new Map(qc.cards.map(item => [item.id, item]));
const byMedia = new Map(verified.entries.map(item => [item.id, item]));
const artworkHashes = new Set(
  ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map(level =>
    createHash('sha256').update(fs.readFileSync(
      path.join(root, `assets/mini-talks/en/001/${level}-scene.jpg`))).digest('hex')),
);
const records = [];
const lessons = [];

for (const card of cards) {
  const proof = byAssembly.get(card.id);
  const quality = byQc.get(card.id);
  const media = byMedia.get(card.id);
  const unit = card.id.slice(-3);
  const level = card.level.toLowerCase();
  const artwork = `assets/mini-talks/en/${unit}/${level}-scene.jpg`;
  const artPath = path.join(root, artwork);
  if (!fs.existsSync(artPath) || fs.statSync(artPath).size < 20_000) {
    throw Error(`${card.id}: missing full-size scene illustration at ${artwork}`);
  }
  const artBytes = fs.readFileSync(artPath);
  if (artBytes[0] !== 0xff || artBytes[1] !== 0xd8 || artBytes.at(-2) !== 0xff || artBytes.at(-1) !== 0xd9) {
    throw Error(`${card.id}: scene art must be a complete JPEG`);
  }
  const artHash = createHash('sha256').update(artBytes).digest('hex');
  if (artworkHashes.has(artHash)) throw Error(`${card.id}: illustration repeats another new card`);
  artworkHashes.add(artHash);
  if (!card.artworkBrief?.trim() || !proof || !quality || !media) {
    throw Error(`${card.id}: scene art brief or media evidence missing`);
  }
  if (proof.lineCount !== card.lines.length || proof.intro?.length !== card.lines.length ||
      proof.sourceChecks?.length !== card.lines.length || 'cycles' in proof || 'outro' in proof ||
      !Number.isFinite(proof.startCueEnd) || !Number.isFinite(proof.endingCueStart) ||
      proof.intro.at(-1).end >= proof.endingCueStart) {
    throw Error(`${card.id}: one-pass turn/cue evidence is incomplete`);
  }
  const voiceCasting = new Map((proof.voiceCasting || []).map(item => [item.speakerId, item]));
  if (voiceCasting.size !== card.speakers.length ||
      new Set([...voiceCasting.values()].map(item => item.voiceId)).size !== card.speakers.length ||
      card.speakers.some(speaker => !voiceCasting.get(speaker.id)?.voiceId ||
        !voiceCasting.get(speaker.id)?.voiceName)) {
    throw Error(`${card.id}: two distinct documented character voices are required`);
  }
  if (quality.status !== 'technical-pass' || quality.lineCount !== card.lines.length ||
      quality.integratedLufs < -17 || quality.integratedLufs > -15 ||
      quality.truePeakDbtp > -1 || quality.sha256 !== media.sha256 ||
      quality.bytes !== media.bytes ||
      Math.abs(quality.durationSeconds - media.durationSeconds) > 0.12 ||
      !Number.isFinite(quality.cueToMedianSpeechRmsDb) ||
      quality.cueToMedianSpeechRmsDb !== media.cueToMedianSpeechRmsDb ||
      quality.cueToMedianSpeechRmsDb > 10 ||
      !['original', 'processed'].includes(quality.audioQcStudioDecision) ||
      quality.audioQcStudioDecision !== media.audioQcStudioDecision) {
    throw Error(`${card.id}: final media does not match passed technical QC`);
  }
  if (media.sourceTranscriptVerified !== true ||
      media.verification?.r2Sha256Verified !== true ||
      media.verification?.publicSha256Verified !== true ||
      !Number.isFinite(Date.parse(media.verification?.verifiedAt)) ||
      !/^([a-f0-9]{64})$/.test(media.sha256) ||
      !/^https:\/\/audio\.talktag\.co\.kr\/English\/mini-talks\/(00[2-9]|010)\/mt-en-a[12]-(00[2-9]|010)-[a-f0-9]{12}\.mp3\?v=[a-f0-9]{12}$/.test(media.url) ||
      !media.url.includes(`/${unit}/${card.id}-${media.sha256.slice(0, 12)}.mp3?v=${media.sha256.slice(0, 12)}`)) {
    throw Error(`${card.id}: public checksum/key verification is incomplete`);
  }
  if (Date.parse(publishedAt) < Date.parse(media.verification.verifiedAt)) {
    throw Error(`${card.id}: publication time cannot predate public media verification`);
  }
  for (let index = 0; index < card.lines.length; index++) {
    const line = card.lines[index];
    const check = proof.sourceChecks[index];
    const cue = proof.intro[index];
    if (check.lineId !== line.id || check.speakerId !== line.speaker ||
        check.voiceId !== voiceCasting.get(line.speaker)?.voiceId ||
        check.voiceName !== voiceCasting.get(line.speaker)?.voiceName ||
        cue.lineIndex !== index || !(cue.start < cue.end) ||
        (index > 0 && cue.start <= proof.intro[index - 1].end)) {
      throw Error(`${card.id} ${line.id}: spoken line order or cue mismatch`);
    }
  }
  const speakerNames = new Map(card.speakers.map(speaker => [speaker.id,
    speaker.id[0].toUpperCase() + speaker.id.slice(1)]));
  const seconds = Math.floor(media.durationSeconds);
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  lessons.push({
    id: card.id, type: 'plain', format: 'mini-talks', level: card.level, unit,
    releaseGroup: '002-010',
    title: card.title, description: card.descriptionKo, summary: card.situationKo,
    scene: card.situation, briefing: card.situationKo, genre: 'Everyday dialogue',
    expressions: card.lines.map(line => line.en),
    meanings: card.lines.map(line => line.ko),
    speakers: card.lines.map(line => speakerNames.get(line.speaker)),
    speakerRoles: card.speakers.map(speaker => ({...speaker,
      voiceId: voiceCasting.get(speaker.id).voiceId,
      voiceName: voiceCasting.get(speaker.id).voiceName})),
    variationPrompt: {en: card.variationPrompt.en, ko: card.variationPrompt.ko},
    artwork, artworkAlt: card.situationKo,
    audio: media.url, durationLabel: duration, durationLong: duration,
    publishedAt, available: true,
    training: {
      kind: 'mini-talks', playthroughs: 1, cardDings: true,
      startCueEnd: proof.startCueEnd, endingCueStart: proof.endingCueStart,
      intro: proof.intro,
      cues: proof.intro.map(cue => ({i: cue.lineIndex, s: cue.start, voiceEnd: cue.end, e: cue.end})),
      durationSeconds: media.durationSeconds,
    },
  });
  records.push({
    id: card.id, level: card.level, unit, url: media.url,
    sha256: media.sha256, bytes: media.bytes,
    artwork, artworkSha256: artHash,
    durationSeconds: media.durationSeconds,
    integratedLufs: media.integratedLufs, truePeakDbtp: media.truePeakDbtp,
    cueToMedianSpeechRmsDb: media.cueToMedianSpeechRmsDb,
    qcWarnings: quality.warnings || [],
    lineCount: card.lines.length, playthroughCount: 1, forcedRepetitions: 0,
    sourceTranscriptVerified: true,
    voiceCasting: [...voiceCasting.values()],
    audioQcStudioDecision: media.audioQcStudioDecision,
    humanListening: qc.humanListening === true,
    publicSha256VerifiedAt: media.verification.verifiedAt,
  });
}

const output = '/* English Mini Talks A1/A2 002–010 · QC-approved, public-hash-verified dialogue audio. */\n' +
  'window.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(' +
  JSON.stringify(lessons).replace(/</g, '\\u003c') + ');\n';
const releaseRecord = {
  schema: 'mini-talks-batch-release-record-v1', language: 'en', series: '002–010',
  publishedAt, qcTarget: {integratedLufs: -16, truePeakCeilingDbtp: -1},
  sourceSpeechReview: `Exact word-level transcription matched ${cards.reduce((count, card) => count + card.lines.length, 0)} source turns; human listening ${qc.humanListening === true ? 'recorded' : 'not performed'}`,
  cards: records,
};
fs.writeFileSync(path.join(root, 'mini-talks-002-010.js'), output);
fs.writeFileSync(path.join(root, 'content/mini-talks/english-a1-a2-002-010.release.json'),
  JSON.stringify(releaseRecord, null, 2) + '\n');
console.log(`Prepared ${lessons.length} local Mini Talks cards and release record; deployment remains separate`);
