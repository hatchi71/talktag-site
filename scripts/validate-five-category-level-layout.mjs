import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const categories = [
  ['English GLR / Essays', 'audio-library.html', 'audio-library.js'],
  ['Korean GLR / Essays', 'K-korean-audio-library.html', 'native-audio-library.js'],
  ['Japanese GLR / Essays', 'japanese/J-guided.html', 'native-audio-library.js'],
  ['English Vocal / Story', 'vocal-camp.html', 'bootcamp-browser.js'],
  ['Korean Vocal / Story', 'K-korean-vocal-camp.html', 'bootcamp-browser.js'],
  ['Japanese Vocal / Story', 'japanese/J-vocal-camp.html', 'bootcamp-browser.js'],
  ['English Readable', 'readable.html', 'readable-english-library.js'],
  ['Korean Readable', 'K-korean-readable.html', 'korean-readable-library.js'],
  ['Japanese Readable', 'japanese/J-readable.html', 'japanese/studio-structure.js']
];
for (const [name, page, script] of categories) {
  assert.ok(fs.existsSync(page) && fs.existsSync(script), `${name}: route or script missing`);
}
for (const page of ['readable.html', 'K-korean-readable.html', 'japanese/J-readable.html']) {
  assert.match(read(page), /tt-level-cards/, `${page}: shared card class missing`);
}
for (const script of ['audio-library.js', 'native-audio-library.js']) {
  assert.match(read(script), /levelPicker\.classList\.add\("tt-level-cards"\)/, `${script}: shared card class missing`);
}
for (const page of ['vocal-camp.html', 'story-camp.html', 'K-korean-vocal-camp.html', 'K-korean-story-camp.html', 'japanese/J-vocal-camp.html', 'japanese/J-story-camp.html']) {
  assert.match(read(page), /bootcamp-browser\.css\?v=20261026-shared-level-cards/, `${page}: stale card styles`);
  assert.match(read(page), /bootcamp-browser\.js\?v=20261026-shared-level-cards/, `${page}: stale browser`);
}
assert.match(read('bootcamp-browser.css'), /\.camp-levels\{display:grid;grid-template-columns:repeat\(2/);
assert.match(read('bootcamp-browser.js'), /levels\)\.after\(allCompleted\)/, 'Boot Camp shelf must follow level cards');
assert.match(read('bootcamp-browser.js'), /camp-total-progress/, 'Boot Camp total progress missing');
assert.match(read('readable-english-library.js'), /levelsNav\.after\(document\.getElementById\('readableMissions'\)\)/);
assert.match(read('korean-readable-library.js'), /levelsNav\.after\(document\.getElementById\('readableMissions'\)\)/);
assert.match(read('japanese/J-readable.html'), /<details class="ja-readable-missions">/, 'Japanese preparing shelf missing');
assert.match(read('japanese/studio-structure.js'), /if\(file==='J-readable\.html'\)/, 'Legacy Japanese renderer must not overwrite Readable cards');
for (const file of ['audio-library.js', 'native-audio-library.js']) {
  assert.match(read(file), /levelPicker\.after\(missions\)/, `${file}: missions shelf must follow level picker`);
  assert.doesNotMatch(read(file), /if\(firstBins&&completed\.length\)\{toggle\.setAttribute\("aria-expanded","true"\)/, `${file}: shelf must start collapsed`);
}
console.log('PASS: shared level-card layout across all five categories and three language spaces.');
