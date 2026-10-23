(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const number = params.get('family') || '001';
  const level = (params.get('level') || 'A1').toUpperCase();
  const korean = params.get('lang') === 'ko';
  const app = document.getElementById('pilotApp');
  if (number !== '001' || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
    app.textContent = korean ? 'Episode 001 is the current Boot Camp lesson.' : 'Boot Camp 001만 현재 이용할 수 있습니다.';
    return;
  }
  const sources = korean
    ? ['content/vocalcamp-korean-001.js?v=20261014-korean-vocal-audio-v2', 'audio/korean/vocalcamp/segments-001-002/manifest.js?v=20261017-cumulative-v2']
    : ['content/vocalcamp/001.js?v=20261009-003'];
  const load = (index = 0) => {
    const script = document.createElement('script');
    script.src = sources[index];
    script.onload = () => {
      if (index + 1 < sources.length) return load(index + 1);
      const family = (korean ? window.TALKTAG_VOCALCAMP_KOREAN : window.TALKTAG_VOCALCAMP)?.families.find(item => item.number === number);
      const data = korean ? family?.levelsData?.[level] : family?.levels[level];
      const native = (korean ? window.TalkTagKoreanVocal001002Variants : window.TalkTagVocal001002Variants)?.cards?.find(card => card.id === `family-${number}-${level}`);
      const ready = Boolean(data && native && native.lines.length === data.lines.length &&
        native.lines.every((line, i) => line.text === data.lines[i]) &&
        native.steps.length === data.audioSteps.length &&
        native.steps.every(step => step.variants?.length === 4));
      if (!ready) {
        app.textContent = korean ? 'The approved audio and script do not match. This card is unavailable.' : '검수된 음원과 대본이 일치하지 않아 카드를 열 수 없습니다.';
        return;
      }
      if (korean) {
        document.documentElement.lang = 'en';
        const brand = document.querySelector('.pilot-brand span');
        const home = document.querySelector('.pilot-brand');
        const back = document.querySelector('.pilot-back');
        if (brand) brand.textContent = 'Korean Vocal Camp';
        if (home) { home.href = 'K-korean.html'; home.setAttribute('aria-label', 'TalkTag Korean home'); }
        if (back) { back.href = `K-korean-vocal-camp.html?level=${level}`; back.textContent = '← Korean Vocal Camp'; }
      }
      const ends = window.TalkTagBootCampStages.boundaries(data.lines.length, 3);
      const audioSteps = ends.map((end, index) => ({
        ...data.audioSteps[end - 1], step: index + 1,
        variants: native.steps[end - 1].variants
      }));
      const artwork = window.TalkTagBootCampArtwork?.get('vocal', number, level, korean ? 'ko' : 'en');
      window.TalkTagVocalPilots = [{
        id: `family-${number}-${level}`, familyNumber: number, level, title: family.title,
        artwork: artwork?.src, artworkAlt: artwork?.alt,
        fullText: data.lines, stageLines: window.TalkTagBootCampStages.units(data.lines, 3),
        translation: data.translation || [],
        storyFlow: family.storyFlow || (korean ? ['Beginning', 'Change', 'Choice', 'Result'] : ['시작', '변화', '선택', '결과']),
        note: korean ? 'Rebuild the same Korean story from memory, then make it your own.' : '같은 이야기를 Story Camp에서 기억으로 다시 구성해 보세요.',
        mission: korean ? 'Build the sound into your own story.' : '소리부터 내 이야기로',
        audioStatus: data.status, audioSteps,
        audioCue: family.audioCue || {
          startUrl: 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/001/20261008/cues/start.mp3',
          endUrl: 'https://audio.talktag.co.kr/English/boot-camp/vocal-camp/001/20261008/cues/ending.mp3'
        }
      }];
      const engine = document.createElement('script');
      engine.src = 'vocalcamp-player.js?v=20261023-001-three-units';
      document.head.appendChild(engine);
    };
    script.onerror = () => { app.textContent = korean ? 'Could not load this lesson.' : '자료를 불러오지 못했습니다.'; };
    document.head.appendChild(script);
  };
  load();
})();
