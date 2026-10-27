import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const work = process.argv[2] || '/private/tmp/talktag-mini-talks-001';
const authoring = JSON.parse(fs.readFileSync(path.join(root, 'content/mini-talks/english-001.authoring.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(work, 'assembled/assembly-evidence.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(work, 'release/inventory.json'), 'utf8'));
const byEvidence = new Map(evidence.cards.map(card => [card.id, card]));
const byRelease = new Map(inventory.entries.map(entry => [entry.id, entry]));
if (authoring.cards.length !== 6 || byEvidence.size !== 6 || byRelease.size !== 6) throw Error('Mini Talks 001 must have six QC-approved levels');

const lessons = authoring.cards.map(card => {
  const proof = byEvidence.get(card.id), release = byRelease.get(card.id);
  if (!proof || !release || card.lines.length !== proof.lineCount) throw Error(`Missing evidence: ${card.id}`);
  if (release.lufs < -17 || release.lufs > -15 || release.truePeakDbtp > -1) throw Error(`QC limits: ${card.id}`);
  if (proof.cycles.length !== card.lines.length * 3) throw Error(`Repetition count: ${card.id}`);
  const clock = Math.floor(release.duration);
  const duration = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
  return {
    id: card.id, type: 'plain', format: 'mini-talks', level: card.level, unit: '001',
    title: card.title, description: card.descriptionKo, summary: card.situationKo,
    scene: card.situation, briefing: card.situationKo, genre: 'Everyday dialogue',
    expressions: card.lines.map(line => line.en),
    meanings: card.lines.map(line => line.ko),
    speakers: card.lines.map(line => line.speaker[0].toUpperCase() + line.speaker.slice(1)),
    speakerRoles: card.speakers, variationPrompt: { en: card.variationPrompt.en, ko: card.variationPrompt.ko },
    audio: release.url, durationLabel: duration, durationLong: duration,
    publishedAt: '2026-10-27T00:00:00+09:00', available: true,
    training: {
      kind: 'mini-talks', defaultReps: 3, silenceMultiplier: 2.5, minimumGapSeconds: 3,
      cardDings: true, startCueEnd: proof.startCueEnd, endingCueStart: proof.endingCueStart,
      intro: proof.intro, outro: proof.outro, variationPromptAt: proof.variationPromptAt,
      cues: proof.cycles.map(cue => ({ i: cue.lineIndex, r: cue.repetition, s: cue.start, voiceEnd: cue.voiceEnd, e: cue.end })),
      durationSeconds: release.duration
    }
  };
});
const output = '/* Original Mini Talks 001 · QC-approved dialogue audio. */\nwindow.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(' + JSON.stringify(lessons) + ');\n';
fs.writeFileSync(path.join(root, 'mini-talks-001.js'), output);
const releaseRecord = {
  schema: 'mini-talks-release-record-v1', series: '001', language: 'en',
  qcTarget: { integratedLufs: -16, truePeakCeilingDbtp: -1 },
  sourceSpeechReview: '37/37 source turns matched word-level transcription; human listening not performed',
  cards: lessons.map((lesson, index) => ({
    id: lesson.id, level: lesson.level, url: lesson.audio,
    sha256: inventory.entries[index].sha256, bytes: inventory.entries[index].bytes,
    durationSeconds: inventory.entries[index].duration,
    integratedLufs: inventory.entries[index].lufs,
    truePeakDbtp: inventory.entries[index].truePeakDbtp,
    lineCount: lesson.expressions.length, repeatCount: lesson.training.defaultReps,
    responseGapMultiplier: lesson.training.silenceMultiplier,
    sourceTranscriptVerified: true, audioQcStudioDecision: 'processed'
  }))
};
fs.writeFileSync(path.join(root, 'content/mini-talks/english-001.release.json'), JSON.stringify(releaseRecord, null, 2) + '\n');
console.log(`Wrote ${lessons.length} Mini Talks cards`);
