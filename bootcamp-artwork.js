/* One scene per Korean Boot Camp story and level; shared stories reuse the same art. */
(() => {
  const scenes = {
    'vocal-001': 'v001', 'vocal-002': 'class', 'story-001': 'class',
    'story-002': 'umbrella', 'vocal-003': 'room', 'story-003': 'room'
  };
  const descriptions = {
    v001: 'A small gift opens a longer conversation',
    class: 'Learners meet at a Korean community class',
    umbrella: 'Two neighbors share an umbrella at a bus stop',
    room: 'Learners respond to a change of classroom'
  };
  const levels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  window.TalkTagBootCampArtwork = Object.freeze({
    get(camp, number, level) {
      const scene = scenes[`${camp}-${number}`];
      if (!scene || !levels.has(level)) return null;
      return Object.freeze({
        src: `/assets/bootcamp-scenes/ko/${scene}-${level.toLowerCase()}.jpg`,
        alt: `${descriptions[scene]} · ${level} illustration`
      });
    }
  });
})();
