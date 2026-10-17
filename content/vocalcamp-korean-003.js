/* TalkTag Korean Vocal Camp · 003. */
(() => {
  'use strict';
  const version = '20261017-korean-vocal-003-v1';
  const levels = {
    A1: [
      ['책 모임에 왔어요.', 'I came to the book club.'],
      ['이 방에는 아무도 없어요.', 'There is no one in this room.'],
      ['모임은 이층에 있어요.', 'The meeting is on the second floor.'],
      ['감사합니다. 올라가 볼게요.', 'Thank you. I will go upstairs.']
    ],
    A2: [
      ['책 모임이 이 방에서 열리는 줄 알았어요.', 'I thought the book club was meeting in this room.'],
      ['오늘은 장소가 이층으로 바뀌었어요.', 'The location changed to the second floor today.'],
      ['아, 문에 붙은 안내문을 못 봤네요.', 'Oh, I missed the notice on the door.'],
      ['괜찮아요. 같이 올라가요.', 'That is okay. Let us go upstairs together.']
    ],
    B1: [
      ['안내받은 방에 갔는데 아무도 없어서 모임이 취소된 줄 알았어요.', 'I went to the room I was told about, but no one was there, so I thought the meeting had been canceled.'],
      ['오늘은 다른 모임 때문에 우리 방이 이층으로 바뀌었어요.', 'Another group needed our room today, so we moved upstairs.'],
      ['문에 작은 안내문이 있었는데 제가 지나쳤나 봐요.', 'There was a small notice on the door, but I must have walked past it.'],
      ['처음 오셨으면 찾기 어려우셨겠어요.', 'It must have been hard to find if this is your first time here.'],
      ['다음에는 입구에도 안내문을 붙이면 좋겠어요.', 'Next time, it would help to put a notice at the entrance too.'],
      ['좋은 생각이에요. 바로 준비할게요.', 'Good idea. I will arrange that right away.']
    ],
    B2: [
      ['모임 장소를 다시 확인하고 왔는데, 안내받은 방이 비어 있어서 조금 당황했어요.', 'I checked the location again before coming, so I was a little confused when the room I was told about was empty.'],
      ['죄송해요. 갑자기 방이 바뀌어서 공지가 충분히 눈에 띄지 않았나 봐요.', 'I am sorry. The room changed unexpectedly, and our notice must not have been visible enough.'],
      ['저는 찾았지만 처음 오는 사람은 작은 쪽지를 놓칠 수도 있겠어요.', 'I found it, but someone coming for the first time might miss a small note.'],
      ['그럼 입구와 기존 방 앞에 같은 안내문을 붙이면 어떨까요?', 'Then what if we put the same notice at the entrance and outside the old room?'],
      ['층수와 방 번호도 함께 적으면 더 분명할 것 같아요.', 'It would be clearer if we included the floor and room number too.'],
      ['좋아요. 다음 모임 전까지 안내를 고쳐 놓을게요.', 'Sounds good. I will update the directions before the next meeting.']
    ],
    C1: [
      ['처음 방문하는 사람의 입장에서는 안내받은 방이 비어 있으면 모임이 취소된 건지 장소가 바뀐 건지 알기 어렵겠어요.', 'From a first-time visitor’s perspective, an empty room makes it hard to tell whether the meeting was canceled or moved.'],
      ['맞아요. 변경 사항을 공지했다는 사실만으로 필요한 정보가 제대로 전달됐다고 볼 수는 없죠.', 'Right. Posting an update does not necessarily mean the information reached the people who needed it.'],
      ['출입구부터 새 방까지 따라갈 수 있도록 층수와 방 번호를 눈에 띄게 표시하면 좋겠어요.', 'It would help to clearly mark the floor and room number along the route from the entrance to the new room.'],
      ['좋은 제안이에요. 다음 모임 전에 처음 오는 사람의 동선을 따라가며 안내를 점검해 봅시다.', 'That is a good suggestion. Before the next meeting, let us walk the route a newcomer would take and check the signs.']
    ],
    C2: [
      ['장소 변경을 알리는 공지가 있었다는 것과 처음 방문한 사람이 길을 찾을 수 있었다는 것은 서로 다른 문제라고 생각해요.', 'I think posting a notice about the room change and enabling a first-time visitor to find the room are two different things.'],
      ['동의해요. 내부 사정을 아는 사람에게는 충분해 보이는 정보도 낯선 사람에게는 결정적인 부분이 빠져 있을 수 있죠.', 'I agree. Information that seems sufficient to an insider may leave out exactly what a newcomer needs.'],
      ['누가 실수했는지 따지기보다, 출입구에서 새 방까지 어디에서 안내가 끊기는지 함께 살펴보면 어떨까요?', 'Rather than assigning blame, why do we not look together at where the directions break down between the entrance and the new room?'],
      ['좋습니다. 다음 방문자가 도움을 요청하지 않고도 도착할 수 있도록 표시를 고치고, 실제로 효과가 있었는지도 확인해 보죠.', 'Good. Let us improve the signs so the next visitor can arrive without asking for help, then check whether the changes actually worked.']
    ]
  };
  const male = { A1: [1, 2], A2: [1, 3], B1: [1, 3, 5], B2: [1, 3, 5], C1: [1, 3], C2: [1, 3] };
  const levelsData = Object.fromEntries(Object.entries(levels).map(([level, pairs]) => [level, {
    status: 'ready',
    lines: pairs.map(([ko]) => ko),
    translation: pairs.map(([, en]) => en),
    speakers: pairs.map((_, index) => male[level].includes(index) ? 'Joon' : 'Mina'),
    audioSteps: pairs.map((_, index) => ({ step: index + 1, url: `https://audio.talktag.co.kr/Korean/boot-camp/vocal-camp/segments-003/v1-20261017/003/${level.toLowerCase()}/pause-2_5/step-${String(index + 1).padStart(2, '0')}.mp3` }))
  }]));
  const root = window.TALKTAG_VOCALCAMP_KOREAN ||= { version, families: [] };
  root.families = (root.families || []).filter(family => family.number !== '003');
  root.families.push({
    number: '003', title: 'The Room Change', slug: 'the-room-change',
    theme: 'Find a moved book club meeting and make the directions clearer for the next visitor.',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    status: 'published', audioStatus: 'ready', levelsData
  });
})();
