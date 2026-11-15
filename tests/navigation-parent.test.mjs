import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync('public/talktag-theme.js','utf8').split('/* End public navigation hierarchy. */')[0];
const context = { URLSearchParams }; vm.createContext(context); vm.runInContext(code, context);
const parent = context.talktagParentRoute;
for (const [prefix, studio] of [['','/snowballing-studio.html'], ['K-korean-','/K-korean-learning.html'], ['japanese/J-','/japanese/J-snowballing.html']]) {
  for (const track of ['vocal','story']) {
    const page = '/' + prefix + track + '-camp';
    test(`${page}: clean and HTML routes go up exactly one stage`, () => {
      for (const ext of ['', '.html']) {
        assert.equal(parent(page+ext), studio+'#boot-camp');
        assert.equal(parent(page+ext,'?level=B1'),page+'.html');
      }
    });
  }
}
for (const [page, expected] of [
  ['/audio-library?type=plain&level=A0','/audio-library.html?type=plain'],
  ['/K-korean-audio-library?type=guided&level=C2','/K-korean-audio-library.html?type=guided'],
  ['/K-korean-audio-essays?level=A1','/K-korean-audio-essays.html'],
  ['/japanese/J-guided?level=B1','/japanese/J-guided.html'],
  ['/japanese/J-readable-b1','/japanese/J-readable.html'],
  ['/readable?level=C1','/readable.html'],
  ['/K-korean-readable','/K-korean-learning.html'],
  ['/vocalcamp-player?lang=ko&level=C2','/K-korean-vocal-camp.html?level=C2'],
  ['/japanese/J-story-camp-c1','/japanese/J-story-camp.html'],
  ['/snowballing-studio','/E-english.html'],
  ['/K-korean-learning','/K-korean.html'],
  ['/japanese/J-snowballing','/japanese/J-index.html'],
  ['/toeic/','/test-preppers.html']
]) test(page,()=>{const [path,query] = page.split('?'); assert.equal(parent(path,query),expected);});
