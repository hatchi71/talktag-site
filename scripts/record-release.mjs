import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export async function inventory(root,prefix=''){let rows=[];for(const e of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+e.name;if(e.isDirectory())rows.push(...await inventory(root+'/'+e.name,name+'/'));else{const data=await readFile(root+'/'+e.name);rows.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}return rows;}
if(process.argv[1].endsWith('record-release.mjs')){
 const sourceRelease=process.env.TALKTAG_RELEASE_ID||execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
 if(!/^[A-Za-z0-9._-]{3,80}$/.test(sourceRelease))throw Error('Invalid TalkTag release ID');
 await writeFile('release-manifest.json',JSON.stringify({sourceRelease,files:await inventory('public')},null,2)+'\n');
}
