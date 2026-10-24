#!/usr/bin/env node
// Import only the already-QC-approved A1 portion of episode 004.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const production='/Users/eungjukim/Documents/Codex/talktag-site-glr-miniskit';
const context={window:{TalkTagNativeCatalogs:{ko:[]},TalkTagKoreanGuidedVariants:{cards:[]}}};
for(const name of ['native-guided-ko-004.js','native-guided-ko-004-variants.js'])vm.runInNewContext(fs.readFileSync(path.join(production,name),'utf8'),context,{filename:name});
const catalog=context.window.TalkTagNativeCatalogs.ko.filter(x=>x.id==='ko-guided-a1-004');
const variants=context.window.TalkTagKoreanGuidedVariants.cards.filter(x=>x.id==='ko-guided-a1-004');
if(catalog.length!==1||variants.length!==1||variants[0].lines.length!==4||variants[0].variants.length!==4)throw Error('004 A1 source mismatch');
for(const x of catalog)x.artwork='/assets/glr-scenes/ko-004-a1.jpg';
fs.writeFileSync(path.join(root,'native-guided-ko-004-a1.js'),`(function(){window.TalkTagNativeCatalogs=window.TalkTagNativeCatalogs||{};window.TalkTagNativeCatalogs.ko=(window.TalkTagNativeCatalogs.ko||[]).concat(${JSON.stringify(catalog)});})();\n`);
fs.writeFileSync(path.join(root,'native-guided-ko-004-a1-variants.js'),`(function(){const patch=${JSON.stringify(variants)};const manifest=window.TalkTagKoreanGuidedVariants;if(!manifest?.cards)throw Error('Korean base variant catalog missing');manifest.cards.push(...patch);})();\n`);
const artFrom=path.join(production,'assets/glr-scenes/ko-004-a1.jpg'),artTo=path.join(root,'assets/glr-scenes/ko-004-a1.jpg');
fs.mkdirSync(path.dirname(artTo),{recursive:true});fs.copyFileSync(artFrom,artTo);
console.log('Prepared QC-approved Korean GLR 004 A1 with four pause variants and its artwork.');
