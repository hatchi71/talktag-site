/* Explicit Boot Camp scene assets. English Vocal/Story share episode artwork. */
(() => {
  const koreanScenes = {
    'vocal-001': 'v001', 'vocal-002': 'class', 'story-001': 'class',
    'story-002': 'umbrella', 'vocal-003': 'room', 'story-003': 'room'
  };
  const koreanDescriptions = {
    v001: 'A small gift opens a longer conversation',
    class: 'Learners meet at a Korean community class',
    umbrella: 'Two neighbors share an umbrella at a bus stop',
    room: 'Learners respond to a change of classroom'
  };
  const englishDescriptions = Object.freeze({
    '001': '동료에게 여분의 샌드위치를 건네는 직장인',
    '002': '울리지 않은 알람을 보고 급하게 출근을 준비하는 직장인',
    '003': '차 지붕에 커피를 둔 채 가방을 싣는 직장인',
    '004': '이웃의 현관문 잠금 상태를 확인하는 사람',
    '005': '서로 다른 양말을 보고 함께 웃는 두 동료'
  });
  const levels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  window.TalkTagBootCampArtwork = Object.freeze({
    get(camp, number, level, language = 'ko') {
      if (!levels.has(level)) return null;
      if (language === 'en') {
        if (camp !== 'vocal' && camp !== 'story') return null;
        if (camp === 'story' && Number(number) > 3) return null;
        if (!Object.hasOwn(englishDescriptions, number)) return null;
        return Object.freeze({
          src: `/assets/bootcamp-scenes/en/${number}.webp`,
          alt: englishDescriptions[number]
        });
      }
      if (language !== 'ko') return null;
      const scene = koreanScenes[`${camp}-${number}`];
      if (!scene) return null;
      return Object.freeze({
        src: `/assets/bootcamp-scenes/ko/${scene}-${level.toLowerCase()}.jpg`,
        alt: `${koreanDescriptions[scene]} · ${level} illustration`
      });
    }
  });
})();
