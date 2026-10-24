#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.TALKTAG_BOOTCAMP_002_WORKDIR||'/private/tmp/talktag-english-bootcamp-002-audio';
const source=JSON.parse(fs.readFileSync(path.join(root,'content/bootcamp-002-source.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(base,'rendered/manifest.json'),'utf8'));
const uploads=JSON.parse(fs.readFileSync(path.join(base,'rendered/upload-inventory.json'),'utf8'));
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['vocalcamp-manifest.js','storycamp-manifest.js','content/vocalcamp/002.js','content/storycamp/002.js','content/bootcamp-002-story-ko.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const assert=(condition,message)=>{if(!condition)throw Error(message)};
assert(uploads.length===88,'expected exactly 88 Vocal variants');
assert(ctx.window.TALKTAG_VOCALCAMP_MANIFEST.families.some(x=>x.number==='002'&&x.status==='published'&&x.audioStatus==='ready'),'Vocal catalog missing');
assert(ctx.window.TALKTAG_STORYCAMP_MANIFEST.families.some(x=>x.number==='002'&&x.status==='published'),'Story catalog missing');
for(const card of manifest.cards){
  const level=card.level,count=level.startsWith('C')?5:3;
  assert(card.lines.length===count&&card.steps.length===count,level+' stage count');
  assert(source.vocal[level].lines.every((line,i)=>line===card.lines[i].text),level+' script/audio mismatch');
  assert(ctx.window.TALKTAG_VOCALCAMP.families[0].levels[level].translation.length===count,level+' translation mismatch');
  assert(ctx.window.TALKTAG_STORYCAMP.families[0].levels[level].lines.length===(level.startsWith('C')?7:5),level+' Story stage count');
  assert(ctx.window.TalkTagBootCampKorean.storycamp['002'][level].length===(level.startsWith('C')?7:5),level+' Story translation count');
  for(const step of card.steps){
    assert(step.variants.length===4,level+' pause variants');
    for(const variant of step.variants){
      assert(variant.cues.length===step.step,level+' cue count');
      const item=uploads.find(x=>x.audio===variant.audio);
      assert(item&&fs.existsSync(item.file),level+' missing media');
      assert(crypto.createHash('sha256').update(fs.readFileSync(item.file)).digest('hex')===item.sha256,level+' media hash');
      const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',item.file],{encoding:'utf8'}).trim());
      assert(Math.abs(duration-variant.durationSeconds)<.06,level+' duration');
      const last=variant.cues.at(-1),first=variant.cues[0];
      assert(Math.abs(last.e-variant.durationSeconds)<.05,level+' final cue');
      assert(last.e-last.voiceEnd>=3-.05,level+' pause under minimum');
      assert(last.e-last.voiceEnd>=(last.voiceEnd-first.s)*variant.ratio-.08,level+' pause ratio');
      assert(variant.cues.every((cue,i)=>cue.i===i&&cue.s<cue.voiceEnd&&cue.voiceEnd<cue.e&&(!i||cue.s>=variant.cues[i-1].e)),level+' cue sequence');
    }
  }
}
console.log('Boot Camp 002 validated: six Vocal levels, six Story levels, 88 verified audio variants, exact cues and pause ratios.');
