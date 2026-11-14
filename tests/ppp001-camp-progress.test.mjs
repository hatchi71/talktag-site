import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/camp-progress.js', import.meta.url), 'utf8');

test('PPP 001 camp completion uses the protected card ID while older and Japanese IDs stay intact', () => {
  const writes = [];
  const context = { window: { TalkTagCompletion: {
    get: id => id === 'en-story-camp-b2-001-ppp-v2',
    set: (id, value) => { writes.push([id, value]); }
  } } };
  vm.runInNewContext(source, context);
  const progress = context.window.TalkTagCampProgress;
  assert.equal(progress.id('story', 'B2', '001'), 'en-story-camp-b2-001-ppp-v2');
  assert.equal(progress.id('ko-vocal', 'A1', '001'), 'ko-vocal-camp-a1-001-ppp-v2');
  assert.equal(progress.done('story', 'B2', '001'), true);
  progress.set('ko-vocal', 'A1', '001', true);
  assert.deepEqual(writes, [['ko-vocal-camp-a1-001-ppp-v2', true]]);
  assert.equal(progress.id('ja-story', 'B2', '001'), 'ja-storycamp:B2:1:short-v3');
  assert.equal(progress.id('story', 'B2', '002'), 'storycamp:B2:2');
});
