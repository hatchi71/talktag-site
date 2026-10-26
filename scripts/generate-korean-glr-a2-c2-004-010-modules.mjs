#!/usr/bin/env node
// One-time release wiring. Run only after every exact public audio byte is verified.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const oldRoot='/Users/eungjukim/Documents/Codex/talktag-site-glr-miniskit';
const work=path.join(root,'_local-audio/korean-glr-a2-c2-005-010');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report=JSON.parse(fs.readFileSync(path.join(work,'public-verification.json'),'utf8'));
if(report.objectCount!==530||report.inventorySha256!==digest(path.join(work,'upload-inventory.json'))||report.oldInventorySha256!==digest(path.join(oldRoot,'_local-audio/korean-glr-004/upload-inventory.json')))throw Error('Public verification report does not match release inventory');

const catalogContext={window:{TalkTagNativeCatalogs:{ko:[]}}};
vm.runInNewContext(fs.readFileSync(path.join(oldRoot,'native-guided-ko-004.js'),'utf8'),catalogContext,{timeout:1000});
const oldCatalog=catalogContext.window.TalkTagNativeCatalogs.ko.filter(row=>row.level!=='A1');
const newCatalog=JSON.parse(fs.readFileSync(path.join(work,'draft-catalog.json'),'utf8')).map(row=>({
  ...row,
  artwork:`/assets/glr-scenes/ko-${row.episode}-${row.level.toLowerCase()}.jpg`,
  available:true
}));
const allCatalog=[...oldCatalog,...newCatalog];
if(oldCatalog.length!==12||newCatalog.length!==85||new Set(allCatalog.map(row=>row.id)).size!==97)throw Error('Wrong catalog card inventory');

const variantContext={window:{TalkTagKoreanGuidedVariants:{cards:[]}}};
vm.runInNewContext(fs.readFileSync(path.join(oldRoot,'native-guided-ko-004-variants.js'),'utf8'),variantContext,{timeout:1000});
const oldVariants=variantContext.window.TalkTagKoreanGuidedVariants.cards.filter(row=>row.level!=='A1');
const newVariants=JSON.parse(fs.readFileSync(path.join(work,'variants-manifest.json'),'utf8')).cards;
const allVariants=[...oldVariants,...newVariants];
if(oldVariants.length!==12||newVariants.length!==85||new Set(allVariants.map(row=>row.id)).size!==97||allVariants.some(row=>row.variants?.length!==4))throw Error('Wrong variant card inventory');
for(const row of allCatalog)if(!allVariants.some(variant=>variant.id===row.id))throw Error('Catalog/variant mismatch '+row.id);

fs.writeFileSync(path.join(root,'native-guided-ko-a2-c2-004-010.js'),
  '/* Korean GLR 004–010 A2–C2; public media checked by complete SHA-256. */\n'+
  '(function(){window.TalkTagNativeCatalogs=window.TalkTagNativeCatalogs||{};'+
  'window.TalkTagNativeCatalogs.ko=(window.TalkTagNativeCatalogs.ko||[]).concat('+JSON.stringify(allCatalog)+');})();\n');
fs.writeFileSync(path.join(root,'native-guided-ko-a2-c2-004-010-variants.js'),
  '/* Korean GLR 004–010 A2–C2 measured pause variants. */\n'+
  '(function(){const manifest=window.TalkTagKoreanGuidedVariants;'+
  'if(!manifest?.cards)throw Error("Korean base variant catalog missing");'+
  'manifest.cards.push(...'+JSON.stringify(allVariants)+');})();\n');
console.log(`Generated ${allCatalog.length} live catalog cards and ${allVariants.length} variant cards, with no A1 duplication.`);
