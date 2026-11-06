import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/protected-card.js',import.meta.url),'utf8');
const mount=source.slice(source.indexOf('function mountCampTemplate('),source.indexOf('function paintVocalButton('));
for(const kind of ['vocal','story'])test(kind+' Camp opens with the compact logo-only header',()=>{
 let sheetAdded=false,classesAdded=false;
 const document={body:{dataset:{}},head:{append(){sheetAdded=true;}},createElement(){return{};},querySelector(selector){return selector==='.brand strong'?null:selector==='.card-body'?{classList:{add(){classesAdded=true;}}}:null;}};
 const context={document,ui:english=>english};vm.runInNewContext(mount+';mountCampTemplate('+JSON.stringify(kind)+');',context);
 assert.equal(document.body.dataset.camp,kind);assert.ok(sheetAdded);assert.ok(classesAdded);
});
