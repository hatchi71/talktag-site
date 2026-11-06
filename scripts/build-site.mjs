import {readFile,cp,rm} from 'node:fs/promises';
import {inventory} from './record-release.mjs';
const manifest=JSON.parse(await readFile('release-manifest.json','utf8'));
const actual=await inventory('public');
if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Public files differ from the reviewed release manifest. Review changes, then run npm run release:record.');
for(const f of actual){if(/(?:^|\/)(?:src|content|supabase|workers|tests|tt-backstage|node_modules)(?:\/|$)|\.(?:mp3|wav|sql)$|(?:^|\/)\./.test(f.path))throw Error('Private or authoring file in public delivery: '+f.path);}
await rm('dist',{recursive:true,force:true});await cp('public','dist',{recursive:true});
console.log('Verified and built '+actual.length+' public files.');
