(() => {
  'use strict';

  const version = '20261015-korean-vocal-002-v1';
  const levels = {
    A1: [
      ['오늘 새 수업에 왔어요.', 'I came to a new class today.'],
      ['처음이라 조금 떨려요.', 'I am a little nervous because it is my first time.'],
      ['괜찮아요. 같이 앉아요.', 'It is okay. Let us sit together.'],
      ['감사합니다. 열심히 해 볼게요.', 'Thank you. I will give it my best.']
    ],
    A2: [
      ['지난주에 이 수업을 추천받았어요.', 'I was recommended this class last week.'],
      ['오늘은 간단한 자기소개를 준비했어요.', 'Today, I prepared a short self-introduction.'],
      ['수업이 끝나면 같이 차를 마실까요?', 'Would you like to have tea together after class?'],
      ['좋아요. 서로 이야기를 더 들어 봐요.', 'Sounds good. Let us hear more about each other.']
    ],
    B1: [
      ['저는 한국어를 실제로 더 많이 써 보고 싶어서 이 모임에 왔어요.', 'I came to this group because I want to use Korean more in real life.'],
      ['그런데 사람들이 너무 빨리 말하면 중요한 내용을 놓칠 때가 있어요.', 'But when people speak too quickly, I sometimes miss important details.'],
      ['처음에는 누구나 그럴 수 있어요.', 'That can happen to anyone at first.'],
      ['이해하지 못한 부분이 있으면 편하게 다시 물어보세요.', 'If there is something you do not understand, please feel free to ask again.'],
      ['그렇게 말해 주시니 마음이 놓여요.', 'That makes me feel more at ease.'],
      ['오늘은 한 번 더 질문해 볼게요.', 'Today, I will try asking one more question.']
    ],
    B2: [
      ['다음 모임에서는 새로 온 분들이 참여하기 쉬운 활동을 해 보면 어떨까요?', 'What if we try an activity that makes it easier for newcomers to join in at the next meeting?'],
      ['좋습니다. 다만 설명이 길면 초급 학습자들이 부담을 느낄 수도 있어요.', 'That sounds good. However, beginner learners may feel overwhelmed if the explanation is too long.'],
      ['그럼 예시를 먼저 보여 주고 두 명씩 연습하게 하죠.', 'Then let us show an example first and have people practise in pairs.'],
      ['저는 질문 카드와 시간 안내를 준비할게요.', 'I will prepare question cards and time guidance.'],
      ['역할을 나누면 진행도 더 자연스러울 것 같네요.', 'If we divide the roles, the session will probably run more naturally.'],
      ['네, 모두가 한 번씩 말할 기회가 있도록 해요.', 'Yes, let us make sure everyone has a chance to speak once.']
    ],
    C1: [
      ['이 모임의 장점은 실수를 바로잡기보다 계속 말해 볼 수 있는 분위기가 있다는 점이에요.', 'One strength of this group is that it creates a space where people can keep speaking instead of having every mistake corrected immediately.'],
      ['맞아요. 정확성도 중요하지만, 초반에는 자신의 생각을 끝까지 표현해 보는 경험이 더 필요할 수 있죠.', 'That is right. Accuracy matters too, but at the beginning, learners may need the experience of expressing their thoughts all the way through even more.'],
      ['그래서 피드백은 말이 끝난 뒤에 선택적으로 주는 편이 좋겠습니다.', 'For that reason, it would be better to give feedback selectively after a person has finished speaking.'],
      ['그렇게 하면 참여자도 위축되지 않고 다음 시도에 집중할 수 있겠네요.', 'That way, participants will not feel discouraged and can focus on their next attempt.']
    ],
    C2: [
      ['참여를 독려한다는 말만으로는 부족하고, 발언할 여유와 선택지를 구조적으로 마련해야 한다고 봐요.', 'I think it is not enough simply to encourage participation; we need to build in the time and choices that make speaking possible.'],
      ['동의합니다. 익숙한 화자가 대화를 주도하지 않도록 진행 방식 자체를 조정할 필요도 있고요.', 'I agree. We also need to adjust the format itself so that familiar or fluent speakers do not dominate the conversation.'],
      ['결국 좋은 모임은 유창한 사람만 돋보이게 하는 자리가 아니라, 각자가 조금 더 분명하게 말하게 되는 과정이겠죠.', 'Ultimately, a good group is not a place where only fluent speakers stand out, but a process in which each person can speak a little more clearly.'],
      ['그 기준을 다음 프로그램 설계에도 반영해 봅시다.', 'Let us carry that principle into the design of the next programme as well.']
    ]
  };

  const levelsData = Object.fromEntries(Object.entries(levels).map(([level, pairs]) => [level, {
    status: 'ready',
    lines: pairs.map(([ko]) => ko),
    translation: pairs.map(([, en]) => en),
    speakers: pairs.map((_, index) => {
      const male = {A1:[2], A2:[2], B1:[2,3], B2:[0,2,4], C1:[1,3], C2:[1,3]};
      return male[level].includes(index) ? 'Joon' : 'Mina';
    }),
    audioSteps: Array.from({length: pairs.length}, (_, index) => ({
      step: index + 1,
      url: `/audio/korean/vocalcamp/002/${level}/step-${String(index + 1).padStart(2, '0')}.mp3?v=${version}`
    }))
  }]));

  const root = window.TALKTAG_VOCALCAMP_KOREAN ||= {version, families: []};
  root.version = version;
  root.families = (root.families || []).filter(family => family.number !== '002');
  root.families.push({
    number: '002',
    title: 'First Community Class',
    slug: 'first-community-class',
    theme: 'A new learner finds the confidence to join a Korean community class.',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    status: 'published',
    audioStatus: 'ready',
    levelsData
  });
})();
