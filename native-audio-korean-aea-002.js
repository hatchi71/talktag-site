/* Korean Audio Essays & Articles · 002 · A1. Original learner audio, QC approved 2026-10-23. */
(function () {
  'use strict';
  const root = window.TalkTagNativeCatalogs ||= {};
  const lesson = {
    id: 'ko-plain-a1-002', language: 'ko', type: 'plain', level: 'A1', unit: 2,
    title: 'A Late Bus, a Helpful Message', nativeTitle: '늦은 버스와 한 통의 메시지',
    genre: 'Short personal account',
    description: 'Listen for the place, the delay, the message, and the outcome.',
    summary: 'Listen once without the script. Name the problem and the person who helped, then retell the morning in your own Korean.',
    expressions: [
      '오늘 아침에는 비가 왔어요.',
      '저는 우산을 들고 버스 정류장에 갔어요.',
      '버스가 늦어서 조금 걱정했어요.',
      '저는 회사 친구에게 메시지를 보냈어요. “버스가 늦어요.”',
      '친구는 답했어요. “괜찮아요. 조심해서 오세요.”',
      '잠시 후 버스가 왔어요.',
      '저는 회사에 제시간에 도착했어요.'
    ],
    meanings: [
      'It rained this morning.',
      'I took an umbrella and went to the bus stop.',
      'The bus was late, so I was a little worried.',
      'I sent my coworker a message: “The bus is late.”',
      'My coworker replied: “That’s okay. Come safely.”',
      'The bus came a little later.',
      'I arrived at work on time.'
    ],
    available: true,
    audio: 'https://audio.talktag.co.kr/Essays/boundary-dings/v2-20261023/ko/ko-plain-a1-002.mp3?v=fb7d08495617',
    audioRevision: 'qc-fb7d08495617',
    checksum: 'fb7d08495617e5f4d83ce63fee9a59e75960b95deede1e3346c77684e238c89c',
    durationSeconds: 31.965188, durationLabel: '0:31', durationLong: '0:31',
    openingDingSeconds: 0.527708, closingDingSeconds: 1.076292, boundaryDings: true,
    voiceName: 'Soo', accentTag: 'KR'
  };
  root.ko = (root.ko || []).filter(item => item.id !== lesson.id).concat(lesson);
})();
