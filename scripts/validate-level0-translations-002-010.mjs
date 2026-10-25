#!/usr/bin/env node
// Check source-locked Korean A0 meaning support and response prompts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'content/guided/a0-002-010-scripts.json'),'utf8'));
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(repo,'korean-support-level0-002-010.js'),'utf8'),context);
const scripts={vi:/[À-ỹ]/u,ne:/[\u0900-\u097F]/u,km:/[\u1780-\u17FF]/u,my:/[\u1000-\u109F]/u,th:/[\u0E00-\u0E7F]/u,ja:/[\u3040-\u30FF\u3400-\u9FFF]/u};
for(const pair of source.episodePairs){
  const id=pair.ko.id,record=context.window.TalkTagKoreanTranslations?.[id];
  const prompts=context.window.TalkTagKoreanLevel0Prompts?.[id];
  assert(record&&prompts,id+' missing support');
  assert.equal(record.source[0],pair.ko.target);
  assert.equal(record.sourceHash,crypto.createHash('sha256').update(pair.ko.target.trim()).digest('hex'));
  assert.equal(prompts.en,pair.ko.prompt);
  for(const [language,script] of Object.entries(scripts)){
    assert.equal(record.translations[language]?.length,1,id+' '+language+' missing line');
    assert(script.test(record.translations[language][0]),id+' '+language+' wrong script');
    assert(script.test(prompts[language]||''),id+' '+language+' missing localized prompt');
    assert.equal(record.review[language]?.status,'ai-reviewed');
  }
  console.log('PASS '+id+' · six aligned AI-reviewed meanings/prompts');
}
