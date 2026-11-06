// Generate the bulletin from preserved release groups and public catalog metadata.
// Private lesson text and media keys never enter this feed.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const groups=JSON.parse(fs.readFileSync('content-release-groups.json','utf8'));
const context={window:{},location:{pathname:'/E-english.html'}};
vm.runInNewContext(fs.readFileSync('public/catalog-metadata.js','utf8'),context);
const cards=new Map(context.window.TalkTagAudioLessons.map(c=>[c.id,c]));
const ids=new Set();
for(const g of groups){
 assert(g.id&&!ids.has(g.id),'Duplicate release group');ids.add(g.id);
 assert(['en','ko','ja'].includes(g.language)&&Number.isFinite(Date.parse(g.publishedAt)),'Invalid release group');
 if(g.cardIds)for(const id of g.cardIds)assert(cards.get(id)?.available===true,'Unavailable published card: '+id);
}
const items=groups.filter(g=>g.status!=='draft'&&g.status!=='unpublished').sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.id.localeCompare(a.id));
const output=JSON.stringify({version:1,items},null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync('public/home-news-feed.json','utf8'),output,'Regenerate home news');
else fs.writeFileSync('public/home-news-feed.json',output);
console.log('Generated '+items.length+' published upload groups.');
