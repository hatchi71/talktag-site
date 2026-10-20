#!/usr/bin/env node
// Upload only the immutable, locally verified Essays & Articles cue release.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'audio/essays-boundary-dings-20261020');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const base='https://audio.talktag.co.kr/Essays/boundary-dings/v1-20261020/';
const prefix='Essays/boundary-dings/v1-20261020/';
const mode=process.argv[2]||'--dry-run';
if(!['--dry-run','--upload','--verify-only'].includes(mode)||process.argv.length>3||manifest.version!==1||manifest.releaseBase!==base||manifest.cards.length!==18)throw Error('Unexpected upload request');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const items=manifest.cards.map(card=>{
  const expected=base+card.language+'/'+card.id+'.mp3?v='+card.sha256.slice(0,12);
  const file=path.join(root,card.language,card.id+'.mp3');
  if(card.audio!==expected||!fs.existsSync(file)||fs.statSync(file).size!==card.bytes||sha(fs.readFileSync(file))!==card.sha256)throw Error('Invalid local media '+card.id);
  return {file,key:prefix+card.language+'/'+card.id+'.mp3',url:card.audio,bytes:card.bytes,sha256:card.sha256};
});
if(new Set(items.map(x=>x.key)).size!==18)throw Error('Duplicate key');
console.log(`Validated ${items.length} local audio files.`);
if(mode==='--dry-run')process.exit(0);
const wrangler=process.env.TALKTAG_WRANGLER_BIN||path.resolve(repo,'../2026-09-19/referenced-chatgpt-conversation-this-is-an/node_modules/.bin/wrangler');
if(!fs.existsSync(wrangler))throw Error('Approved Wrangler installation missing');
function command(args,index){return new Promise((resolve,reject)=>{const child=spawn(wrangler,args,{cwd:repo,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.join(os.tmpdir(),`talktag-essay-dings-${process.pid}-${index}.log`)},stdio:['ignore','pipe','pipe']});let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>output=(output+chunk.toString()).slice(-1500));child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`Wrangler ${code}: ${output}`)));});}
async function publicRead(item){const url=new URL(item.url);url.searchParams.set('tt_check',crypto.randomBytes(5).toString('hex'));const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.status===404)return false;if(!response.ok)throw Error(`Public HTTP ${response.status} ${item.key}`);const data=Buffer.from(await response.arrayBuffer());if(data.length!==item.bytes||sha(data)!==item.sha256)throw Error('Public file mismatch '+item.key);return true;}
async function awaitPublic(item){for(let attempt=0;attempt<6;attempt++){if(await publicRead(item))return;await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}throw Error('Not public after upload '+item.key);}
let next=0,done=0;
async function worker(){for(;;){const index=next++;if(index>=items.length)return;const item=items[index];const exists=await publicRead(item);if(mode==='--upload'&&!exists){await command(['r2','object','put','talktag-audio/'+item.key,'--remote','--file',item.file,'--content-type','audio/mpeg','--cache-control','public, max-age=31536000, immutable'],index);await awaitPublic(item);}else if(mode==='--verify-only'&&!exists)throw Error('Missing public file '+item.key);done++;console.log(`${done}/${items.length} ${item.key} verified`);}}
await Promise.all(Array.from({length:3},()=>worker()));
console.log('SUCCESS: all 18 essay recordings are public and hash-verified.');
