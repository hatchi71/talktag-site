#!/usr/bin/env node
/* Build the five new 001 data modules from one authored source and aligned meanings. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'content/bootcamp-001-short-stories.draft.md'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/bootcamp-001-v3-meanings.js'), 'utf8'), sandbox);
const meanings = sandbox.window.TalkTagBootCamp001Meanings;
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const specs = {
  enVocal: { heading: 'English Vocal Camp 001', size: 3, title: 'The Spare Glove', slug: 'the-spare-glove', theme: 'Find a lost glove, check its owner, and return it.', language: 'en' },
  enStory: { heading: 'English Story Camp 001', size: 5, title: 'The Library Note', slug: 'the-library-note', theme: 'Respect a private note found inside a library book.', language: 'en' },
  koVocal: { heading: 'Korean Vocal Camp 001', size: 3, title: 'The Umbrella at the Stop', slug: 'the-umbrella-at-the-stop', theme: 'Ask who owns an umbrella before returning it.', language: 'ko' },
  koStory: { heading: 'Korean Story Camp 001', size: 5, title: 'The Shared Charger', slug: 'the-shared-charger', theme: 'Find a charger and check its owner before returning it.', language: 'ko' },
  jaVocal: { heading: 'Japanese Vocal Camp 001', size: 3, title: '수업이 끝난 뒤의 공책', slug: 'notebook-after-class', theme: '수업 뒤 남은 공책의 주인을 확인하고 돌려줍니다.', language: 'ja' },
  jaStory: { heading: 'Japanese Story Camp 001', size: 5, title: '빌린 공책', slug: 'the-borrowed-notebook', theme: '잊은 공책을 빌려주고, 그 공책으로 다음 시간에 함께 복습합니다.', language: 'ja' }
};
function rows(spec) {
  const section = source.split(/^## /m).find(part => part.startsWith(spec.heading));
  if (!section) throw Error(`Missing ${spec.heading}`);
  const data = Object.fromEntries(section.split('\n').filter(line => /^\| (A1|A2|B1|B2|C1|C2) \|/u.test(line))
    .map(row => { const [level, ...texts] = row.split('|').slice(1, -1).map(x => x.trim()); return [level, texts]; }));
  for (const level of levels) if (data[level]?.length !== spec.size) throw Error(`${spec.heading}/${level}: wrong unit count`);
  return data;
}
const data = Object.fromEntries(Object.entries(specs).map(([key, spec]) => [key, rows(spec)]));
for (const [key, spec] of Object.entries(specs)) for (const level of levels) {
  if (meanings[key][level]?.length !== spec.size) throw Error(`${key}/${level}: meaning count mismatch`);
}
for (const level of levels) if (meanings.jaStoryReadings[level]?.length !== 5) throw Error(`jaStoryReadings/${level}: reading count mismatch`);
function write(relative, text) {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), text);
}
function js(name, value) { return `/* Generated from the approved short-story source; edit the source and rebuild. */\nwindow.${name} = ${JSON.stringify(value, null, 2)};\n`; }
const variants = {
  en: JSON.parse(fs.readFileSync(path.join(root, 'audio/vocalcamp/short-001-v3/manifest.json'), 'utf8')),
  ko: JSON.parse(fs.readFileSync(path.join(root, 'audio/korean/vocalcamp/short-001-v3/manifest.json'), 'utf8')),
  ja: JSON.parse(fs.readFileSync(path.join(root, 'audio/japanese/vocalcamp/short-001-v3/manifest.json'), 'utf8'))
};
function audioSteps(language, level) {
  const card = variants[language].cards.find(card => card.level === level);
  if (!card || card.lines.map(line => line.text).some((text, index) => text !== data[`${language}Vocal`][level][index]))
    throw Error(`${language}/${level}: audio and script mismatch`);
  return card.steps.map(step => { const normal = step.variants.find(item => item.ratio === 2.5); return { step: step.step, url: normal.audio, duration: normal.durationSeconds }; });
}
const enVocal = { version: '2026-10-23-short-001-v3', families: [{ number: '001', ...specs.enVocal,
  audioStatus: 'ready', status: 'published', levels: Object.fromEntries(levels.map(level => [level, {
    status: 'ready', lines: data.enVocal[level], translation: meanings.enVocal[level], audioSteps: audioSteps('en', level)
  }])) }] };
delete enVocal.families[0].heading; delete enVocal.families[0].size; delete enVocal.families[0].language;
const koVocal = { version: '2026-10-23-short-001-v3', families: [{ number: '001', ...specs.koVocal,
  audioStatus: 'ready', status: 'published', levels: levels.slice(), levelsData: Object.fromEntries(levels.map(level => [level, {
    status: 'ready', lines: data.koVocal[level], translation: meanings.koVocal[level], audioSteps: audioSteps('ko', level)
  }])) }] };
delete koVocal.families[0].heading; delete koVocal.families[0].size; delete koVocal.families[0].language;
const enStory = { version: '2026-10-23-short-001-v3', families: [{ number:'001', ...specs.enStory,
  status:'published', levels: Object.fromEntries(levels.map(level => [level, {lines:data.enStory[level]}])) }] };
delete enStory.families[0].heading; delete enStory.families[0].size; delete enStory.families[0].language;
const koStory = { version:'2026-10-23-short-001-v3', families:[{ number:'001', ...specs.koStory,
  status:'published', levels:Object.fromEntries(levels.map(level => [level,{lines:data.koStory[level],meanings:meanings.koStory[level]}])) }] };
delete koStory.families[0].heading; delete koStory.families[0].size; delete koStory.families[0].language;
const jaCatalog = { version:'2026-10-23-short-001-v3', families:[{ number:'001', title:specs.jaVocal.title,
  japaneseTitle:'教室のノート', theme:specs.jaVocal.theme, status:'published', audioStatus:'ready', levels:levels.slice() }] };
write('content/vocalcamp/001.js', js('TALKTAG_VOCALCAMP',enVocal));
write('content/vocalcamp-korean-001.js', js('TALKTAG_VOCALCAMP_KOREAN',koVocal));
write('content/storycamp/001.js', js('TALKTAG_STORYCAMP',enStory));
write('content/storycamp-korean/001.js', js('TALKTAG_STORYCAMP_KOREAN',koStory));
write('content/vocalcamp-japanese-001.js', js('TALKTAG_VOCALCAMP_JAPANESE',jaCatalog));
const jaStory = { version:'2026-10-23-short-001-v3', families:[{ number:'001', title:specs.jaStory.title,
  japaneseTitle:'借りたノート', theme:specs.jaStory.theme, status:'published', levels:Object.fromEntries(levels.map(level => [level, {
    lines:data.jaStory[level], readings:meanings.jaStoryReadings[level], meanings:meanings.jaStory[level]
  }])) }] };
write('content/storycamp-japanese-001.js', js('TALKTAG_STORYCAMP_JAPANESE',jaStory));
write('content/bootcamp-001-v3-story-ko.js', `/* New aligned Korean meanings for English Story Camp 001. */\nwindow.TalkTagBootCampKorean ||= {storycamp:{}}; window.TalkTagBootCampKorean.storycamp ||= {}; window.TalkTagBootCampKorean.storycamp['001'] = ${JSON.stringify(meanings.enStory,null,2)};\n`);
const catalog = (spec, type) => ({version:'2026-10-23-short-001-v3',range:{first:'001',last:'001'},families:[{
  number:'001',slug:spec.slug,title:spec.title,theme:spec.theme,levels:levels.slice(),status:'published',
  ...(type==='vocal'?{audioStatus:'ready'}:{})
}]});
write('vocalcamp-manifest.js', js('TALKTAG_VOCALCAMP_MANIFEST',catalog(specs.enVocal,'vocal')));
write('storycamp-manifest.js', js('TALKTAG_STORYCAMP_MANIFEST',catalog(specs.enStory,'story')));
console.log('Built new 001 source modules: English/Korean Vocal & Story, Japanese Vocal & Story.');
