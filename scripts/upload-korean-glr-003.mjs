#!/usr/bin/env node
// Immutable Korean GLR 003 release: verify local bytes, upload only absent keys,
// and compare every publicly served file with its complete SHA-256 digest.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'_local-audio/korean-glr-003');
const manifest=JSON.parse(fs.readFileSync(path.join(work,'native-guided-ko-003-variants.json'),'utf8'));
const inventory=JSON.parse(fs.readFileSync(path.join(work,'upload-inventory.json'),'utf8'));
const mode=process.argv[2]||'--dry-run';
const prefix='Korean/guided/20261018-003/';
if(!['--dry-run','--upload','--verify-only'].includes(mode)||process.argv.length>3||!manifest.publicationReady||manifest.cards.length<13||inventory.length!==26+manifest.cards.length*4)throw Error('Unexpected Korean GLR 003 upload inventory');
const items=inventory.map(({file,key,sha256,bytes:listedBytes,audio})=>{
  const real=fs.realpathSync(file),expectedRoot=path.join(work,'release');
  if(!real.startsWith(expectedRoot+path.sep)||!key.startsWith(prefix)||key.includes('..')||!/^Korean\/guided\/20261018-003\/(?:lines|cards)\/[A-Za-z0-9._/-]+\.mp3$/.test(key)||audio!=='https://audio.talktag.co.kr/'+key+'?v='+sha256.slice(0,16))throw Error('Invalid release record '+key);
  const bytes=fs.readFileSync(real),actual=crypto.createHash('sha256').update(bytes).digest('hex');
  if(actual!==sha256||bytes.length!==listedBytes||bytes.length<1000)throw Error('Local media mismatch '+key);
  return {file:real,key,sha256,bytes:bytes.length,url:audio};
});
if(new Set(items.map(x=>x.key)).size!==items.length)throw Error('Duplicate release key');
console.log(`${items.length} release audio objects verified locally; ${(items.reduce((sum,x)=>sum+x.bytes,0)/1048576).toFixed(1)} MiB`);
if(mode==='--dry-run')process.exit(0);

const wrangler=process.env.TALKTAG_WRANGLER_BIN||path.resolve(root,'../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler');
if(!fs.existsSync(wrangler))throw Error('Approved Wrangler installation missing');
if(mode==='--upload'){
  const auth=spawnSync(wrangler,['whoami'],{cwd:root,encoding:'utf8',timeout:30000,
    env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.join(os.tmpdir(),`talktag-ko-glr003-auth-${process.pid}.log`)}});
  if(auth.error||auth.status!==0||!/logged in|associated with the following accounts/i.test(auth.stdout||'')){
    throw Error('Cloudflare upload session is not verified. Stop here; complete a fresh Wrangler login while its localhost callback is listening, then rerun the upload. Do not reuse an expired authorization tab.');
  }
}
function upload(item,index){return new Promise((resolve,reject)=>{
  const child=spawn(wrangler,['r2','object','put','talktag-audio/'+item.key,'--remote','--file',item.file,'--content-type','audio/mpeg','--cache-control','public, max-age=31536000, immutable'],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.join(os.tmpdir(),`talktag-ko-glr003-${process.pid}-${index}.log`)},stdio:['ignore','pipe','pipe']});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>output=(output+chunk.toString()).slice(-1500));
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Upload failed: '+item.key+' '+output)));
});}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(item){
  for(let attempt=0;attempt<4;attempt++){
    try{
      const url=new URL(item.url);url.searchParams.set('tt_check',crypto.randomBytes(5).toString('hex'));
      const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
      if(response.status===404)return false;
      if(response.status>=500)throw Error('Public media response '+response.status);
      if(!response.ok)throw Error('Public media response '+response.status+' for '+item.key);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==item.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Public media hash mismatch '+item.key);
      return true;
    }catch(error){
      if(/hash mismatch|response 4\d\d/.test(String(error))||attempt===3)throw error;
      await pause(1000*2**attempt);
    }
  }
}
let next=0,done=0;
async function worker(){for(;;){const index=next++;if(index>=items.length)return;const item=items[index];
  let exists=await check(item);
  if(!exists&&mode==='--verify-only')throw Error('Missing public media '+item.key);
  if(!exists){await upload(item,index);for(let attempt=0;attempt<6;attempt++){exists=await check(item);if(exists)break;await pause(1000*2**attempt);}if(!exists)throw Error('Uploaded media not publicly available '+item.key);}
  console.log(`${++done}/${items.length} public cards hash-verified`);
}}
await Promise.all(Array.from({length:3},()=>worker()));
console.log('SUCCESS: Korean GLR 003 audio is publicly available and byte-verified.');
