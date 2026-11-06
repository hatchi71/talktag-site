import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const entries={'account':'talktag-account','access-gate':'talktag-access-gate','protected-card-pilot':'talktag-protected-card-pilot','protected-library':'talktag-protected-library','protected-card':'talktag-protected-card','meetups-preview':'talktag-meetups-preview','member-myspace':'talktag-myspace','manager-standalone':'talktag-manager','temporary-account-status':'temporary-account-status'};
for(const [entry,name] of Object.entries(entries)){
 const result=await build({entryPoints:['src/'+entry+'.js'],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2020',write:false});
 if(Buffer.compare(Buffer.from(result.outputFiles[0].contents),await readFile('public/assets/'+name+'.js'))!==0)throw Error('Browser bundle is stale: '+name);
}
console.log('All 9 browser bundles match their source.');
