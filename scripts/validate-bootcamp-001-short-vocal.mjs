#!/usr/bin/env node
// Independent decoded-media check for replacement en/ko/ja 001 Vocal cards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const lang = process.env.TALKTAG_BOOTCAMP_LANG || 'en';
const config = {
  en: { output: '../audio/vocalcamp/short-001-v3', global: 'TalkTagVocal001ShortVariants' },
  ko: { output: '../audio/korean/vocalcamp/short-001-v3', global: 'TalkTagKoreanVocal001ShortVariants' },
  ja: { output: '../audio/japanese/vocalcamp/short-001-v3', global: 'TalkTagJapaneseVocal001ShortVariants' }
}[lang];
if (!config) throw new Error(`Unsupported language: ${lang}`);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), config.output);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const js = fs.readFileSync(path.join(root, 'manifest.js'), 'utf8');
assert.ok(js.startsWith(`window.${config.global} = `));
assert.deepEqual(JSON.parse(js.slice(js.indexOf('=') + 1).trim().replace(/;$/u, '')), manifest);
assert.equal(manifest.cards.length, 6);
assert.deepEqual(manifest.ratios, [2, 2.5, 3, 3.5]);
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const local = url => {
  assert.ok(url.startsWith(manifest.releaseBase));
  return path.join(root, url.split('?')[0].slice(manifest.releaseBase.length));
};
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const decode = file => {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', file,
    '-ar', '48000', '-ac', '1', '-f', 's16le', 'pipe:1'], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Could not decode ${file}`);
  return result.stdout;
};
const active = (pcm, start, end) => {
  const first = Math.max(0, Math.floor(start * 100)), last = Math.min(pcm.length / 960, Math.ceil(end * 100));
  let a = -1, b = -1;
  for (let frame = first; frame < last; frame++) {
    let energy = 0;
    for (let i = frame * 960; i + 1 < Math.min((frame + 1) * 960, pcm.length); i += 2) {
      const sample = pcm.readInt16LE(i);
      energy += sample * sample;
    }
    if (Math.sqrt(energy / 480) / 32768 >= .001) {
      if (a < 0) a = frame;
      b = frame;
    }
  }
  return a < 0 ? null : { first: a / 100, end: (b + 1) / 100 };
};
let variants = 0, gaps = 0, worst = 0;
for (const [index, card] of manifest.cards.entries()) {
  assert.equal(card.level, levels[index]);
  assert.equal(card.id, lang === 'ja' ? `japanese-vocalcamp-001-${card.level}` : `family-001-${card.level}`);
  assert.equal(card.lines.length, 3);
  assert.equal(card.steps.length, 3);
  for (const line of card.lines) {
    const file = local(line.audio);
    assert.equal(fs.statSync(file).size, line.bytes);
    assert.equal(hash(file), line.sha256);
  }
  for (const [stepIndex, step] of card.steps.entries()) {
    assert.equal(step.step, stepIndex + 1);
    assert.equal(step.variants.length, 4);
    for (const variant of step.variants) {
      const file = local(variant.audio), pcm = decode(file), duration = pcm.length / 96000;
      assert.equal(fs.statSync(file).size, variant.bytes);
      assert.equal(hash(file), variant.sha256);
      assert.ok(Math.abs(duration - variant.durationSeconds) < .001);
      assert.equal(variant.cues.length, step.step);
      for (const [i, cue] of variant.cues.entries()) {
        assert.equal(cue.i, i);
        assert.ok(cue.s < cue.voiceEnd && cue.voiceEnd < cue.e && cue.e <= duration + .001);
        const speech = active(pcm, Math.max(0, cue.s - .12), Math.min(duration, cue.voiceEnd + .25));
        assert.ok(speech, `${card.id} step ${step.step}: missing audible beat ${i + 1}`);
        assert.ok(Math.abs(speech.first - cue.s) < .27 && Math.abs(speech.end - cue.voiceEnd) < .27);
        const next = variant.cues[i + 1];
        const target = next ? .35 : Math.max(3, (cue.voiceEnd - variant.cues[0].s) * variant.ratio);
        const measured = next ? active(pcm, next.s - .12, next.voiceEnd + .25).first - speech.end : duration - speech.end;
        const error = measured - target;
        assert.ok(error > -.12 && error < .32, `${card.id} step ${step.step} ${variant.ratio}×: gap error ${error.toFixed(3)}s`);
        worst = Math.max(worst, Math.abs(error)); gaps++;
      }
      variants++;
    }
  }
}
console.log(`${lang}: validated ${variants} decoded short-story variants, ${gaps} speaking gaps; worst error ${worst.toFixed(3)}s.`);
console.log('This is technical validation, not human audition or publication approval.');
