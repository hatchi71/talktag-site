#!/usr/bin/env node
/**
 * Builds Korean Vocal Camp 002's public audio from individually QC-approved
 * dialogue turns. Each step is cumulative, matching the Vocal Camp player.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawRoot = path.join(root, '_local-audio/korean-vocalcamp-002/raw');
const releaseRoot = path.join(root, 'audio/korean/vocalcamp/002');
const speakers = {
  A1: ['Mina', 'Mina', 'Joon', 'Mina'],
  A2: ['Mina', 'Mina', 'Joon', 'Mina'],
  B1: ['Mina', 'Mina', 'Joon', 'Joon', 'Mina', 'Mina'],
  B2: ['Joon', 'Mina', 'Joon', 'Mina', 'Joon', 'Mina'],
  C1: ['Mina', 'Joon', 'Mina', 'Joon'],
  C2: ['Mina', 'Joon', 'Mina', 'Joon']
};

function run(command, args) {
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
}

for (const [level, voices] of Object.entries(speakers)) {
  const output = path.join(releaseRoot, level);
  fs.mkdirSync(output, {recursive: true});
  const inputs = voices.map((voice, index) => path.join(rawRoot, `K-VC-002-${level}-${String(index + 1).padStart(2, '0')}-${voice}.mp3`));
  for (const [index, input] of inputs.entries()) {
    if (!fs.existsSync(input)) throw new Error(`Missing QC-approved turn: ${input}`);
    fs.copyFileSync(input, path.join(output, `line-${String(index + 1).padStart(2, '0')}.mp3`));
  }
  for (let step = 1; step <= inputs.length; step += 1) {
    const selected = inputs.slice(0, step);
    const filter = `${selected.map((_, index) => `[${index}:a]`).join('')}concat=n=${step}:v=0:a=1[a]`;
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      ...selected.flatMap(input => ['-i', input]),
      '-filter_complex', filter, '-map', '[a]', '-ar', '44100', '-ac', '1',
      '-c:a', 'libmp3lame', '-b:a', '128k',
      path.join(output, `step-${String(step).padStart(2, '0')}.mp3`)
    ]);
  }
}

console.log('Built Korean Vocal Camp 002: 28 isolated turns and 28 cumulative steps.');
