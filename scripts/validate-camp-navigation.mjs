import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const levels = ['A1','A2','B1','B2','C1','C2'];
const records = new Map([
  ['talktag-content-completions:v1', JSON.stringify({'storycamp-family:001':{completedAt:'2026-10-09',source:'manual'},'storycamp:B2:2':{completedAt:'2026-10-10',source:'manual'},'vocalcamp-family:003':{completedAt:'2026-10-10',source:'manual'}})],
  ['talktag-storycamp-card-001-A1','4'],
  ['talktag-vocal-pilot-simple-family-003-B1',JSON.stringify({card:2,counts:[10,5,0]})],
  ['talktag-korean-starters:v1',JSON.stringify({'001':{step:2,done:true,notes:{1:'Keep my sentences'}}})]
]);
const before = new Map(records); let writes=0;
const context = {window:{dispatchEvent() {},addEventListener() {}},document:{addEventListener() {}},CustomEvent:class {},localStorage:{getItem:key=>records.get(key)||null,setItem:(key,value)=>{writes++;records.set(key,value)}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('content-completion.js','utf8'),context);
vm.runInContext(fs.readFileSync('camp-progress.js','utf8'),context);
const progress=context.window.TalkTagCampProgress;
for(const level of levels){assert.equal(progress.done('story',level,'001'),true);assert.equal(progress.done('vocal',level,'003'),true);}
assert.equal(progress.done('story','B2','002'),true);
assert.equal(progress.done('story','A1','002'),false);
assert.equal(writes,0,'Browsing must not migrate or overwrite progress');
progress.set('story','A1','001',false);
assert.equal(progress.done('story','A1','001'),false);
for(const level of levels.slice(1))assert.equal(progress.done('story',level,'001'),true,'Undo one inherited completion must preserve other levels');
assert.deepEqual(JSON.parse(records.get('talktag-content-completions:v1'))['storycamp-family:001'],JSON.parse(before.get('talktag-content-completions:v1'))['storycamp-family:001']);
progress.set('story','A1','001',true);assert.equal(progress.done('story','A1','001'),true);
progress.set('vocal','A2','002',true);assert.equal(progress.done('vocal','A2','002'),true);assert.equal(progress.done('vocal','B1','002'),false);
for(const key of ['talktag-storycamp-card-001-A1','talktag-vocal-pilot-simple-family-003-B1','talktag-korean-starters:v1'])assert.equal(records.get(key),before.get(key),'Notes and resume positions must be unchanged');
let lessons=0;
for(const camp of ['story','vocal']){
  const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(`${camp}camp-manifest.js`,'utf8'),c);
  const families=c.window[`TALKTAG_${camp.toUpperCase()}CAMP_MANIFEST`].families.filter(f=>f.status==='published');
  for(const family of families)for(const level of family.levels){assert.ok(levels.includes(level));assert.ok(fs.existsSync(`content/${camp}camp/${family.number}.js`));lessons++;}
  for(const path of [`${camp}-camp.html`,`japanese/J-${camp}-camp.html`])assert.match(fs.readFileSync(path,'utf8'),/bootcamp-browser\.js\?v=20261014-level-landings-v1/);
}
const korean=fs.readFileSync('K-korean-starter.html','utf8');assert.match(korean,/bootcamp-browser\.js/);
assert.ok(korean.indexOf('bootcamp-browser.js')<korean.indexOf('korean-space.js'),'Korean browser must load before its caller');
assert.match(fs.readFileSync('japanese/studio-structure.js','utf8'),/Camp landings are owned by the shared level-first browser/);
const browser=fs.readFileSync('bootcamp-browser.js','utf8');
assert.match(browser,/camp-level-landing/,'Boot Camp must render a focused landing for each selected level');
assert.match(browser,/data-change-level/,'Boot Camp level landings must return to the level selection');
assert.match(browser,/levels\.hidden = levelSelected/,'The level grid must not remain above the selected-level episode list');
console.log(`Boot Camp: ${lessons} published English lesson routes intact; all six camp entrances share level-first navigation; legacy completion, per-level undo, resume and Korean notes preserved.`);
