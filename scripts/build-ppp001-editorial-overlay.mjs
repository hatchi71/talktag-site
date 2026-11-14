#!/usr/bin/env node
// Turns a private, per-card AI editorial record into checksum-bound staging
// approvals. It does not publish, upload, or change audio assembly data.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDraft } from './build-ppp001-payloads.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
const alt = {
  A0: { en: 'Maya arrives at the art room and Minjae greets her at the door.',
    ko: '마야가 미술 모임에 도착하고 민재가 문 앞에서 맞이합니다.' },
  A1: { en: 'Maya and Jun sketch a blue cup together at a drawing class.',
    ko: '마야와 준이 그림 수업에서 파란 컵을 함께 그립니다.' },
  A2: { en: 'Maya, Jun and Mina discuss a park event poster with a dark blue title.',
    ko: '마야, 준, 미나가 진한 파란색 제목이 있는 공원 행사 포스터를 의논합니다.' },
  B1: { en: 'Friends check a planting list and rain faded herb labels in a garden.',
    ko: '친구들이 정원에서 심기 목록과 비에 번진 허브 표지를 확인합니다.' },
  B2: { en: 'Three library staff discuss a floor plan and a clear route around a cart.',
    ko: '도서관 직원 세 명이 평면도와 카트 주변의 통로를 의논합니다.' },
  C1: { en: 'Min, Nora and Imran examine a tagged folding chair in a repair room.',
    ko: '민, 노라, 임란이 수리실에서 표지가 붙은 접이식 의자를 살펴봅니다.' },
  C2: { en: 'Four planners review a deadline, room layout and name cards.',
    ko: '기획자 네 명이 마감일, 공간 배치, 이름표를 검토합니다.' }
};

export function buildEditorialOverlay(signoff, signoffSha) {
  if (signoff.cardCount !== 64 || !Array.isArray(signoff.cards)
    || signoff.cards.length !== 64 || signoff.humanNativeReviewClaimed !== false)
    fail('Expected 64 explicitly AI reviewed PPP001 cards');
  const cards = {}, sceneByLevel = new Map();
  for (const item of signoff.cards) {
    const id = item.cardId;
    if (!/^(?:en-|ko-|mt-en-|mt-ko-)[a-z0-9-]+-001-ppp-v2$/.test(id) || cards[id])
      fail(`Unexpected or duplicate signed card ${id}`);
    const draft = normalizeDraft(item.sourceDraft);
    const card = Object.values(draft.cards).find(value => value.id === id);
    const targetSourceSha256 = card && hash(card.lines.map(line => line.target.trim()).join('\n'));
    if (!card || draft.sha256 !== item.sourceDraftSha256
      || targetSourceSha256 !== item.targetSourceSha256
      || JSON.stringify(card.lines.map(line => line.id)) !== JSON.stringify(item.targetIds)
      || card.lines.length !== item.unitCount || item.translationOrMeaning?.complete !== true
      || item.translationOrMeaning?.unitCount !== card.lines.length)
      fail(`${id}: signed source, unit IDs, or meaning alignment is stale`);
    if (item.editorialDecision !== 'AI editorial pass' || item.notHumanOrNativeReview !== true
      || item.sourceRightsReview?.result !== 'AI editorial screen pass'
      || item.sourceRightsReview?.privateMarkdownReferencesExist !== true
      || item.sourceRightsReview?.referenceFilesArePublic !== false
      || item.pictureReview?.result !== 'AI visual scene match pass'
      || item.pictureReview?.sharedAssetAcrossEnglishKorean !== true)
      fail(`${id}: per-card editorial, rights, or picture sign-off is incomplete`);
    const scene = resolve(repository, `public/assets/ppp001-scenes/001-${draft.level.toLowerCase()}.jpg`);
    if (resolve(item.pictureReview.asset) !== scene || !existsSync(scene)
      || hash(readFileSync(scene)) !== item.pictureReview.sha256
      || statSync(scene).size !== item.pictureReview.bytes)
      fail(`${id}: scene no longer matches its AI visual review`);
    const previous = sceneByLevel.get(draft.level);
    if (previous && previous !== item.pictureReview.sha256)
      fail(`${draft.level}: language pair does not share one approved scene`);
    sceneByLevel.set(draft.level, item.pictureReview.sha256);
    const evidence = `PPP001 per-card Codex AI sign-off ${signoffSha}#${id}`;
    cards[id] = {
      sourceDraftSha256: draft.sha256, targetSourceSha256,
      targetIds: [...item.targetIds],
      editorialApproved: true,
      editorialQcRecord: `${evidence}; AI editorial review only`,
      ...(card.area === 'readable' ? { readableSupportApproval: {
        status: 'ai-editorial-approved', displayEligible: true,
        nativeReviewed: false,
        editorialQcRecord: `${evidence}; full paragraph-aligned AI translation review`
      } } : {}),
      rightsApproved: true,
      rightsQcRecord: `${evidence}; AI originality/provenance screen, not legal clearance`,
      artwork: { publicPath: `/assets/ppp001-scenes/001-${draft.level.toLowerCase()}.jpg`,
        sha256: item.pictureReview.sha256, bytes: item.pictureReview.bytes,
        alt: alt[draft.level][draft.language], scriptPictureApproved: true,
        qcRecord: `${evidence}; AI visual script-picture match` }
    };
  }
  for (const language of ['en', 'ko']) for (const level of Object.keys(alt)) {
    const count = Object.keys(cards).filter(id => id.startsWith(`${language}-`) || id.startsWith(`mt-${language}-`))
      .filter(id => id.includes(`-${level.toLowerCase()}-001-`)).length;
    if (count !== (level === 'A0' ? 2 : 5)) fail(`${language} ${level}: incomplete signed card set`);
  }
  return { schemaVersion: 1, release: 'PPP001-20261114',
    reviewType: 'Codex AI editorial; not human or native review',
    sourceSha256: signoffSha, cardCount: 64, cards };
}

function main(argv) {
  let input, output;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--signoff') input = resolve(argv[++i] || fail('--signoff requires a file'));
    else if (argv[i] === '--out') output = resolve(argv[++i] || fail('--out requires a file'));
    else fail(`Unknown argument ${argv[i]}`);
  }
  if (!input || !output || output === repository || output.startsWith(`${repository}/`))
    fail('Use --signoff and an output path outside the public site repository');
  const bytes = readFileSync(input);
  const overlay = buildEditorialOverlay(JSON.parse(bytes.toString('utf8')), hash(bytes));
  writeFileSync(output, `${JSON.stringify(overlay, null, 2)}\n`);
  console.log(`Prepared checksum-bound AI editorial overlay for ${overlay.cardCount} PPP001 cards.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`PPP001 overlay failed: ${error.message}`); process.exitCode = 1; }
}
