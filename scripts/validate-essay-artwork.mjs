import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const context = { window: {} };
function load(path) {
  runInNewContext(readFileSync(join(root, path), 'utf8'), context, { filename: path });
}
load('audio-essays.js');
load('audio-essays-002-media.js');
load('audio-essays-002.js');
load('essay-artwork.js');

const lessons = context.window.TalkTagAudioLessons.filter(item => item.type === 'plain' && item.available !== false && /^aea-/.test(item.id));
const paths = new Set();
for (const lesson of lessons) {
  if (!lesson.artwork || !lesson.artworkAlt) throw new Error(`Missing artwork or alt: ${lesson.id}`);
  const expected = `/assets/essay-scenes/en/${String(lesson.unit).padStart(3, '0')}-${lesson.level.toLowerCase()}.jpg`;
  if (lesson.artwork.split('?')[0] !== expected) throw new Error(`Artwork path mismatch: ${lesson.id}`);
  if (paths.has(lesson.artwork)) throw new Error(`Duplicate artwork: ${lesson.artwork}`);
  paths.add(lesson.artwork);
  const path = join(root, lesson.artwork.split('?')[0].slice(1));
  if (!existsSync(path)) throw new Error(`Missing image: ${path}`);
  const dimensions = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], { encoding: 'utf8' }).trim();
  if (dimensions !== '720,480') throw new Error(`Wrong image dimensions: ${path} ${dimensions}`);
}
if (lessons.length !== 12) throw new Error(`Expected 12 published English essays, found ${lessons.length}`);
console.log(`Essay artwork passed: ${lessons.length} published English cards, unique 720×480 covers and alt text.`);
