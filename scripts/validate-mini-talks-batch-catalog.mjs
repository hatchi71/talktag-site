#!/usr/bin/env node
// Validate the generated A1/A2 002–010 catalog before site wiring/deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import {
  root, defaultWork, expectedIds, loadBatch, assertApprovedScripts,
  assertAuthoringProvenance, option,
} from './mini-talks-batch-lib.mjs';

const work = option('--work', defaultWork);
const {documents, cards} = loadBatch();
assertApprovedScripts(documents);
const assembly = JSON.parse(fs.readFileSync(
  path.join(work, 'assembled/assembly-evidence.json'), 'utf8'));
if (assembly.schema !== 'mini-talks-single-pass-batch-evidence-v1') {
  throw Error('Valid assembly evidence is required before catalog validation');
}
assertAuthoringProvenance(assembly);
const source = fs.readFileSync(path.join(root, 'mini-talks-002-010.js'), 'utf8');
const release = JSON.parse(fs.readFileSync(
  path.join(root, 'content/mini-talks/english-a1-a2-002-010.release.json'), 'utf8'));
const context = {window: {}};
vm.createContext(context);
vm.runInContext(source, context);
const lessons = context.window.TalkTagAudioLessons;
assert.equal(release.schema, 'mini-talks-batch-release-record-v1');
assert.equal(release.cards?.length, 18);
assert.equal(lessons?.length, 18);
assert.deepEqual(new Set(Array.from(lessons, lesson => lesson.id)), expectedIds);
assert.equal(new Set(lessons.map(lesson => lesson.title.toLocaleLowerCase())).size, 18);
assert.equal(new Set(lessons.map(lesson => lesson.artwork)).size, 18);
assert.equal(new Set(lessons.map(lesson => lesson.audio)).size, 18);
const byCard = new Map(cards.map(card => [card.id, card]));
const byRelease = new Map(release.cards.map(card => [card.id, card]));
assert.equal(byRelease.size, 18);
for (const lesson of lessons) {
  const card = byCard.get(lesson.id);
  const record = byRelease.get(lesson.id);
  assert.ok(card && record, `${lesson.id}: authoring/release missing`);
  assert.equal(lesson.level, card.level);
  assert.equal(lesson.type, 'plain');
  assert.equal(lesson.format, 'mini-talks');
  assert.equal(lesson.unit, lesson.id.slice(-3));
  assert.equal(lesson.training?.kind, 'mini-talks');
  assert.equal(lesson.training?.playthroughs, 1);
  assert.equal(lesson.training?.defaultReps, undefined);
  assert.equal(lesson.training?.cycles, undefined);
  assert.equal(lesson.training?.outro, undefined);
  assert.equal(lesson.training?.intro?.length, card.lines.length);
  assert.equal(lesson.training?.cues?.length, card.lines.length);
  assert.equal(lesson.expressions?.length, card.lines.length);
  assert.equal(lesson.meanings?.length, card.lines.length);
  assert.equal(lesson.speakers?.length, card.lines.length);
  assert.equal(lesson.speakerRoles?.length, card.speakers.length);
  assert.equal(record.voiceCasting?.length, card.speakers.length);
  assert.equal(new Set(record.voiceCasting.map(item => item.voiceId)).size, card.speakers.length);
  for (const role of lesson.speakerRoles) {
    const casting = record.voiceCasting.find(item => item.speakerId === role.id);
    assert.equal(role.voiceId, casting?.voiceId);
    assert.equal(role.voiceName, casting?.voiceName);
  }
  assert.deepEqual(Array.from(lesson.expressions), card.lines.map(line => line.en));
  assert.deepEqual(Array.from(lesson.meanings), card.lines.map(line => line.ko));
  assert.ok(lesson.training.startCueEnd < lesson.training.intro[0].start);
  assert.ok(lesson.training.intro.at(-1).end < lesson.training.endingCueStart);
  assert.ok(lesson.training.endingCueStart < lesson.training.durationSeconds);
  for (let index = 0; index < card.lines.length; index++) {
    const cue = lesson.training.intro[index];
    assert.equal(cue.lineIndex, index);
    assert.equal(lesson.training.cues[index].i, index);
    assert.ok(cue.start < cue.end);
    if (index > 0) assert.ok(lesson.training.intro[index - 1].end < cue.start);
  }
  assert.match(lesson.audio,
    /^https:\/\/audio\.talktag\.co\.kr\/English\/mini-talks\/(00[2-9]|010)\/mt-en-a[12]-(00[2-9]|010)-[a-f0-9]{12}\.mp3\?v=[a-f0-9]{12}$/);
  assert.equal(lesson.audio, record.url);
  assert.equal(lesson.training.durationSeconds, record.durationSeconds);
  assert.equal(record.lineCount, card.lines.length);
  assert.equal(record.playthroughCount, 1);
  assert.equal(record.forcedRepetitions, 0);
  assert.equal(record.sourceTranscriptVerified, true);
  assert.ok(record.integratedLufs >= -17 && record.integratedLufs <= -15);
  assert.ok(record.truePeakDbtp <= -1);
  assert.ok(Number.isFinite(record.cueToMedianSpeechRmsDb) &&
    record.cueToMedianSpeechRmsDb <= 10);
  assert.match(record.sha256, /^[a-f0-9]{64}$/);
  assert.equal(lesson.publishedAt, release.publishedAt);
  assert.equal(record.artwork, lesson.artwork);
  const artPath = path.join(root, lesson.artwork);
  assert.ok(fs.existsSync(artPath), `${lesson.id}: scene illustration missing`);
  assert.equal(createHash('sha256').update(fs.readFileSync(artPath)).digest('hex'),
    record.artworkSha256, `${lesson.id}: scene illustration changed`);
}
const legacy = fs.readFileSync(path.join(root, 'mini-talks-001.js'), 'utf8');
const both = {window: {}};
vm.createContext(both);
vm.runInContext(legacy, both);
vm.runInContext(source, both);
assert.equal(both.window.TalkTagAudioLessons.length, 24);
assert.equal(new Set(both.window.TalkTagAudioLessons.map(lesson => lesson.id)).size, 24);
console.log('Mini Talks A1/A2 002–010 catalog: 18 cards, cue/script/audio/artwork identities, and 001 coexistence PASS');
