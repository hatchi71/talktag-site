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

const englishGuidedContext = {window: {}};
vm.createContext(englishGuidedContext);
vm.runInContext(fs.readFileSync(path.join(root, 'guided-miniskit-a2-c2.js'), 'utf8'), englishGuidedContext, {timeout: 1000});
for (const card of miniSkits.cards) {
  const parts = englishGuidedContext.window.TalkTagAudioLessons
    .filter(part => part.unit === card.episode && part.level === card.level)
    .sort((a, b) => a.sentenceStart - b.sentenceStart);
  const rendered = parts.flatMap(part => part.expressions.map((line, index) => [line, part.meanings[index]]));
  if (JSON.stringify(rendered) !== JSON.stringify(card.utterances)) {
    fail(`MiniSkit ${card.episode}/${card.level} published English/Korean script differs from its source`);
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

const vocalContext = {window: {}};
vm.createContext(vocalContext);
vm.runInContext(fs.readFileSync(path.join(root, 'content/vocalcamp-korean-001.js'), 'utf8'), vocalContext, {timeout: 1000});
const koreanVocal001 = vocalContext.window.TALKTAG_VOCALCAMP_KOREAN?.families?.find(family => family.number === '001');
if (!koreanVocal001 || koreanVocal001.status !== 'published' || koreanVocal001.audioStatus !== 'ready') {
  fail('New Korean Vocal Camp 001 release is inconsistent');
}
for (const [level, card] of Object.entries(koreanVocal001.levelsData || {})) {
  if (!Array.isArray(card.lines) || card.lines.length !== card.translation?.length || card.lines.length !== card.audioSteps?.length) {
    fail(`Korean Vocal 001 ${level} source/support/audio steps are not aligned`);
  }
  for (const [index, line] of card.lines.entries()) {
    requiredText(line, `Korean Vocal 001 Korean ${level}/${index + 1}`);
    requiredText(card.translation[index], `Korean Vocal 001 English support ${level}/${index + 1}`);
    checked += 1;
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

const japaneseStoryContext = {window: {}};
vm.createContext(japaneseStoryContext);
vm.runInContext(fs.readFileSync(path.join(root, 'content/storycamp-japanese-001.js'), 'utf8'), japaneseStoryContext, {timeout: 1000});
const japaneseStory = japaneseStoryContext.window.TALKTAG_STORYCAMP_JAPANESE?.families?.find(family => family.number === '001');
if (!japaneseStory || japaneseStory.status !== 'published') fail('New Japanese Story Camp 001 is missing');
for (const [level, card] of Object.entries(japaneseStory.levels)) {
  for (const field of ['lines','readings','meanings']) if (!Array.isArray(card[field]) || card[field].length !== 5) fail(`Japanese Story 001 ${level}/${field}: expected five aligned units`);
  for (let index = 0; index < 5; index += 1) {
    requiredText(card.lines[index], `Japanese Story 001 source ${level}/${index + 1}`);
    requiredText(card.readings[index], `Japanese Story 001 reading ${level}/${index + 1}`);
    requiredText(card.meanings[index], `Japanese Story 001 Korean meaning ${level}/${index + 1}`);
    checked += 1;
  }
}

console.log(`PASS: ${checked} source/support line groups are present and aligned.`);
