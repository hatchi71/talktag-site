/* Korean Audio Essays & Articles · 001. Original Korean audio with English learner support. */
(function () {
  'use strict';
  const root = window.TalkTagNativeCatalogs ||= {};
  const base = '/audio/korean/audio-essays-articles/001';
  const audioMeta = {
    A1: { durationLabel: '0:24', durationLong: '0:24', durationSeconds: 23.68 },
    A2: { durationLabel: '0:24', durationLong: '0:24', durationSeconds: 23.68 },
    B1: { durationLabel: '0:40', durationLong: '0:40', durationSeconds: 40.31 },
    B2: { durationLabel: '0:48', durationLong: '0:48', durationSeconds: 48.34 },
    C1: { durationLabel: '0:49', durationLong: '0:49', durationSeconds: 49.37 },
    C2: { durationLabel: '0:58', durationLong: '0:58', durationSeconds: 58.24 }
  };
  // Sentence boundaries measured in the quiet intervals of the published recordings.
  // Each pair is [end of spoken sentence, start of the next spoken sentence].
  const sentenceGaps = {
    A1: [[4.672, 5.476], [9.430, 10.744], [13.819, 14.845], [18.781, 19.914]],
    A2: [[4.431, 5.466], [9.352, 10.397], [14.683, 15.748], [18.514, 19.628]],
    B1: [[8.046, 8.988], [15.575, 16.524], [19.797, 20.754], [32.473, 33.744]],
    B2: [[8.484, 9.140], [18.854, 19.446], [26.762, 27.895], [36.799, 37.782]],
    C1: [[10.887, 11.683], [21.514, 22.467], [34.620, 35.859]],
    C2: [[15.439, 16.060], [26.001, 27.031], [38.374, 39.428], [47.697, 48.720]]
  };
  const lessons = [
    {
      id: 'ko-plain-a1-001', language: 'ko', type: 'plain', level: 'A1', unit: 1,
      title: 'My First Community Class', nativeTitle: '첫 커뮤니티 수업', genre: 'Short personal note',
      description: 'Listen to a simple account of joining a new Korean class.',
      summary: 'Listen for the setting, one feeling, and one small connection. Then retell it in your own Korean.',
      expressions: ['오늘 저는 새 한국어 수업에 갔어요.', '선생님과 학생들이 친절했어요.', '저는 제 이름을 말했어요.', '옆 사람과 같이 앉았어요.', '다음 수업에도 가고 싶어요.'],
      meanings: ['Today I went to a new Korean class.', 'The teacher and students were kind.', 'I said my name.', 'I sat with the person next to me.', 'I want to go to the next class too.']
    },
    {
      id: 'ko-plain-a2-001', language: 'ko', type: 'plain', level: 'A2', unit: 1,
      title: 'After Class', nativeTitle: '수업이 끝난 뒤', genre: 'Short personal note',
      description: 'Follow a first conversation that continues after class.',
      summary: 'Listen for what the group did after class and why the speaker wants to return.',
      expressions: ['수업이 끝난 뒤에 몇 명이 근처 카페에 갔어요.', '우리는 오늘 배운 표현을 다시 말해 봤어요.', '한 친구가 다음 주에 같이 연습하자고 했어요.', '저는 좋은 생각이라고 말했어요.', '혼자 공부할 때보다 더 재미있을 것 같아요.'],
      meanings: ['After class, a few of us went to a café nearby.', 'We tried saying the expressions we had learned that day again.', 'One classmate suggested that we practise together next week.', 'I said that it sounded like a good idea.', 'I think it will be more enjoyable than studying alone.']
    },
    {
      id: 'ko-plain-b1-001', language: 'ko', type: 'plain', level: 'B1', unit: 1,
      title: 'A Place to Keep Talking', nativeTitle: '계속 말해 볼 수 있는 곳', genre: 'Reflective note',
      description: 'Consider why a local language group can make real conversation feel possible.',
      summary: 'Listen for the challenge of fast conversation and the support that helps learners keep speaking.',
      expressions: ['언어를 배울 때는 틀리지 않는 것보다 말을 계속해 보는 경험이 중요할 때가 있어요.', '지역 모임에서는 교과서에서 배운 표현을 실제 사람에게 써 볼 수 있어요.', '물론 빠른 대화는 부담스러울 수 있어요.', '그래서 좋은 모임은 질문할 시간을 주고, 이해하지 못한 부분을 다시 물어볼 수 있게 해요.', '작은 대화가 쌓이면 자신감도 조금씩 커져요.'],
      meanings: ['When learning a language, the experience of keeping a conversation going can sometimes matter more than not making mistakes.', 'At a local group, you can use expressions from a textbook with real people.', 'Of course, fast conversation can feel overwhelming.', 'That is why a good group makes room for questions and lets people ask again about what they did not understand.', 'As small conversations accumulate, confidence grows little by little.']
    },
    {
      id: 'ko-plain-b2-001', language: 'ko', type: 'plain', level: 'B2', unit: 1,
      title: 'Designing an Easier First Turn', nativeTitle: '첫마디를 쉽게 만드는 모임', genre: 'Practical commentary',
      description: 'Explore how an activity can make a new participant more willing to speak.',
      summary: 'Listen for two design choices that reduce pressure on a new learner.',
      expressions: ['새로운 사람이 모임에 들어왔을 때, 친절하게 인사하는 것만으로는 충분하지 않을 수 있어요.', '활동의 규칙이 복잡하거나 설명이 길면 참여자는 시작하기도 전에 자신감을 잃을 수 있기 때문이에요.', '반대로 짧은 예시와 짝 활동이 있으면 누구나 첫 문장을 말하기 쉬워져요.', '진행자는 가장 많이 말하는 사람만 보지 말고, 아직 말하지 않은 사람에게도 선택권을 주어야 해요.', '참여는 개인의 용기만으로 생기는 것이 아니라, 함께 설계하는 환경에서 자라요.'],
      meanings: ['When someone new joins a group, a friendly greeting alone may not be enough.', 'If the rules are complicated or the explanation is long, participants can lose confidence before they even begin.', 'By contrast, a short example and paired activity make it easier for anyone to say a first sentence.', 'A facilitator should not focus only on the people who speak the most; they should also give choice to people who have not spoken yet.', 'Participation does not arise from individual courage alone; it grows in an environment people design together.']
    },
    {
      id: 'ko-plain-c1-001', language: 'ko', type: 'plain', level: 'C1', unit: 1,
      title: 'Feedback at the Right Moment', nativeTitle: '알맞은 순간의 피드백', genre: 'Reflective commentary',
      description: 'Examine why the timing of feedback affects participation.',
      summary: 'Listen for the difference between noticing an error and deciding when to address it.',
      expressions: ['언어 학습 모임에서 피드백은 정확성을 높이는 데 필요하지만, 그 시점과 방식에 따라 참여를 위축시킬 수도 있어요.', '발화가 진행되는 동안 작은 오류를 모두 바로잡으면 학습자는 자신의 메시지보다 실수에 더 집중하게 돼요.', '반면 의미 전달이 끝난 뒤, 학습자가 요청한 한두 가지 항목에만 피드백을 제공하면 다음 시도에 적용하기가 훨씬 쉬워져요.', '따라서 효과적인 진행자는 오류를 발견하는 사람이라기보다, 언제 무엇을 다룰지 판단하는 사람에 가까워요.'],
      meanings: ['In a language-learning group, feedback is needed to improve accuracy, but its timing and form can also discourage participation.', 'If every small error is corrected while someone is speaking, learners focus more on mistakes than on their message.', 'By contrast, after the meaning has been communicated, giving feedback on only one or two points the learner has requested is much easier to apply in the next attempt.', 'An effective facilitator is therefore less someone who spots errors than someone who judges what to address and when.']
    },
    {
      id: 'ko-plain-c2-001', language: 'ko', type: 'plain', level: 'C2', unit: 1,
      title: 'Making Room to Speak', nativeTitle: '말할 여백을 만드는 일', genre: 'Analytical commentary',
      description: 'Consider how a group can make participation possible for different kinds of speakers.',
      summary: 'Listen for the difference between a warm atmosphere and an inclusive speaking structure.',
      expressions: ['포용적인 언어 모임은 단지 분위기가 따뜻한 공간을 뜻하지 않아요.', '누가 발언을 시작하고, 누가 침묵을 메우며, 누가 생각할 시간을 얻는지를 관찰해야 해요.', '유창한 참가자가 선의로 대화를 이끌더라도, 그 속도와 방식이 다른 사람의 참여를 제한할 수 있어요.', '따라서 진행자는 짝 대화, 사전 메모, 발언 순서 선택과 같은 장치를 통해 참여의 조건을 다시 설계할 필요가 있어요.', '이러한 장치는 소극적인 사람을 대신해 말해 주기 위한 것이 아니라, 각자가 자신의 언어로 말할 수 있는 여백을 보장하기 위한 것이에요.'],
      meanings: ['An inclusive language group is not simply a place with a warm atmosphere.', 'We need to observe who begins speaking, who fills silence, and who gets time to think.', 'Even when fluent participants lead the conversation with good intentions, their pace and approach can limit other people’s participation.', 'A facilitator therefore needs to redesign the conditions for participation through structures such as paired talk, notes before speaking, and a choice of speaking order.', 'These structures are not meant to speak on behalf of quieter people, but to ensure that everyone has room to speak in their own language.']
    }
  ].map(lesson => ({
    ...lesson,
    ...audioMeta[lesson.level],
    sentenceGaps: sentenceGaps[lesson.level],
    available: true,
    audio: `${base}/${lesson.level.toLowerCase()}.mp3?v=20261015-aea-001`,
    audioRevision: '20261015-aea-001',
    voiceName: 'Soo',
    accentTag: 'KR'
  }));
  root.ko = (root.ko || []).filter(lesson => !lesson.id.startsWith('ko-plain-') || !lesson.id.endsWith('-001')).concat(lessons);
})();
