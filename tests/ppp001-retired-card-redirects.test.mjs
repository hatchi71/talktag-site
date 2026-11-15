import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  retired001Redirects,
  resolveRetired001CardId,
  canonicalRetired001Url
} from '../src/retired-001-card-redirects.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const retiredIds = JSON.parse(readFileSync(`${root}/docs/releases/ppp001-old-ids.json`, 'utf8')).oldProtectedCardIds;
const catalogScript = readFileSync(`${root}/public/catalog-metadata.js`, 'utf8');

function publishedIds(pathname) {
  const page = { window: {}, location: { pathname } };
  runInNewContext(catalogScript, page);
  const ids = new Set([
    ...page.window.TalkTagAudioLessons.filter(card => card.available !== false).map(card => card.id),
    ...page.window.TalkTagReadableCatalog.filter(card => card.status === 'published').map(card => card.id)
  ]);
  for (const camp of ['VOCAL', 'STORY']) {
    for (const family of page.window[`TALKTAG_${camp}CAMP_MANIFEST`].families) {
      if (family.status === 'published' && family.cardIds) Object.values(family.cardIds).forEach(id => ids.add(id));
    }
  }
  return ids;
}

test('every audited retired 001 link reaches a published replacement', () => {
  const active = new Set([...publishedIds('/E-english.html'), ...publishedIds('/K-korean.html')]);
  assert.equal(retiredIds.length, 67);
  assert.deepEqual(Object.keys(retired001Redirects).sort(), [...retiredIds].sort());
  for (const oldId of retiredIds) {
    const replacement = resolveRetired001CardId(oldId);
    assert.notEqual(replacement, oldId, `unmapped retired card: ${oldId}`);
    assert.ok(active.has(replacement), `replacement is not in the published catalog: ${oldId} → ${replacement}`);
    assert.ok(!active.has(oldId), `retired card is still published: ${oldId}`);
  }
});

test('split and merged Guided L&R bookmarks keep their matching replacement part', () => {
  assert.equal(resolveRetired001CardId('guided-c1-01'), 'en-guided-c1-001-ppp-v2-part1');
  assert.equal(resolveRetired001CardId('guided-c2-01'), 'en-guided-c2-001-ppp-v2-part1');
  assert.equal(resolveRetired001CardId('ko-guided-b1-001-part2'), 'ko-guided-b1-001-ppp-v2');
  for (const level of ['b2', 'c1', 'c2']) {
    assert.equal(resolveRetired001CardId(`ko-guided-${level}-001-part2`), `ko-guided-${level}-001-ppp-v2-part2`);
  }
});

test('canonical URL keeps other query parameters and the fragment', () => {
  const old = 'https://talktag.co.kr/protected-card.html?id=ko-guided-b2-001-part2&access-index=1&source=bookmark#practice';
  const canonical = canonicalRetired001Url(old);
  assert.equal(canonical.searchParams.get('id'), 'ko-guided-b2-001-ppp-v2-part2');
  assert.equal(canonical.searchParams.get('access-index'), '1');
  assert.equal(canonical.searchParams.get('source'), 'bookmark');
  assert.equal(canonical.hash, '#practice');
  assert.equal(canonicalRetired001Url('https://talktag.co.kr/protected-card.html?id=ko-guided-a1-002'), null);
});
