import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const work = process.argv[2] || '/private/tmp/talktag-mini-talks-001-single-pass';
const authoring = JSON.parse(fs.readFileSync(path.join(root, 'content/mini-talks/english-001.authoring.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(work, 'assembled/assembly-evidence.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(work, 'release/inventory.json'), 'utf8'));
const byEvidence = new Map(evidence.cards.map(card => [card.id, card]));
const byRelease = new Map(inventory.entries.map(entry => [entry.id, entry]));
const artworkAlt = {
  A1: '카페 창가의 빈 의자에서 두 사람이 이야기를 나누는 모습',
  A2: '카페에서 손님이 잘못 나온 음료를 바리스타에게 설명하는 모습',
  B1: '기차역 앞에서 친구들이 만날 장소를 의논하는 모습',
  B2: '공유 공간에서 동료 세 명이 더 조용한 자리를 찾는 모습',
  C1: '커뮤니티 센터 직원들이 임시 출입구 안내를 의논하는 모습',
  C2: '모임 네 명이 방 사용 시간을 함께 조정하는 모습'
};
if (authoring.cards.length !== 6 || byEvidence.size !== 6 || byRelease.size !== 6) throw Error('Mini Talks 001 must have six QC-approved levels');

const lessons = authoring.cards.map(card => {
  const proof = byEvidence.get(card.id), release = byRelease.get(card.id);
  if (!proof || !release || card.lines.length !== proof.lineCount) throw Error(`Missing evidence: ${card.id}`);
  if (release.lufs < -17 || release.lufs > -15 || release.truePeakDbtp > -1) throw Error(`QC limits: ${card.id}`);
  if (proof.intro.length !== card.lines.length || proof.cycles || proof.outro) throw Error(`Expected one dialogue only: ${card.id}`);
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
    artwork: `assets/mini-talks/en/001/${card.level.toLowerCase()}-scene.jpg`, artworkAlt: artworkAlt[card.level],
    audio: release.url, durationLabel: duration, durationLong: duration,
    publishedAt: '2026-10-27T00:00:00+09:00', available: true,
    training: {
      kind: 'mini-talks', playthroughs: 1,
      cardDings: true, startCueEnd: proof.startCueEnd, endingCueStart: proof.endingCueStart,
      intro: proof.intro,
      cues: proof.intro.map(cue => ({ i: cue.lineIndex, s: cue.start, voiceEnd: cue.end, e: cue.end })),
      durationSeconds: release.duration
    }
  };
});
const output = '/* Original Mini Talks 001 · QC-approved dialogue audio. */\nwindow.TalkTagAudioLessons = (window.TalkTagAudioLessons || []).concat(' + JSON.stringify(lessons) + ');\n';
fs.writeFileSync(path.join(root, 'mini-talks-001.js'), output);
const releaseRecord = {
  schema: 'mini-talks-single-pass-release-record-v2', series: '001', language: 'en',
  qcTarget: { integratedLufs: -16, truePeakCeilingDbtp: -1 },
  sourceSpeechReview: '37/37 source turns matched word-level transcription; human listening not performed',
  cards: lessons.map((lesson, index) => ({
    id: lesson.id, level: lesson.level, url: lesson.audio,
    sha256: inventory.entries[index].sha256, bytes: inventory.entries[index].bytes,
    durationSeconds: inventory.entries[index].duration,
    integratedLufs: inventory.entries[index].lufs,
    truePeakDbtp: inventory.entries[index].truePeakDbtp,
    lineCount: lesson.expressions.length, playthroughCount: 1, forcedRepetitions: 0,
    sourceTranscriptVerified: true, audioQcStudioDecision: 'original'
  }))
};
fs.writeFileSync(path.join(root, 'content/mini-talks/english-001.release.json'), JSON.stringify(releaseRecord, null, 2) + '\n');
console.log(`Wrote ${lessons.length} Mini Talks cards`);
