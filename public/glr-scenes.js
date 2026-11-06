/* Published GLR scenes. Scene art and briefings never change lesson/audio state. */
(function () {
  'use strict';
  const scenes = {
    "guided-a1-01": "Getting out of bed and accepting a glass of water",
    "guided-a2-01": "Washing a shirt and hanging it up to dry",
    "guided-b1-01": "Planning a short dog walk before the rain",
    "guided-b2-01": "Politely asking a neighbor to turn the music down",
    "guided-c1-01": "Arranging a repair visit with a worker",
    "guided-c2-01": "A host taking a quiet break while a guest relaxes",
    "guided-a1-02": "Getting a raincoat and umbrella ready to go outside",
    "guided-a2-02": "Asking someone to take a photograph by a landmark",
    "guided-b1-02": "Checking a mixed-up takeaway bag at a cafe",
    "guided-b2-02": "Rescheduling an appointment at a service counter",
    "guided-c1-02": "Checking an unexpected subscription renewal charge",
    "guided-c2-02": "Trying to assemble a shelf before asking for help",
    'guided-a1-03': 'Getting ready by the door with a jacket, shoes and keys',
    'guided-a2-03': 'Asking which bus to take at a bus stop',
    'guided-b1-03': 'Choosing the bus when rain changes the plan',
    'guided-b2-03': 'Checking the total price and delivery at a shop',
    'guided-c1-03': 'Clarifying a proposal and checking its cost',
    'guided-c2-03': 'Giving an honest answer in a friendly conversation',
    'guided-a1-04': 'Finding black glasses on a table beside a lamp',
    'guided-a2-04': 'Collecting a parcel from a package counter',
    'guided-b1-04': 'Calling about a late train and a later meeting',
    'guided-b2-04': 'Asking a waiter for a quieter table',
    'guided-c1-04': 'Checking whether parking is included in a booking',
    'guided-c2-04': 'Discussing a delayed but well-completed repair',
    'guided-a1-05': 'Pouring a little coffee and waiting for it to cool',
    'guided-a2-05': 'Returning a shirt with a receipt at a shop',
    'guided-b1-05': 'Finding a quiet room for a call',
    'guided-b2-05': 'Politely declining extra work while busy',
    'guided-c1-05': 'Sharing a suggestion and listening to other opinions',
    'guided-c2-05': 'Asking for a ride without pressuring a friend',
    'guided-a1-06': 'Welcoming a guest at the door and offering to take their coat',
    'guided-a2-06': 'Looking for an open entrance to a building',
    'guided-b1-06': 'Politely checking a wrong-sized order at a shop',
    'guided-b2-06': 'Checking a message and waiting for a reply',
    'guided-c1-06': 'Calmly discussing different interpretations of a note',
    'guided-c2-06': 'Listening quietly and attentively to a friend',
    'guided-a1-07': 'Borrowing a charger for a low-battery phone',
    'guided-a2-07': 'Booking a haircut before an afternoon deadline',
    'guided-b1-07': 'Packing a car to leave before rush-hour traffic',
    'guided-b2-07': 'Checking cancellation fees and auto-renewal on a subscription',
    'guided-c1-07': 'Agreeing on a backup plan after a missed step',
    'guided-c2-07': 'Keeping options open until a firm date is set',
    'guided-a1-08-miniskit-pilot': 'Two friends in a warm living room try one window, then open another',
    'guided-a1-09-miniskit-pilot': 'Two friends by the door check for keys before heading out',
    'guided-a1-10-miniskit-pilot': 'Two friends sort an empty glass bottle and a plastic bottle into a blue recycling bin',
    'guided-a2-08-miniskit': 'Two friends reschedule a package delivery so someone can be home',
    'guided-b1-08-miniskit': 'Friends coordinate food and drinks for a neighborhood potluck',
    'guided-b2-08-miniskit': 'A shopper and friend compare two everyday appliances',
    'guided-c1-08-miniskit': 'Coworkers clarify whether a Friday deadline is firm',
    'guided-c2-08-miniskit': 'A small team sets limits before testing a new idea',
    'guided-a2-09-miniskit': 'Friends look for keys on an entry table before leaving',
    'guided-b1-09-miniskit': 'Two walkers reroute around a street closure',
    'guided-b2-09-miniskit': 'Coworkers discuss simplifying a slide presentation',
    'guided-c1-09-miniskit': 'Travelers distinguish a preferred train from a required arrival time',
    'guided-c2-09-miniskit': 'Event organizers discuss a check-in bottleneck and a fix',
    'guided-a2-10-miniskit': 'A patient calls a clinic to book another appointment',
    'guided-b1-10-miniskit': 'Friends check tickets, keys and a charger before leaving',
    'guided-b2-10-miniskit': 'Friends plan an outdoor lunch with an indoor backup',
    'guided-c1-10-miniskit': 'A teammate scopes what can realistically be delivered this week',
    'guided-c2-10-miniskit': 'A friend changes a weekend plan and offers to help another day'
  };
  const sceneBriefings = {
    'guided-a1-01': '잠에서 깬 사람이 물을 마시고 천천히 몸을 깨우며 아침을 시작합니다.',
    'guided-a2-01': '내일 입을 셔츠를 세탁해 널고, 마를 때까지 기다리는 일상 장면입니다.',
    'guided-b1-01': '비가 오기 전에 반려견과 짧게 산책할 수 있을지 날씨를 살펴봅니다.',
    'guided-b2-01': '늦은 시간 음악 소리가 크게 들려 이웃에게 정중하게 부탁합니다.',
    'guided-c1-01': '수리 기사와 방문 시간을 조율하며 필요한 일정을 확인합니다.',
    'guided-c2-01': '손님을 맞이한 뒤 잠시 혼자 쉴 시간을 부드럽게 요청합니다.',
    'guided-a1-02': '비 오는 날 외출하려고 우비와 우산을 챙깁니다.',
    'guided-a2-02': '여행지에서 만난 사람에게 사진을 찍어 달라고 부탁합니다.',
    'guided-b1-02': '카페에서 포장 봉투가 주문과 다른 것을 발견해 직원에게 확인합니다.',
    'guided-b2-02': '기존 약속 시간을 바꾸기 위해 가능한 다른 시간을 제안합니다.',
    'guided-c1-02': '예상하지 못한 구독 갱신 요금을 확인하고 결제 내역을 문의합니다.',
    'guided-c2-02': '도움을 준 사람에게 고마움을 전하면서 직접 해 볼 여지도 부탁합니다.',
    'guided-a1-03': '집을 나서기 전 옷과 신발, 열쇠를 하나씩 챙깁니다.',
    'guided-a2-03': '버스 정류장에서 목적지로 가는 버스와 내릴 곳을 물어봅니다.',
    'guided-b1-03': '비가 오기 시작해 원래 계획을 바꾸고 버스로 이동하기로 합니다.',
    'guided-b2-03': '물건을 주문하기 전에 배송비와 최종 결제 금액을 확인합니다.',
    'guided-c1-03': '제안의 의도를 확인하고, 오해가 없도록 서로의 생각을 정리합니다.',
    'guided-c2-03': '경험을 돌아보며 좋았던 점과 아쉬웠던 점을 솔직하게 이야기합니다.',
    'guided-a1-04': '안경을 찾으며 탁자와 램프 주변에 있는 물건을 살펴봅니다.',
    'guided-a2-04': '택배 보관 데스크에서 이름과 배송 정보를 확인하고 소포를 받습니다.',
    'guided-b1-04': '열차가 늦어져 약속 시간을 조금 미룰 수 있는지 연락합니다.',
    'guided-b2-04': '식당에서 더 조용한 자리로 옮길 수 있는지 직원에게 부탁합니다.',
    'guided-c1-04': '예약에 주차가 포함되는지 확인하고 조건을 다시 살펴봅니다.',
    'guided-c2-04': '수리가 늦어진 상황과 결과를 함께 따져 보고 공정하게 평가합니다.',
    'guided-a1-05': '커피를 조금 더 따르고, 뜨거운 음료가 식기를 기다립니다.',
    'guided-a2-05': '영수증을 챙겨 가게에서 사이즈가 맞지 않는 셔츠를 반품합니다.',
    'guided-b1-05': '통화할 수 있도록 주변보다 조용한 장소를 찾습니다.',
    'guided-b2-05': '일이 바쁜 상황을 설명하고 추가 업무를 정중하게 사양합니다.',
    'guided-c1-05': '하나의 의견을 결정으로 받아들이지 않도록 제안의 의미를 분명히 합니다.',
    'guided-c2-05': '친구에게 차편을 부탁하면서 어려우면 거절해도 된다고 덧붙입니다.',
    'guided-a1-06': '친구가 집에 찾아와 인사를 나누고, 주인이 외투와 물을 챙겨 줍니다.',
    'guided-a2-06': '건물에 도착한 방문객이 닫힌 입구를 확인하고 다른 출입구를 찾아갑니다.',
    'guided-b1-06': '주문한 사이즈와 다른 물건을 받아 가게 직원에게 확인을 부탁합니다.',
    'guided-b2-06': '메시지 답장을 기다리며 재촉하지 않고 진행 상황을 확인합니다.',
    'guided-c1-06': '메모를 다르게 해석한 두 사람이 어떤 표현이 단정적으로 들렸는지 차분히 짚어 봅니다.',
    'guided-c2-06': '대화 중 조용했던 사람이 불만이 있었던 것은 아니라고 친구에게 설명합니다.',
    'guided-a1-07': '배터리가 얼마 남지 않은 휴대폰을 위해 충전기를 빌리고, 콘센트 옆에 앉아 잠시 사용합니다.',
    'guided-a2-07': '미용실에서 오후 3시 반 예약이 가능한지 확인하고, 4시 전에는 나가야 한다고 설명합니다.',
    'guided-b1-07': '퇴근 시간대의 정체를 피해 조금 일찍 출발하려고, 아직 준비 중인 친구를 도와 차에 짐을 싣습니다.',
    'guided-b2-07': '구독을 한 달만 먼저 써볼 수 있는지, 취소 수수료와 자동 갱신 조건은 어떤지 확인합니다.',
    'guided-c1-07': '누가 놓쳤는지 따지기보다 다음에 어떻게 할지에 초점을 두고 대안을 함께 정합니다.',
    'guided-c2-07': '날짜가 확정되지 않은 계획에 대해 기준을 차분히 밝히고, 확정 전까지 다른 선택지도 남겨 둡니다.',
    'guided-a1-08-miniskit-pilot': '더운 방에서 친구 둘이 창문을 열어 환기하려고 합니다. 한쪽 창문이 열리지 않아 다른 창문을 열어 봅니다.',
    'guided-a1-09-miniskit-pilot': '외출을 앞둔 친구 둘이 현관에서 열쇠를 찾고, 탁자 위에서 발견한 뒤 함께 나섭니다.',
    'guided-a1-10-miniskit-pilot': '두 친구가 빈 병을 분리수거하면서 어느 통에 넣을지 묻고 답합니다.',
    'guided-a2-08-miniskit': '택배를 받을 수 있는 시간으로 배송 일정을 바꾸기 위해 전화로 시간을 조율합니다.',
    'guided-b1-08-miniskit': '동네 모임에 가져갈 음식과 음료를 친구와 나누어 정합니다.',
    'guided-b2-08-miniskit': '가전제품 두 가지의 장단점을 비교하며 실제로 필요한 기능을 따져 봅니다.',
    'guided-c1-08-miniskit': '업무 마감일이 확정된 일정인지 목표일인지 확인하고 계획을 조정합니다.',
    'guided-c2-08-miniskit': '새로운 아이디어를 시험하되 감당할 수 있는 범위와 성공 기준을 정합니다.',
    'guided-a2-09-miniskit': '영화 보러 나가기 전 현관에서 열쇠를 찾아 출발합니다.',
    'guided-b1-09-miniskit': '공사로 막힌 길을 피해 지도를 확인하고 다른 경로로 이동합니다.',
    'guided-b2-09-miniskit': '상대의 수고를 인정하며 발표 자료를 간결하게 다듬자고 제안합니다.',
    'guided-c1-09-miniskit': '여행 계획에서 개인의 선호와 반드시 필요한 조건을 구분합니다.',
    'guided-c2-09-miniskit': '행사를 돌아보며 잘된 점을 칭찬하고 다음에 보완할 점을 제안합니다.',
    'guided-a2-10-miniskit': '병원에 전화해 가능한 시간을 묻고 새 진료 예약을 정합니다.',
    'guided-b1-10-miniskit': '외출하기 전 휴대폰 표와 열쇠, 보조 배터리를 함께 확인합니다.',
    'guided-b2-10-miniskit': '날씨에 따라 야외와 실내 중 선택할 수 있도록 점심 계획을 세웁니다.',
    'guided-c1-10-miniskit': '제안에 동의하면서 이번 주에 현실적으로 할 수 있는 범위를 분명히 합니다.',
    'guided-c2-10-miniskit': '주말 약속을 바꾸게 된 사정을 미리 설명하고 준비를 돕겠다고 제안합니다.'
  };
  const nativeScenes = {
    a1: 'Two adults greeting at a cafe and offering an empty chair',
    a2: 'Finding a meeting place near a building entrance',
    b1: 'Politely rescheduling an appointment at a reception counter',
    b2: 'Choosing a convenient meeting place together',
    c1: 'Calmly explaining and clearing up a misunderstanding',
    c2: 'Offering help while letting a friend try independently'
  };
  function attach(title, id, player) {
    const baseId = (id || '').replace(/-part\d+$/, '');
    const native = /^(?:ko|ja)-guided-(a1|a2|b1|b2|c1|c2)-001(?:-part\d+)?$/.exec(id || '');
    const lesson = (window.TalkTagAudioLessons || []).find(item => item.id === id);
    if (lesson?.format === 'level0') return; // Level 0 uses a picture-led cover on its cards and player.
    const description = lesson?.scene || (native ? nativeScenes[native[1]] : scenes[baseId]);
    if (!title || !description || title.parentElement.classList.contains('glr-scene-title')) return;
    const header = document.createElement('div');
    header.className = 'glr-scene-title' + (player ? ' glr-scene-player' : '');
    title.before(header);
    header.append(title);
    const image = document.createElement('img');
    image.className = 'glr-scene-image';
    const miniskit = /^guided-(a2|b1|b2|c1|c2)-(08|09|10)-miniskit(?:-part\d+)?$/.exec(id || '');
    image.src = lesson?.artwork || (native ? '/assets/glr-scenes/native-001-' + native[1] + '.webp' : miniskit ? '/assets/glr-scenes/miniskit/' + miniskit[2].padStart(3, '0') + '-' + miniskit[1] + '.jpg' : '/assets/glr-scenes/' + id.replace(/-(?:miniskit-pilot|miniskit)$/, '') + (/(?:07|08|09|10)(?:-miniskit-pilot|-miniskit)?$/.test(id) ? '.jpg' : '.webp'));
    image.alt = lesson?.artworkAlt || description;
    image.width = 360; image.height = 240;
    // Keep portrait and square artwork in a matching frame instead of
    // squeezing it into the landscape slot used by the older GLR scenes.
    if (/\/miniskit\/\d{3}-/.test(image.src)) {
      image.classList.add('glr-scene-image--portrait');
      image.width = 388; image.height = 488;
    } else if (/\/guided-a1-09\.jpg$/.test(image.src)) {
      image.classList.add('glr-scene-image--square');
      image.width = 720; image.height = 720;
    }
    image.loading = player ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), {once: true});
    header.append(image);
  }
  function attachBriefing(id) {
    if (document.body.dataset.audioType !== 'guided') return;
    const briefing = document.getElementById('sceneBriefing');
    const text = document.getElementById('sceneBriefingText');
    const lesson = (window.TalkTagAudioLessons || []).find(item => item.id === id);
    const description = lesson?.briefing || sceneBriefings[id] || sceneBriefings[(id || '').replace(/-part\d+$/, '')];
    if (!briefing || !text || !description) return;
    text.textContent = description;
    briefing.hidden = false;
  }
  function refresh() {
    if (document.body.dataset.audioType !== 'guided') return;
    document.querySelectorAll('#lessonList .lesson-card').forEach(card => {
      const id = (card.dataset.completionId || '').replace(/^audio:/, '');
      attach(card.querySelector('.lesson-copy h2'), id, false);
    });
    const id = new URLSearchParams(location.search).get('id');
    attach(document.getElementById('lessonTitle'), id, true);
    attachBriefing(id);
  }
  refresh();
  const list = document.getElementById('lessonList');
  if (list) new MutationObserver(refresh).observe(list, {childList: true});
  window.addEventListener('pageshow', refresh);
})();
