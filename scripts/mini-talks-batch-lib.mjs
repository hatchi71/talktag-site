import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultWork = '/private/tmp/talktag-mini-talks-a1-a2-002-010';
export const defaultAuthoring = [
  path.join(root, 'content/mini-talks/english-a1-002-010.authoring.json'),
  path.join(root, 'content/mini-talks/english-a2-002-010.authoring.json'),
];
export const expectedIds = new Set(['a1', 'a2'].flatMap(level =>
  Array.from({length: 9}, (_, index) => `mt-en-${level}-${String(index + 2).padStart(3, '0')}`)));

export function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

export function authoringPaths() {
  const a1 = option('--a1', defaultAuthoring[0]);
  const a2 = option('--a2', defaultAuthoring[1]);
  if (!a1 || !a2) throw Error('Both --a1 and --a2 require file paths');
  return [a1, a2];
}

export function loadBatch(paths = authoringPaths()) {
  const documents = paths.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const cards = documents.flatMap(document => {
    if (document.language !== 'en' || !Array.isArray(document.cards)) throw Error('Invalid English Mini Talks document');
    return document.cards;
  });
  if (cards.length !== 18 || new Set(cards.map(card => card.id)).size !== 18 ||
      cards.some(card => !expectedIds.has(card.id))) throw Error('Expected exactly A1/A2 002–010 once each');
  const sorted = cards.sort((a, b) => a.level.localeCompare(b.level) || a.id.localeCompare(b.id));
  for (const card of sorted) {
    const match = /^mt-en-(a[12])-(00[2-9]|010)$/.exec(card.id);
    if (!match || card.level.toLowerCase() !== match[1]) throw Error(`${card.id}: ID/level mismatch`);
    if (!card.title?.trim() || !card.situation?.trim() || !card.situationKo?.trim() ||
        !card.descriptionKo?.trim() || !card.expectedOutput?.trim()) throw Error(`${card.id}: missing scene/learning brief`);
    const speakers = new Map((card.speakers || []).map(speaker => [speaker.id, speaker]));
    if (speakers.size !== card.speakers?.length || speakers.size < 2) throw Error(`${card.id}: invalid speaker cast`);
    for (const speaker of speakers.values()) {
      if (!speaker.id || !speaker.role || !speaker.gender || !speaker.accent) throw Error(`${card.id}: incomplete casting`);
    }
    if (!Array.isArray(card.lines) || card.lines.length < 4 || card.lines.length > 12 ||
        new Set(card.lines.map(line => line.id)).size !== card.lines.length) throw Error(`${card.id}: invalid dialogue lines`);
    for (const line of card.lines) {
      if (!speakers.has(line.speaker) || !line.en?.trim() || !line.ko?.trim()) {
        throw Error(`${card.id} ${line.id}: missing speaker, English, or Korean meaning`);
      }
    }
    if (!card.variationPrompt?.en?.trim() || !card.variationPrompt?.ko?.trim()) {
      throw Error(`${card.id}: missing optional practice prompt in authoring notes`);
    }
  }
  return {documents, cards: sorted};
}

export function assertAuthoringProvenance(assembly, paths = authoringPaths()) {
  if (!Array.isArray(paths) || paths.length !== 2 ||
      !assembly?.authoringSha256 ||
      Object.keys(assembly.authoringSha256).sort().join(',') !== 'a1,a2') {
    throw Error('Assembly evidence must bind both exact A1 and A2 authoring files');
  }
  for (const [index, level] of ['a1', 'a2'].entries()) {
    const recorded = assembly.authoringSha256[level];
    const actual = createHash('sha256').update(fs.readFileSync(paths[index])).digest('hex');
    if (!/^[a-f0-9]{64}$/.test(recorded) || actual !== recorded) {
      throw Error(`${level.toUpperCase()} authoring changed after audio assembly; rebuild and re-QC`);
    }
  }
}

export function assertApprovedScripts(documents) {
  for (const document of documents) {
    if (!['script-approved', 'qc-approved-for-publication'].includes(document.status)) {
      throw Error('Authoring is still a draft; approve scripts before voice generation or release');
    }
    if (document.practice?.forcedRepetitions !== 0 || document.practice?.playthroughs !== 1) {
      throw Error('Mini Talks must contain one playthrough and no forced repetitions');
    }
  }
}
