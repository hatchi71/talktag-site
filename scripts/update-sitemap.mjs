import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
// Deliberate public landing allowlist: never glob private, draft or legacy pages.
const paths=['/','/snowballing-studio.html','/story-camp.html','/vocal-camp.html','/readable.html','/test-preppers.html','/toeic/','/japanese/','/korean.html'];
for(const type of ['guided','plain']){
 paths.push('/audio-library.html?type='+type);
 for(const level of ['A1','A2','B1','B2','C1','C2'])paths.push('/audio-library.html?type='+type+'&level='+level);
}
const context={window:{}};vm.createContext(context);
for(const camp of ['story','vocal']){
 vm.runInContext(fs.readFileSync(camp+'camp-manifest.js','utf8'),context,{timeout:1000});
 const manifest=context.window['TALKTAG_'+camp.toUpperCase()+'CAMP_MANIFEST'];
 for(const family of manifest.families){
  if(family.status!=='published'||(camp==='vocal'&&family.audioStatus!=='ready'))continue;
  if(!/^\d{3}$/.test(family.number))throw Error('Invalid family number');
  paths.push('/'+camp+'camp-family.html?family='+family.number);
 }
}
const urls=[...new Set(paths)].map(path=>{
 const url=new URL(path,'https://talktag.co.kr');
 const file='.'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');
 const html=fs.readFileSync(file,'utf8');
 if(/<meta\b[^>]*(?:noindex|http-equiv=["']refresh)/i.test(html))throw Error('Non-indexable sitemap entry: '+path);
 return url.href;
});
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+url.replaceAll('&','&amp;')+'</loc></url>').join('\n')+'\n</urlset>\n';
if(process.argv.includes('--check')){if(!fs.existsSync('sitemap.xml')||fs.readFileSync('sitemap.xml','utf8')!==xml)throw Error('Run node scripts/update-sitemap.mjs');}
else fs.writeFileSync('sitemap.xml',xml);
console.log('Sitemap: '+urls.length+' public landing/family URLs; drafts, personal views and redirects excluded.');
