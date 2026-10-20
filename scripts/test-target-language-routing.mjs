import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const routing = fs.readFileSync(new URL('target-language-routing.js', root), 'utf8');
const theme = fs.readFileSync(new URL('talktag-theme.js', root), 'utf8');

function visit(path, search = '', saved = null) {
  const values = new Map(saved ? [['talktag.targetLanguage', saved]] : []);
  const redirects = [];
  const listeners = {};
  const url = new URL(`https://talktag.co.kr${path}${search}`);
  const location = { pathname: path, search, hash: '', href: url.href, replace: destination => redirects.push(destination) };
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const context = { window: { location, localStorage: storage }, location, localStorage: storage,
    navigator: { language: 'en-US', languages: ['en-US'] }, URL, URLSearchParams,
    document: { addEventListener: (event, listener) => { listeners[event] = listener; } } };
  vm.runInNewContext(routing, context);
  return { values, redirects, listeners };
}

for (const [language, destination] of [
  ['english', '/E-english.html'], ['korean', null], ['japanese', '/japanese/J-index.html']
]) {
  const launch = visit('/', '?source=pwa', language);
  assert.deepEqual(launch.redirects, destination ? [destination] : [], `${language} PWA launch`);
}
assert.deepEqual(visit('/', '', 'english').redirects, ['/E-english.html']);
assert.deepEqual(visit('/', '?view=talktag', 'english').redirects, [], 'Explicit root query must stay on root');
assert.deepEqual(visit('/audio-library.html', '?type=guided&level=A2', 'korean').redirects, [], 'Deep link must remain stable');

// Stop the larger shared-theme script immediately after its language recorder.
// The rest of that script manages unrelated UI and needs a browser DOM.
for (const [path, search, language] of [
  ['/audio-library.html', '?type=guided&level=A2', 'english'],
  ['/audio-player.html', '?id=guided-a2-08-miniskit', 'english'],
  ['/K-korean-audio-player.html', '?id=ko-guided-a1-003', 'korean'],
  ['/vocalcamp-player.html', '?lang=ko', 'korean'],
  ['/japanese/J-guided.html', '', 'japanese'],
  ['/', '?source=pwa', null]
]) {
  const values = new Map();
  const context = { location: { pathname: path, search }, URLSearchParams,
    localStorage: { setItem: (key, value) => values.set(key, value) },
    document: { querySelector: () => { throw Error('theme UI reached'); } } };
  assert.throws(() => vm.runInNewContext(theme, context), /theme UI reached/);
  assert.equal(values.get('talktag.targetLanguage') ?? null, language, `Recent language for ${path}${search}`);
}

console.log('PASS: PWA launch follows recent English/Korean/Japanese use; direct links and explicit root views stay stable.');
