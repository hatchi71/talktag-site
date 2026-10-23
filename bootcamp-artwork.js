/* Current Boot Camp 001 scenes. Retired episode artwork is not part of the catalog. */
(() => {
  'use strict';
  const levels = new Set(['A1','A2','B1','B2','C1','C2']);
  const scenes = Object.freeze({
    en: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/en/001-v3-vocal.jpg',alt:'A commuter checks the owner of a lost glove at a bus stop'}),
      story: Object.freeze({src:'/assets/bootcamp-scenes/en/001-v3-story.jpg',alt:'A reader gives a folded note to a librarian'})
    }),
    ko: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/ko/001-v3-vocal.jpg',alt:'A commuter checks the owner of a lost umbrella at a bus stop'}),
      story: Object.freeze({src:'/assets/bootcamp-scenes/ko/001-v3-story.jpg',alt:'A learner shows a forgotten charger to a teacher'})
    }),
    ja: Object.freeze({
      vocal: Object.freeze({src:'/assets/bootcamp-scenes/ja/001-v3-vocal.jpg',alt:'A learner returns a forgotten notebook to a community-class teacher'})
    })
  });
  window.TalkTagBootCampArtwork = Object.freeze({
    get(camp, number, level, language = 'ko') {
      if (number !== '001' || !levels.has(level)) return null;
      return scenes[language]?.[camp] || null;
    }
  });
})();
