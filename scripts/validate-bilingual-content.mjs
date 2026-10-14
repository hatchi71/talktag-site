#!/usr/bin/env node
/**
 * Structural guardrail for learner-facing bilingual content.
 * Linguistic review remains a human editorial task; this prevents a reviewed
 * translation, reading, or source line from being omitted or misaligned.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => { throw new Error(message); };
const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) fail(`Missing ${label}`);
};

let checked = 0;

const miniSkits = readJson('content/guided-miniskit-008-010-a2-c2.json');
for (const card of miniSkits.cards) {
  for (const [index, pair] of card.utterances.entries()) {
    if (!Array.isArray(pair) || pair.length !== 2) fail(`MiniSkit ${card.episode}/${card.level}/${index + 1} is not a source/support pair`);
    requiredText(pair[0], `MiniSkit English ${card.episode}/${card.level}/${index + 1}`);
    requiredText(pair[1], `MiniSkit Korean ${card.episode}/${card.level}/${index + 1}`);
    checked += 1;
  }
}

const koreanGuided = readJson('content/native-glr-ko-002.json');
for (const card of koreanGuided.cards) {
  for (const [index, line] of card.lines.entries()) {
    requiredText(line.ko, `Korean GLR Korean ${card.level}/${index + 1}`);
    requiredText(line.en, `Korean GLR English support ${card.level}/${index + 1}`);
    checked += 1;
  }
}

const koreanVocal = readJson('content/vocalcamp-korean-001-scripts.json');
for (const [level, card] of Object.entries(koreanVocal.levels)) {
  for (const [index, line] of card.lines.entries()) {
    requiredText(line.ko, `Korean Vocal Korean ${level}/${index + 1}`);
    requiredText(line.en, `Korean Vocal English support ${level}/${index + 1}`);
    checked += 1;
  }
}

const vocalContext = {window: {}};
vm.createContext(vocalContext);
for (const relative of ['content/vocalcamp-korean-001.js', 'content/vocalcamp-korean-002.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), vocalContext, {timeout: 1000});
}
const koreanVocal002 = vocalContext.window.TALKTAG_VOCALCAMP_KOREAN?.families?.find(family => family.number === '002');
if (!koreanVocal002 || koreanVocal002.status !== 'published' || koreanVocal002.audioStatus !== 'ready') {
  fail('Korean Vocal Camp 002 is not publish-ready');
}
for (const [level, card] of Object.entries(koreanVocal002.levelsData || {})) {
  if (!Array.isArray(card.lines) || card.lines.length !== card.translation?.length || card.lines.length !== card.audioSteps?.length) {
    fail(`Korean Vocal 002 ${level} source/support/audio steps are not aligned`);
  }
  for (const [index, line] of card.lines.entries()) {
    requiredText(line, `Korean Vocal 002 Korean ${level}/${index + 1}`);
    requiredText(card.translation[index], `Korean Vocal 002 English support ${level}/${index + 1}`);
  }
  for (const step of card.audioSteps) {
    const asset = path.join(root, step.url.split('?')[0].replace(/^\//u, ''));
    if (!fs.existsSync(asset) || fs.statSync(asset).size < 1024) fail(`Korean Vocal 002 missing audio: ${asset}`);
  }
}

const readable = readJson('content/readable/readable-stories-A1-C2-60.json');
const readableKorean = readJson('content/readable/readable-stories-ko-A1-C2-60.json');
for (const story of readable) {
  const sourceParagraphs = story.content.split(/\n\s*\n/).filter(Boolean);
  const translatedParagraphs = readableKorean[story.id];
  if (!Array.isArray(translatedParagraphs) || translatedParagraphs.length !== sourceParagraphs.length) {
    fail(`Readable ${story.id} has ${sourceParagraphs.length} English paragraphs but ${translatedParagraphs?.length ?? 0} Korean paragraphs`);
  }
  for (const [index, paragraph] of translatedParagraphs.entries()) {
    requiredText(paragraph, `Readable Korean ${story.id}/${index + 1}`);
    checked += 1;
  }
}

for (const relative of ['japanese/content/story-camp/a1-01-10.json', 'japanese/content/story-camp/a2-c2-50-stories.json']) {
  const collection = readJson(relative);
  for (const story of collection.stories) {
    for (const [index, chunk] of story.chunks.entries()) {
      requiredText(chunk.jp, `Japanese source ${story.id}/${index + 1}`);
      requiredText(chunk.reading, `Japanese reading ${story.id}/${index + 1}`);
      requiredText(chunk.ko, `Japanese Korean support ${story.id}/${index + 1}`);
      checked += 1;
    }
    for (const [index, card] of story.snowballCards.entries()) {
      for (const field of ['jp', 'reading', 'ko']) requiredText(card[field], `Japanese snowball ${story.id}/${index + 1}/${field}`);
      if (card.lines.length !== card.chunkIds.length) fail(`Japanese snowball ${story.id}/${index + 1} has mismatched line count`);
    }
  }
}

console.log(`PASS: ${checked} source/support line groups are present and aligned.`);
