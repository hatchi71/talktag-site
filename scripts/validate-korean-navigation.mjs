import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const read = path => fs.readFileSync(path, 'utf8');
const native = { language: 'ko', ui: 'en', libraryPage: 'K-korean-audio-library.html', studioPage: 'K-korean-learning.html' };
const catalogContext = { window: { TalkTagNative: native } };
vm.createContext(catalogContext);
for (const file of ['native-guided-data.js', 'native-guided-ko-002.js', 'native-guided-ko-003.js', 'native-guided-ko-004-a1.js', 'native-guided-ko-005-010.js', 'native-guided-ko-splits.js', 'mini-talks-korean-001.js', 'korean-support-mini-talks-001.js', 'native-audio-catalog.js']) {
  if (!fs.existsSync(file)) continue;
  vm.runInContext(read(file), catalogContext, { filename: file });
}
const lessons = catalogContext.window.TalkTagAudioLessons.filter(lesson => lesson.available !== false);
const miniReleased = catalogContext.window.TalkTagKoreanMiniReleaseReady === true;
assert.ok(miniReleased, 'Korean Mini Talks release must remain complete after essay retirement');
const code = read('native-audio-ui.js');

function backFor(search, { retiredEssay = false, miniReleased = false } = {}) {
  const back = { href: '' };
  const context = {
    window: { TalkTagNative: native, TalkTagAudioLessons: lessons, TalkTagKoreanMiniReleaseReady: miniReleased },
    document: {
      body: { classList: { contains: token => retiredEssay && token === 'retired-essay-page' } },
      getElementById: id => id === 'nativeBack' ? back : null,
      querySelectorAll: () => []
    },
    location: { search },
    URLSearchParams,
    MutationObserver: class { observe() {} },
    addEventListener() {},
    requestAnimationFrame() {}
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'native-audio-ui.js' });
  return back.href;
}

for (const lesson of lessons) {
  const retiredEssay = miniReleased && /^ko-plain-(?:a1|a2|b1|b2|c1|c2)-\d{3}$/.test(lesson.id);
  const expected = retiredEssay ? `${native.libraryPage}?type=plain` : `${native.libraryPage}?type=${lesson.type}&level=${lesson.level}`;
  assert.equal(backFor('?id=' + encodeURIComponent(lesson.id), {retiredEssay, miniReleased}), expected, `Wrong Back route for ${lesson.id}`);
}
assert.equal(backFor('?id=ko-plain-a1-001', { retiredEssay: true, miniReleased: true }),
  `${native.libraryPage}?type=plain`, 'Retired essays must route to Mini Talks, not back to a removed essay level');
for (const type of ['guided', 'plain']) {
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    assert.equal(backFor(`?type=${type}&level=${level}`), `${native.libraryPage}?type=${type}`, `Wrong ${type} level Back route`);
  }
  assert.equal(backFor(`?type=${type}`), `${native.studioPage}#sound-check`, `Wrong ${type} collection Back route`);
}

for (const file of ['K-korean-audio-library.html', 'K-korean-audio-player.html']) {
  const html = read(file);
  assert.match(html, /native-audio-ui\.js\?v=[^"']+/);
  assert.match(html, /id="nativeBack"/);
  assert.match(html, /K-korean-learning\.html#sound-check/);
}
assert.match(read('K-korean-audio-essays.html'), /searchParams\.set\('type','plain'\)/, 'Essay entrance must preserve the plain collection');
assert.match(read('native-audio-player.js'), /location\.replace\(native\.libraryPage \+ "\?type=guided&level="/, 'Retired Korean audio routes must stay in the Korean library');
for (const camp of ['story', 'vocal']) {
  const html = read(`K-korean-${camp}-camp.html`);
  assert.match(html, /K-korean-learning\.html#boot-camp/, 'Korean camp must return to Korean Studio');
  assert.match(html, /talktag-theme\.js\?v=[\w-]+/, 'Korean camp must load the shared navigation');
  assert.match(read('bootcamp-browser.js'), /language === 'ko' \? '&lang=ko' : ''/, 'Korean camp cards must carry their language route');
}
const theme = read('talktag-theme.js');
assert.match(theme, /const koreanCampLanding = \/\^\\\/K-korean-\(\?:vocal\|story\)-camp\\\.html\$\//, 'Shared navigation must recognize Korean camp landings');
assert.match(theme, /if\(koreanCampLanding\)return '\/K-korean-learning\.html#boot-camp';\s*if\(/, 'Korean camp previous button must route to Boot Camp before the generic home rule');
assert.match(read('storycamp-reader.html'), /back\.href=koreanStoryLanding/, 'Korean Story Camp reader must return to its own camp');
assert.match(read('vocalcamp-player.js'), /koreanLearning\?'K-korean-vocal-camp\.html'/, 'Korean Vocal Camp player must return to its own camp');
for (const suffix of ['library', 'player', 'essays']) {
  const file = `korean-audio-${suffix}.html`;
  assert.match(read(file), /location\.search\+location\.hash/, 'Legacy Korean route must preserve card and level parameters');
}

console.log(`PASS: ${lessons.length} Korean audio cards, 12 level routes, both collections, camps and legacy routes keep their correct Korean parent.`);
