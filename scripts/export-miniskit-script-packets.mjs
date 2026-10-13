import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = '/Users/eungjukim/Desktop/Snowbaling자료작업실/1. TakTag 자료실/English/1. Sound Check/1. Guided Listen & Repeat';
const sourceData = JSON.parse(fs.readFileSync(path.join(root, 'content/guided-miniskit-008-010-a2-c2.json'), 'utf8'));
const vmContext = { window: {} };
vm.createContext(vmContext);
vm.runInContext(fs.readFileSync(path.join(root, 'guided-miniskit-pilots.js'), 'utf8'), vmContext);
const pilots = vmContext.window.TalkTagAudioLessons;
const folderNames = {
  8: 'TTS script 008 (American) Roger-Lauren MiniSkit',
  9: 'TTS script 009 (American-British) Roger-Alice MiniSkit',
  10: 'TTS script 010 (American-Australian) Roger-Charlie MiniSkit',
};
const archive = path.join(sourceRoot, 'Archive pre-MiniSkit replacement 2026-10-13');
fs.mkdirSync(archive, { recursive: true });

for (const [episode, oldName] of [[8, 'TTS script 008 (American) Lauren'], [9, 'TTS script 009 (Australian) Charlie'], [10, 'TTS script 010 (Indian) Meera']]) {
  const old = path.join(sourceRoot, oldName);
  const archived = path.join(archive, oldName);
  if (fs.existsSync(old) && !fs.existsSync(archived)) fs.renameSync(old, archived);
  else if (fs.existsSync(old) && fs.existsSync(archived)) throw new Error(`Refusing to overwrite backup: ${archived}`);
}

function writeCard(folder, card, source) {
  const safe = `${String(card.episode).padStart(3, '0')} ${card.title} ${card.level}`;
  const cardDir = path.join(folder, card.level);
  fs.mkdirSync(cardDir, { recursive: true });
  const speakers = sourceData.pairings[String(card.episode).padStart(3, '0')];
  const tts = card.utterances.map(([en]) => en).join('\n') + '\n';
  const transcript = card.utterances.map(([en], i) => `${String(i + 1).padStart(2, '0')} ${source.speakers?.[i] || speakers[i % 2]}: ${en}`).join('\n');
  const korean = card.utterances.map(([en, ko], i) => `${String(i + 1).padStart(2, '0')} ${source.speakers?.[i] || speakers[i % 2]}\nEN: ${en}\nKR: ${ko}`).join('\n\n') + '\n';
  const accent = card.accentTag;
  const packet = {
    schemaVersion: 1,
    episodeNumber: String(card.episode).padStart(3, '0'),
    level: card.level,
    title: card.title,
    revision: sourceData.revision,
    status: 'draft',
    accentTag: accent,
    speakers,
    scene: card.scene || source.sceneBriefing || '',
    briefing: card.briefing || '',
    playbackPolicy: {
      kind: 'sentence-repeat',
      repetitions: /^A/.test(card.level) ? 10 : /^B/.test(card.level) ? 15 : 21,
      responseGapMultiplier: 2.5,
      minimumResponseGapSeconds: 3,
      gapAfterFinalRepetition: true,
      cardDings: true,
      autoAdvanceToNextCard: false,
      audioUrl: null,
      finalAudioDurationSeconds: null,
    },
    utterances: card.utterances.map(([en, ko], i) => ({
      id: `${String(card.episode).padStart(3, '0')}-${card.level.toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
      order: i + 1,
      speaker: speakers[i % 2],
      en,
      ko,
      keyChunk: '',
      communicativeFunction: '',
      sourceStartSeconds: null,
      sourceVoiceEndSeconds: null,
    })),
  };
  fs.writeFileSync(path.join(cardDir, `${safe} (TTS).txt`), tts);
  fs.writeFileSync(path.join(cardDir, `${safe} (Dialogue Reference).txt`), `${card.title}\nScene: ${packet.scene}\nBriefing: ${packet.briefing}\nAccent: ${accent}\nSpeakers: ${speakers.join(' / ')}\n\n${transcript}\n`);
  fs.writeFileSync(path.join(cardDir, `${safe} (Korean Support).txt`), korean);
  fs.writeFileSync(path.join(cardDir, `${safe}.json`), JSON.stringify(packet, null, 2) + '\n');
}

for (const episode of [8, 9, 10]) {
  const folder = path.join(sourceRoot, folderNames[episode]);
  fs.mkdirSync(folder, { recursive: true });
  const pilot = pilots.find((p) => p.part === episode);
  const pilotCard = {
    episode,
    level: 'A1',
    title: pilot.title,
    accentTag: pilot.accentTag,
    scene: pilot.title,
    briefing: pilot.description,
    utterances: pilot.expressions.map((en, i) => [en, pilot.meanings[i]]),
  };
  writeCard(folder, pilotCard, { speakers: pilot.speakers, sceneBriefing: pilot.description });
  for (const card of sourceData.cards.filter((item) => item.episode === episode)) writeCard(folder, card, {});
  fs.writeFileSync(path.join(folder, 'README.txt'), `TalkTag Guided Listen & Repeat · MiniSkit ${String(episode).padStart(3, '0')}\nContains A1 pilot plus original A2-C2 MiniSkit scripts, Korean support, and structured draft records.\nA1/A2: 10 reps · B1/B2: 15 reps · C1/C2: 21 reps.\nEach spoken line is assigned to a speaker in the reference/JSON; the TTS file contains only spoken English.\nAudio drafts remain unpublished until final audio QC and measured timing are complete.\n`);
}

console.log(`Archived the three exact old folders under: ${archive}`);
console.log(`Exported ${sourceData.cards.length} new A2-C2 cards and the 3 retained A1 pilots to the replacement MiniSkit folders.`);
