import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildPack, finalCardId, mergeAudioPipeline, mergeEditorialOverlay, normalizeDraft } from '../scripts/build-ppp001-payloads.mjs';
import { bridgeReleaseMedia } from '../scripts/bridge-ppp001-release-media.mjs';

test('mixed authoring shapes become new, hidden, reference-free card payloads', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-builder-'));
  const a0 = join(folder, 'en-a0-001.json');
  writeFileSync(a0, JSON.stringify({
    episode: '001', targetLanguage: 'en', level: 'A0',
    references: [{ path: '/private/reference.md', passage: 'DO NOT RELEASE THIS PASSAGE' }],
    cards: { guided: { targetExpression: 'Hello!', meaning: '안녕하세요!', modelCycles: 5, title: 'Hello at the Door' } }
  }));
  const flat = join(folder, 'ko-b1-001.draft.json');
  const unit = { id: 'u1', source: '안녕하세요.', meaning: 'Hello.' };
  writeFileSync(flat, JSON.stringify({
    episode: '001', language: 'ko', level: 'B1', title: '첫 만남',
    sourceGuidance: 'DO NOT RELEASE THIS PASSAGE',
    readable: { paragraphs: [unit] }, glr: { lines: [unit] },
    miniTalks: { turns: [{ ...unit, speaker: 'mina' }] },
    vocalCamp: { units: [unit] }, storyCamp: { units: [unit] }
  }));
  assert.equal(normalizeDraft(flat).cards.guided.lines[0].target, '안녕하세요.');
  assert.equal(normalizeDraft(a0).cards.guided.lines[0].id, 'g1');
  const pack = buildPack([flat, a0]);
  assert.equal(pack.rows.length, 6);
  assert.equal(pack.releaseReady, false);
  assert(pack.rows.every(row => row.card.published === false && row.card.catalog_visible === false));
  assert(pack.rows.every(row => row.card.card_id.endsWith('-ppp-v2')));
  assert(!JSON.stringify(pack).includes('DO NOT RELEASE THIS PASSAGE'));
  assert(!JSON.stringify(pack).includes('/private/reference.md'));
  const vocal = pack.rows.find(row => row.card.area === 'vocal-camp');
  assert.equal(vocal.content.payload.lesson.lines[0].text, '안녕하세요.');
  assert.equal(vocal.content.payload.lesson.steps[0].variants.length, 0);
});

test('Readable payloads use complete paragraph translations when the draft also has a short summary', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-full-readable-'));
  const file = join(folder, 'en-c1-001.json');
  writeFileSync(file, JSON.stringify({ episode: '001', language: 'en', level: 'C1',
    readable: { paragraphs: [{ id: 'r1', text: 'The chair wobbled. Nora checked the joint.',
      meaning: '의자가 흔들렸다.',
      supportTranslation: '의자가 흔들렸다. 노라는 접합부를 확인했다.' }] },
    guidedListenRepeat: { lines: [{ id: 'g1', text: 'It wobbles.', meaning: '흔들려요.' }] },
    miniTalks: { turns: [{ id: 'm1', text: 'Let me check.', meaning: '확인할게요.' }] },
    vocalCamp: { units: [{ id: 'v1', text: 'I checked it.', meaning: '확인했어요.' }] },
    storyCamp: { units: [{ id: 's1', text: 'Nora checked.', meaning: '노라가 확인했어요.' }] } }));
  assert.equal(normalizeDraft(file).cards.readable.lines[0].meaning,
    '의자가 흔들렸다. 노라는 접합부를 확인했다.');
});

test('pipeline records map split parts and cumulative Vocal variants by stable IDs', () => {
  const guided = finalCardId('en', 'A1', 'guided');
  const vocal = finalCardId('ko', 'A1', 'vocalCamp');
  const record = (id, fields) => ({ id, audioPath: '/private/audio.mp3',
    sha256: 'a'.repeat(64), bytes: 100, durationSeconds: 12,
    sourceHash: 'b'.repeat(64), ...fields });
  const merged = mergeAudioPipeline({ schemaVersion: 1, cards: {} }, { episode: '001', cards: [
    record(guided, { partIndex: 1, partCount: 2, training: { cues: [{ i: 0 }] } }),
    record(guided, { partIndex: 2, partCount: 2, training: { cues: [{ i: 0 }] } }),
    record(vocal, { stage: 1, ratio: 2.5 }),
    record(vocal, { stage: 1, ratio: 3.0 })
  ] });
  assert.deepEqual(merged.cards[guided].parts.map(part => part.sourceIndices), [[0], [1]]);
  assert(merged.cards[guided].parts[0].audio.main.r2Key.includes('/part1/main/'));
  assert(merged.cards[vocal].audio.clip_001);
  assert(merged.cards[vocal].audio.clip_001_3_0);
});

test('duplicate language/level drafts are rejected before a staging pack is produced', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-duplicate-'));
  const source = { episode: '001', targetLanguage: 'en', level: 'A0',
    cards: { guided: { targetExpression: 'Hello!', meaning: '안녕하세요!' } } };
  const first = join(folder, 'one.json');
  const second = join(folder, 'two.json');
  writeFileSync(first, JSON.stringify(source));
  writeFileSync(second, JSON.stringify(source));
  assert.throws(() => buildPack([first, second]), /Duplicate source en:A0/);
});

test('English and Korean share the optimized scene while frozen Readable support stays provisional', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-support-'));
  const sources = [
    { lang: 'en', source: 'Maya enters the art room.', meaning: '마야가 미술 교실에 들어와요.' },
    { lang: 'ko', source: '마야가 미술 교실에 들어와요.', meaning: 'Maya enters the art room.' }
  ];
  const drafts = sources.map(({ lang, source, meaning }) => {
    const file = join(folder, `${lang}-a1-001.json`);
    writeFileSync(file, JSON.stringify({ episode: '001', targetLanguage: lang, level: 'A1',
      cards: Object.fromEntries(['readable', 'guided', 'miniTalks', 'vocalCamp', 'storyCamp'].map(area =>
        [area, { [area === 'readable' ? 'paragraphs' : area === 'guided' ? 'lines'
          : area === 'miniTalks' ? 'turns' : 'units']: [{ id: 'p1', text: source, meaning }] }])) }));
    return file;
  });
  const support = join(folder, 'readable-support.json');
  writeFileSync(support, JSON.stringify({ schemaVersion: 1, episode: '001', cards: sources.map(
    ({ lang, source, meaning }) => ({ cardId: finalCardId(lang, 'A1', 'readable'),
      sourceLanguage: lang, sourceLineIds: ['p1'], source: [source],
      sourceHash: createHash('sha256').update(source).digest('hex'),
      translations: { [lang === 'en' ? 'ko' : 'en']: [meaning] },
      review: { [lang === 'en' ? 'ko' : 'en']: {
        status: 'ai-editorial-draft-unreviewed', displayEligible: false } },
      pairedMirrorId: finalCardId(lang === 'en' ? 'ko' : 'en', 'A1', 'readable') })) }));
  const pack = buildPack(drafts, undefined, null, [support]);
  const pair = pack.rows.filter(row => row.card.area === 'readable');
  assert.equal(pair.length, 2);
  assert.deepEqual(pair.map(row => row.artworkCandidate.path),
    ['/assets/ppp001-scenes/001-a1.jpg', '/assets/ppp001-scenes/001-a1.jpg']);
  assert(pair.every(row => row.readableReview.reviewStatus === 'ai-editorial-draft-unreviewed'));
  assert(pair.every(row => row.content.payload.artwork === undefined));
  assert(pack.issues.some(issue => issue.includes('bilingual Readable editorial review pending')));
  assert.equal(pack.releaseReady, false);
  const broken = JSON.parse(readFileSync(support, 'utf8'));
  broken.cards[0].translations.ko[0] = '다른 번역';
  writeFileSync(support, JSON.stringify(broken));
  assert.throws(() => buildPack(drafts, undefined, null, [support]), /translation differs from frozen draft/);
});

test('editorial approval rejects a changed script and never overwrites audio', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-signed-'));
  const file = join(folder, 'en-a0-001.json');
  writeFileSync(file, JSON.stringify({ episode: '001', targetLanguage: 'en', level: 'A0',
    cards: { guided: { targetExpression: 'Hello!', meaning: '안녕하세요!' } } }));
  const draft = normalizeDraft(file), card = draft.cards.guided;
  const signed = { schemaVersion: 1, release: 'PPP001-20261114',
    reviewType: 'Codex AI editorial; not human or native review',
    cards: { [card.id]: { sourceDraftSha256: draft.sha256,
      targetSourceSha256: createHash('sha256').update('Hello!').digest('hex'),
      targetIds: ['g1'], editorialApproved: true, editorialQcRecord: 'AI sign-off',
      rightsApproved: true, rightsQcRecord: 'AI rights screen',
      artwork: { publicPath: '/assets/ppp001-scenes/001-a0.jpg', alt: 'A greeting.',
        scriptPictureApproved: true, qcRecord: 'AI visual review' } } } };
  const audio = { main: { localFile: '/private/unchanged.mp3' } };
  const result = mergeEditorialOverlay({ schemaVersion: 1, cards: { [card.id]: { audio } } }, signed, [draft]);
  assert.deepEqual(result.cards[card.id].audio, audio);
  assert.equal(result.cards[card.id].editorialApproved, true);
  writeFileSync(file, JSON.stringify({ episode: '001', targetLanguage: 'en', level: 'A0',
    cards: { guided: { targetExpression: 'Goodbye!', meaning: '안녕히 가세요!' } } }));
  assert.throws(() => mergeEditorialOverlay({ schemaVersion: 1, cards: {} }, signed,
    [normalizeDraft(file)]), /does not match current script/);
});

test('audio bridge requires one decoded QC pass per checksum-matching file', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ppp001-audio-'));
  const file = join(folder, 'clip.mp3'), bytes = Buffer.from('fixture-audio');
  writeFileSync(file, bytes);
  const item = { id: 'ppp001-en-a1-glr', language: 'en', level: 'A1', track: 'glr',
    partIndex: 1, partCount: 1, sentenceOffset: 0,
    lines: [{ id: 'g1', text: 'Hello!', meaning: '안녕하세요!' }], audioPath: file,
    sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    durationSeconds: 1.5, training: { cues: [{ s: 0, voiceEnd: .4, e: 1, i: 0, r: 1 }] } };
  const assembly = { schemaVersion: 1, episode: '001', status: 'technical-preview-not-publishable', audio: [item] };
  const qc = { schemaVersion: 1, counts: { pass: 1 }, records: [{ id: item.id,
    language: 'en', level: 'A1', track: 'glr', partIndex: 1, status: 'pass', durationSeconds: 1.5 }] };
  const bridged = bridgeReleaseMedia(assembly, qc, 'a'.repeat(64));
  assert.equal(bridged.status, 'technical-preview-not-publishable');
  assert.equal(bridged.cards[0].id, finalCardId('en', 'A1', 'guided'));
  qc.records[0].status = 'fail';
  assert.throws(() => bridgeReleaseMedia(assembly, qc, 'a'.repeat(64)), /passing decoded QC/);
  qc.records[0].status = 'pass'; item.bytes++;
  assert.throws(() => bridgeReleaseMedia(assembly, qc, 'a'.repeat(64)), /checksum or bytes changed/);
});
