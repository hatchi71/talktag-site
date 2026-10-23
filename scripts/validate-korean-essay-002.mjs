#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const audio = path.join(root, 'content/audio/ko-plain-a1-002.mp3');
const script = JSON.parse(readFileSync(path.join(root, 'content/essays/ko-a1-002.json'), 'utf8'));
const context = {window:{}};
vm.createContext(context);
vm.runInContext(readFileSync(path.join(root, 'native-audio-korean-aea-002.js'), 'utf8'), context);
const lesson = context.window.TalkTagNativeCatalogs.ko.find(item => item.id === script.id);
assert.ok(lesson && lesson.available && script.status === 'published');
assert.deepEqual(Array.from(lesson.expressions), script.expressions);
assert.deepEqual(Array.from(lesson.meanings), script.meanings);
const digest = createHash('sha256').update(readFileSync(audio)).digest('hex');
assert.equal(lesson.checksum, digest);
assert.equal(script.audioSha256, digest);
assert.ok(lesson.audio.includes('/v2-20261023/ko/ko-plain-a1-002.mp3'));
assert.ok(lesson.boundaryDings);

function pcm(file) {
  const data = execFileSync('ffmpeg', ['-v','error','-nostdin','-i',file,'-ar','48000','-ac','1','-f','s16le','-'], {encoding:null,maxBuffer:32e6});
  return new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
}
function match(source, cue, side) {
  const span = Math.min(source.length, cue.length + 48000);
  const section = side === 'start' ? source.subarray(0, span) : source.subarray(source.length - span);
  let best = 0;
  for (let offset = 0; offset <= section.length - cue.length; offset += 480) {
    let dot = 0, left = 0, right = 0;
    for (let i = 0; i < cue.length; i += 4) {
      const a = section[offset + i], b = cue[i];
      dot += a*b; left += a*a; right += b*b;
    }
    best = Math.max(best, dot / Math.sqrt(left*right || 1));
  }
  return best;
}
const recording = pcm(audio);
const cueRoot = '/Users/eungjukim/Desktop/TEMP';
assert.ok(match(recording, pcm(path.join(cueRoot, 'Start.mp3')), 'start') > 0.75, 'Opening cue missing');
assert.ok(match(recording, pcm(path.join(cueRoot, 'Ending.mp3')), 'end') > 0.75, 'Ending cue missing');
assert.ok(Math.abs(recording.length / 48000 - lesson.durationSeconds) < 0.12, 'Duration mismatch');
console.log('PASS: Korean essay 002 script, audio hash, duration, and both approved boundary cues.');
