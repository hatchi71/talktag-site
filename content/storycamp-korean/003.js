/* TalkTag Korean Story Camp · 003. Original Korean stories with English guidance. */
(function () {
  'use strict';
  const family = {
    number: '003',
    slug: 'the-room-change',
    title: 'The Room Change',
    nativeTitle: '바뀐 모임 장소',
    theme: 'A missed notice inspires a clearer way to welcome the next person.',
    status: 'published',
    prompts: [
      'Remember where the meeting moved, why the learner missed it, and how the group changed the notice.',
      'Change the venue or event. How would you make the directions easier for a first-time visitor?',
      'Retell your version in Korean to a partner without reading your notes.'
    ],
    levels: {
      A1: {
        lines: ['오늘 저는 도서관에 갔어요.', '책 모임 방이 비어 있었어요.', '문에 작은 안내문이 있었어요.', '모임은 이층에서 열렸어요.', '저는 이층으로 가서 모임에 참여했어요.'],
        meanings: ['Today I went to the library.', 'The book club room was empty.', 'There was a small notice on the door.', 'The meeting was on the second floor.', 'I went to the second floor and joined the meeting.']
      },
      A2: {
        lines: ['오늘 도서관에서 책 모임이 있었어요.', '평소에 쓰던 방에 갔지만 아무도 없었어요.', '문에 붙은 안내문을 읽어 보니 모임 장소가 이층으로 바뀌었어요.', '저는 계단을 올라가서 모임에 늦지 않게 도착했어요.', '다음에 오는 사람을 위해 안내문을 더 크게 써 두면 좋겠다고 생각했어요.'],
        meanings: ['There was a book club meeting at the library today.', 'I went to our usual room, but no one was there.', 'When I read the notice on the door, I learned that the meeting had moved to the second floor.', 'I went upstairs and arrived at the meeting on time.', 'I thought it would be good to make the notice larger for the next person.']
      },
      B1: {
        lines: ['도서관 책 모임에 처음 참석하는 날이라 시작 시간보다 일찍 도착했어요.', '안내받은 방은 비어 있었고, 문에는 작은 글씨로 장소가 바뀌었다고 적혀 있었어요.', '이층에 올라가 보니 모임은 이미 준비를 마치고 있었어요.', '진행자는 안내가 눈에 잘 띄지 않았다며 괜찮았는지 물어봤어요.', '저는 길을 찾는 데 시간이 조금 걸렸지만 늦지는 않았다고 말했어요.', '모임이 끝난 뒤 우리는 다음 방문자를 위해 입구에도 안내문을 붙이기로 했어요.'],
        meanings: ['It was my first time attending the library book club, so I arrived before the start time.', 'The room I had been told to use was empty, and a small notice on the door said the location had changed.', 'When I went upstairs, the group was already getting ready.', 'The facilitator asked whether I was all right, since the notice had been hard to spot.', 'I said it had taken me a little time to find the room, but I had not been late.', 'After the meeting, we decided to put a notice at the entrance for the next visitor, too.']
      },
      B2: {
        lines: ['처음 가는 책 모임이라 도서관에서 보내 준 장소를 미리 확인하고 출발했어요.', '하지만 그 방은 비어 있었고, 문 한쪽에 붙은 작은 쪽지에만 변경된 장소가 적혀 있었어요.', '이층으로 올라가자 진행자가 반갑게 맞아 주면서 길을 찾기 어렵지 않았느냐고 물었어요.', '저는 찾기는 했지만 처음 온 사람이라면 안내문을 놓칠 수도 있겠다고 말했어요.', '진행자는 공지에 바뀐 층과 방 번호를 함께 쓰고, 도서관 입구에도 화살표를 붙이자고 제안했어요.', '우리는 다음 모임 전에 안내를 고쳤고, 새로 온 사람이 망설이지 않고 방을 찾을 수 있었어요.'],
        meanings: ['Because it was my first book club meeting, I checked the location the library had sent before leaving.', 'But the room was empty, and only a small note on one side of the door showed the new location.', 'When I went upstairs, the facilitator welcomed me and asked whether it had been hard to find the room.', 'I said I had found it, but someone visiting for the first time might miss the notice.', 'The facilitator suggested adding the new floor and room number to the announcement and putting an arrow at the library entrance.', 'We updated the directions before the next meeting, and a newcomer found the room without hesitating.']
      },
      C1: {
        lines: ['처음 참석하는 책 모임이어서 안내받은 방을 찾아갔는데, 문은 잠겨 있고 작은 쪽지에만 장소 변경이 적혀 있었어요.', '이층의 새 방에 들어서자 진행자가 찾아오는 데 어려움은 없었느냐고 물었지만, 제가 충분히 일찍 도착하지 않았다면 늦었을 거예요.', '저는 안내를 보낸 사람에게는 변경 사항이 분명했겠지만, 처음 오는 사람에게는 건물 안에서 어디를 살펴봐야 할지조차 알기 어렵다고 말했어요.', '진행자는 제 말을 불평으로 받아들이지 않고, 다음 방문자가 같은 일을 겪지 않도록 어디에 표시를 더할지 함께 생각해 보자고 했어요.', '우리는 출입구와 기존 방 앞에 같은 안내문을 붙이고, 공지에는 층수와 방 번호를 함께 적기로 했어요.', '다음 모임에서 새로 온 사람이 곧장 방을 찾아왔을 때, 작은 수정이 참여의 첫 문턱을 낮춘다는 것을 실감했어요.'],
        meanings: ['I went to the room listed for my first book club meeting, but the door was locked, and the change of location appeared only on a small note.', 'When I entered the new room upstairs, the facilitator asked whether I had trouble finding it; if I had not arrived early, I would have been late.', 'I said the change may have seemed obvious to the person who sent the notice, but a first-time visitor would not even know where in the building to look.', 'The facilitator did not take my comment as a complaint; instead, they asked us to think together about where to add signs so the next visitor would not have the same experience.', 'We decided to post the same notice at the entrance and outside the old room, and to include the floor and room number in the announcement.', 'When a newcomer walked straight to the room at the next meeting, I saw how a small change could lower the first barrier to taking part.']
      },
      C2: {
        lines: ['도서관 책 모임의 장소가 바뀌었다는 사실은 공지한 사람들에게는 충분히 전달된 것처럼 보였지만, 처음 방문한 제게는 복도 끝의 작은 쪽지로만 남아 있었어요.', '예전 방 앞에서 한참을 서성인 뒤에야 이층으로 올라갔고, 진행자는 제가 길을 찾느라 애썼다는 사실을 뒤늦게 알아차렸어요.', '저는 누가 안내를 빠뜨렸는지를 따지기보다, 처음 오는 사람이라면 어떤 지점에서 정보를 필요로 할지를 함께 살펴보자고 제안했어요.', '우리는 출입구에서 새 방까지 걸어 보며 안내가 끊기는 곳을 확인했고, 기존 방 앞의 쪽지뿐 아니라 층수와 방 번호가 적힌 표시를 두 군데 더 붙였어요.', '다음 모임에 온 새 참여자는 별다른 도움을 요청하지 않고 도착했지만, 그 사실만으로 안내가 누구에게나 충분하다고 단정하지는 않았어요.', '길을 익히 아는 사람의 관점에서 한 걸음 물러나야 비로소, 처음 문을 여는 사람이 마주할 작은 장애물이 보인다는 것을 배웠어요.'],
        meanings: ['To the organizers, the change of venue for the library book club seemed to have been communicated clearly enough; to me, a first-time visitor, it existed only as a small note at the end of a hallway.', 'Only after lingering outside the old room for some time did I go upstairs, and the facilitator realized too late that I had struggled to find the way.', 'Rather than ask who had failed to give directions, I suggested that we look at the points where a first-time visitor would need information.', 'We walked the route from the entrance to the new room, found the gaps in the directions, and added two more signs with the floor and room number as well as the note outside the old room.', 'A newcomer reached the next meeting without asking for help, but we did not take that alone as proof that the directions would work for everyone.', 'I learned that stepping back from the perspective of someone who knows the way is often the only way to see the small obstacles facing a person opening the door for the first time.']
      }
    }
  };
  const root = window.TALKTAG_STORYCAMP_KOREAN ||= { version: '2026-10-17-korean-story-002-003', families: [] };
  root.version = '2026-10-17-korean-story-002-003';
  root.families = (root.families || []).filter(item => item.number !== family.number);
  root.families.push(family);
})();
