import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'bootcamp-artwork.js'), 'utf8'), context);
const artwork = context.window.TalkTagBootCampArtwork;
const levels = ['A1','A2','B1','B2','C1','C2'];
const scenes = new Set();
let cards = 0;
for (const camp of ['vocal','story']) {
  for (const number of ['001','002']) {
    for (const level of levels) {
      const item = artwork.get(camp, number, level, 'en');
      assert.ok(item?.src?.startsWith('/assets/bootcamp-scenes/en/'), `${camp} ${number} ${level}: missing scene`);
      assert.ok(item.alt?.trim(), `${camp} ${number} ${level}: missing alt text`);
      const file = path.join(root, item.src.slice(1));
      assert.ok(fs.existsSync(file), `${item.src}: missing image`);
      const dimensions = execFileSync('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',file], {encoding:'utf8'}).trim();
      assert.equal(dimensions, '720x480', `${item.src}: wrong dimensions`);
      scenes.add(item.src);
      cards++;
    }
  }
}
assert.equal(scenes.size, 4, 'The four published English Boot Camp stories need distinct scenes');
assert.equal(artwork.get('story','004','A1','en'), null, 'Unpublished English Story 004 must not show an image');
for (const page of ['vocal-camp.html','story-camp.html','vocalcamp-player.html','storycamp-reader.html']) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  assert.match(html,/bootcamp-artwork\.js\?v=/, `${page}: artwork catalog not loaded`);
  assert.match(html,/bootcamp-artwork\.css\?v=/, `${page}: artwork styles not loaded`);
}
console.log(`English Boot Camp artwork: ${cards} published cards, ${scenes.size} 720×480 images validated.`);
