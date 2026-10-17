#!/usr/bin/env node
// Upload only locally validated, immutable English GLR 003–010 pause variants.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/guided/segments-003-010');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'variants/manifest.json'),'utf8'));
const prefix='English/guided/segments-003-010/v1-20261017/';
const base='https://audio.talktag.co.kr/'+prefix;
const mode=process.argv[2]||'--dry-run';
if(!['--dry-run','--upload','--verify-only'].includes(mode)||process.argv.length>3||manifest.releaseBase!==base||manifest.cards.length!==61)throw Error('Unexpected upload request');
const items=[];
for(const card of manifest.cards)for(const variant of card.variants){
  if(!variant.audio.startsWith(base+'variants/')||!variant.audio.endsWith('?v='+variant.sha256.slice(0,12)))throw Error('Invalid media URL');
  const rel=new URL(variant.audio).pathname.slice(new URL(base).pathname.length);
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).size!==variant.bytes||
      crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==variant.sha256)throw Error('Local file mismatch '+rel);
  items.push({file,key:prefix+rel,url:variant.audio,bytes:variant.bytes,sha256:variant.sha256});
}
if(items.length!==244||new Set(items.map(x=>x.key)).size!==244)throw Error('Unexpected media inventory');
const wrangler=process.env.TALKTAG_WRANGLER_BIN||path.resolve(repo,'../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler');
if(!fs.existsSync(wrangler))throw Error('Approved Wrangler installation missing');
function command(args,id){return new Promise((resolve,reject)=>{const child=spawn(wrangler,args,{cwd:repo,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.join(os.tmpdir(),`talktag-glr003010-${process.pid}-${id}.log`)},stdio:['ignore','pipe','pipe']});let output='';for(const s of [child.stdout,child.stderr])s.on('data',chunk=>output=(output+chunk.toString()).slice(-1000));child.on('close',code=>code===0?resolve():reject(Error('Wrangler '+code+': '+output)));child.on('error',reject);});}
async function publicRead(item){const url=new URL(item.url);url.searchParams.set('tt_check',crypto.randomBytes(5).toString('hex'));const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(r.status===404)return false;if(!r.ok)throw Error('Public fetch '+r.status+' '+item.key);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length!==item.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Public hash mismatch '+item.key);return true;}
async function awaitPublic(item){for(let attempt=0;attempt<6;attempt++){if(await publicRead(item))return;if(attempt<5)await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}throw Error('Not public after upload '+item.key);}
console.log(`${items.length} local MP3s verified; ${(items.reduce((n,x)=>n+x.bytes,0)/1048576).toFixed(1)} MiB`);
if(mode==='--dry-run')process.exit(0);
let next=0,done=0;
async function worker(){for(;;){const index=next++;if(index>=items.length)return;const item=items[index];const exists=await publicRead(item);if(mode==='--upload'&&!exists){await command(['r2','object','put','talktag-audio/'+item.key,'--remote','--file',item.file,'--content-type','audio/mpeg','--cache-control','public, max-age=31536000, immutable'],index);await awaitPublic(item);}else if(mode==='--verify-only'&&!exists)throw Error('Missing public file '+item.key);done++;if(done%10===0||done===items.length)console.log(`${done}/${items.length} public MP3s hash-verified`);}}
await Promise.all(Array.from({length:3},()=>worker()));
console.log('SUCCESS: all GLR 003–010 audio files publicly verified.');
