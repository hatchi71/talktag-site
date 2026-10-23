import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'bootcamp-artwork.js'), 'utf8'), sandbox);
const art = sandbox.window.TalkTagBootCampArtwork;
const scenes = new Set();
for (const camp of ['vocal', 'story']) {
  for (const number of ['001']) {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      const item = art.get(camp, number, level);
      if (!item?.src || !item.alt?.trim()) throw Error(`Missing ${camp} ${number} ${level}`);
      const file = path.join(root, item.src.slice(1));
      if (!fs.existsSync(file)) throw Error(`Missing image ${file}`);
      const dimensions = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', file], {encoding:'utf8'}).trim();
      if (dimensions !== '720x480') throw Error(`Wrong dimensions ${item.src}: ${dimensions}`);
      scenes.add(item.src);
    }
  }
}
if (scenes.size !== 2) throw Error(`Expected two distinct new 001 scenes, got ${scenes.size}`);
if (art.get('vocal','002','A1') !== null) throw Error('Retired scenes must not be exposed');
console.log('Korean Boot Camp artwork: 12 cards, two 720×480 images validated.');
