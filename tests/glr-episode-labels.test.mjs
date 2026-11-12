import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
const metadata = read('catalog-metadata.js');
const numbering = read('glr-episode-labels.js');
const routes = [
  { library: 'audio-library.html', player: 'audio-player.html', renderer: 'audio-library.js' },
  { library: 'K-korean-audio-library.html', player: 'K-korean-audio-player.html', renderer: 'native-audio-library.js', language: 'ko', ui: 'en' },
  { library: 'japanese/J-guided.html', player: 'J-glr-player.html', renderer: 'native-audio-library.js', language: 'ja', ui: 'ko' },
];

function renderLevel(route, level, catalog, completed) {
  const element = () => ({
    dataset: {}, classList: { add() {}, toggle() {} },
    querySelectorAll: () => [], setAttribute() {}, append() {}, before() {}, addEventListener() {},
  });
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {
      body: element(), getElementById, createElement: element, querySelector: element, querySelectorAll: () => [],
    },
    location: { search: `?type=guided&level=${level}` }, URLSearchParams,
    window: {
      TalkTagAudioLessons: catalog, addEventListener() {},
      TalkTagNative: route.language && {
        language: route.language, ui: route.ui, libraryPage: route.library, playerPage: route.player,
      },
      TalkTagCompletion: { getManual: id => completed.has(id), mount() {} },
    },
  });
  vm.runInContext(numbering, context);
  vm.runInContext(read(route.renderer), context);
  return { list: getElementById('lessonList').innerHTML, shelf: getElementById('audioMissionList').innerHTML };
}

for (const route of routes) {
  test(`${route.library} uses three-digit Guided L&R episode labels in the list and completion shelf`, () => {
    const source = read(route.library);
    assert.match(source, new RegExp(`glr-episode-labels\\.js\\?[^\"]+\" defer></script>\\s*<script src=\"/?${route.renderer.replace('.', '\\.')}\\?`));
    const data = vm.createContext({ window: {}, location: { pathname: `/${route.library}` } });
    vm.runInContext(metadata, data);
    const catalog = data.window.TalkTagAudioLessons.filter(card => card.type === 'guided' && card.available !== false);
    for (const level of new Set(catalog.map(card => card.level))) {
      const cards = catalog.filter(card => card.level === level);
      const completed = new Set(cards.filter((_, i) => i % 2 === 1).map(card => `audio:${card.id}`));
      const { list, shelf } = renderLevel(route, level, catalog, completed);
      for (const card of cards) {
        const peers = cards.filter(peer => peer.unit === card.unit);
        const part = card.partIndex ?? peers.indexOf(card) + 1;
        const base = String(card.unit).padStart(3, '0');
        const label = peers.length > 1 ? `${base}–${String(part).padStart(2, '0')}` : base;
        const href = `${route.player}?id=${encodeURIComponent(card.id)}&access-index=${card.unit}`;
        if (completed.has(`audio:${card.id}`)) {
          assert.ok(shelf.includes(`href="${href}"><small>${label}</small>`), card.id);
          assert.ok(shelf.includes(`data-undo="${card.id}"`), card.id);
          assert.ok(!list.includes(`data-completion-id="audio:${card.id}"`), card.id);
        } else {
          const article = list.split(`data-completion-id="audio:${card.id}"`)[1]?.split('</article>')[0];
          assert.ok(article?.includes(`href="${href}"><span class="audio-lesson-number">${label}</span>`), card.id);
        }
      }
    }
  });
}

test('Guided L&R numbering handles 001, 100 and 999 and groups only within one level', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(numbering, context);
  const cards = [
    { id: 'first', level: 'A1', unit: 1, partIndex: 1 },
    { id: 'second', level: 'B1', unit: 1, partIndex: 2 },
    { id: 'hundred-a', level: 'A1', unit: 100 },
    { id: 'hundred-b', level: 'A1', unit: 100 },
    { id: 'last', level: 'A1', unit: 999 },
  ];
  const labels = context.window.TalkTagGLREpisodeLabels(cards, card => card.unit);
  assert.deepEqual([...labels.values()], ['001', '001', '100–01', '100–02', '999']);
});
