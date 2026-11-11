import {readFile,cp,rm} from 'node:fs/promises';
import {inventory} from './record-release.mjs';
const manifest=JSON.parse(await readFile('release-manifest.json','utf8'));
const actual=await inventory('public');
if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Public files differ from the reviewed release manifest. Review changes, then run npm run release:record.');
// Only these two checksum-pinned non-speech UI cues may be served from Pages.
const publicCueHashes = {
  'assets/vocal-camp/003-start.mp3': '1384115470badbc17dc2d59d3560195e2e0784e1b9073ddceee4900123e584b4',
  'assets/vocal-camp/003-end.mp3': '07aa81eaf21e46ccedf76549876b7a915cba5a0fed6b620f87a4ac61899cdf71'
};
for (const file of actual) {
  if (publicCueHashes[file.path] === file.sha256) continue;
  if (/(?:^|\/)(?:src|content|supabase|workers|tests|tt-backstage|node_modules)(?:\/|$)|\.(?:mp3|wav|sql)$|(?:^|\/)\./.test(file.path)) {
    throw Error('Private or authoring file in public delivery: ' + file.path);
  }
}
await rm('dist',{recursive:true,force:true});await cp('public','dist',{recursive:true});
console.log('Verified and built '+actual.length+' public files.');
