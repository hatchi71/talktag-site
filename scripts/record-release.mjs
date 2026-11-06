import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function inventory(root,prefix=''){let rows=[];for(const e of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+e.name;if(e.isDirectory())rows.push(...await inventory(root+'/'+e.name,name+'/'));else{const data=await readFile(root+'/'+e.name);rows.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}return rows;}
if(process.argv[1].endsWith('record-release.mjs'))await writeFile('release-manifest.json',JSON.stringify({sourceRelease:'6f886df2',files:await inventory('public')},null,2)+'\n');
