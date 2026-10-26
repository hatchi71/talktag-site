#!/usr/bin/env node
// Upload only the authorized Korean GLR 004 + A2–C2 005–010 immutable objects.
// The temporary credential path is supplied at runtime and never enters the repo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const oldRoot='/Users/eungjukim/Documents/Codex/talktag-site-glr-miniskit/_local-audio/korean-glr-004';
const newRoot=path.join(root,'_local-audio/korean-glr-a2-c2-005-010');
const mode=process.argv[2]||'--dry-run',credentialFile=process.argv[3];
if(!['--dry-run','--probe','--upload','--verify-only'].includes(mode))throw Error('Unknown mode');
const oldInventory=JSON.parse(fs.readFileSync(path.join(oldRoot,'upload-inventory.json'),'utf8'));
const newInventory=JSON.parse(fs.readFileSync(path.join(newRoot,'upload-inventory.json'),'utf8'));
if(oldInventory.length!==78||newInventory.length!==460)throw Error('Release inventory is incomplete');
const allowed=/^Korean\/guided\/(?:20261022-004|20261026-a2-c2-005-010)\/(?:lines|cards)\/[A-Za-z0-9._/-]+\.mp3$/;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// A1 004 is already live under a separate, previously released prefix.
const requested004=oldInventory.filter(row=>!/(?:\/lines\/a1-|\/cards\/ko-guided-a1-)/.test(row.key));
if(requested004.length!==70)throw Error('Unexpected A2–C2 004 inventory');
const items=[...requested004,...newInventory].map(row=>{
  if(!allowed.test(row.key)||row.key.includes('..')||row.audio!==`https://audio.talktag.co.kr/${row.key}?v=${row.sha256.slice(0,16)}`)throw Error('Bad object key '+row.key);
  const file=fs.realpathSync(row.file),releaseRoot=row.key.includes('20261022-004')?path.join(oldRoot,'release'):path.join(newRoot,'release');
  if(!file.startsWith(releaseRoot+path.sep)||fs.statSync(file).size!==row.bytes||sha(file)!==row.sha256)throw Error('Local byte mismatch '+row.key);
  return {file,key:row.key,url:row.audio,sha256:row.sha256,bytes:row.bytes};
});
if(new Set(items.map(row=>row.key)).size!==items.length)throw Error('Duplicate object key');
console.log(`${items.length} local objects verified, ${(items.reduce((sum,row)=>sum+row.bytes,0)/1048576).toFixed(1)} MiB`);
if(mode==='--dry-run')process.exit(0);
if(!credentialFile)throw Error('Temporary credential path required');
const credentials=JSON.parse(fs.readFileSync(credentialFile,'utf8'));
if(!/^[A-Za-z0-9]{32}$/.test(credentials.access)||!/^[A-Za-z0-9]{64}$/.test(credentials.secret)||!/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(credentials.endpoint))throw Error('Invalid temporary credential');
const host=new URL(credentials.endpoint).hostname;
const emptyHash=crypto.createHash('sha256').update('').digest('hex');
const hmac=(key,value)=>crypto.createHmac('sha256',key).update(value).digest();
function signature(method,key,payloadHash,extra={}){
  const now=new Date().toISOString().replace(/[-:]|\.\d{3}/g,''),date=now.slice(0,8);
  const uri='/talktag-audio/'+key.split('/').map(encodeURIComponent).join('/');
  const headers={host,'x-amz-date':now,'x-amz-content-sha256':payloadHash,...extra};
  const names=Object.keys(headers).sort();
  const canonicalHeaders=names.map(name=>`${name}:${String(headers[name]).trim().replace(/\s+/g,' ')}`).join('\n')+'\n';
  const scope=`${date}/auto/s3/aws4_request`;
  const canonical=[method,uri,'',canonicalHeaders,names.join(';'),payloadHash].join('\n');
  const stringToSign=['AWS4-HMAC-SHA256',now,scope,crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
  const signing=hmac(hmac(hmac(hmac(Buffer.from('AWS4'+credentials.secret),date),'auto'),'s3'),'aws4_request');
  const signed=crypto.createHmac('sha256',signing).update(stringToSign).digest('hex');
  headers.authorization=`AWS4-HMAC-SHA256 Credential=${credentials.access}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signed}`;
  return {uri,headers};
}
function s3(method,item){return new Promise((resolve,reject)=>{
  const isPut=method==='PUT',hash=isPut?item.sha256:emptyHash;
  const extra=isPut?{'content-type':'audio/mpeg','cache-control':'public, max-age=31536000, immutable','x-amz-meta-sha256':item.sha256}:{};
  const {uri,headers}=signature(method,item.key,hash,extra);
  if(isPut)headers['content-length']=String(item.bytes);
  const request=https.request({method,hostname:host,path:uri,headers,timeout:120000},response=>{
    const chunks=[];response.on('data',part=>{if(chunks.reduce((sum,b)=>sum+b.length,0)<10000)chunks.push(part);});
    response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('utf8').slice(0,500)}));
  });
  request.on('timeout',()=>request.destroy(Error('S3 timeout')));request.on('error',reject);
  if(isPut)fs.createReadStream(item.file).on('error',reject).pipe(request);else request.end();
});}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function publicCheck(item){
  const url=new URL(item.url);url.searchParams.set('verify',crypto.randomBytes(5).toString('hex'));
  const response=await fetch(url,{signal:AbortSignal.timeout(300000),cache:'no-store'});
  if(response.status===404)return false;
  if(!response.ok)throw Error(`Public ${response.status} ${item.key}`);
  const hash=crypto.createHash('sha256');let bytes=0;
  for await(const part of response.body){hash.update(part);bytes+=part.length;}
  if(bytes!==item.bytes||hash.digest('hex')!==item.sha256)throw Error('Public byte/hash mismatch '+item.key);
  return true;
}
async function publicCheckRetry(item){for(let n=0;n<5;n++){try{if(await publicCheck(item))return true;}catch(error){if(/byte\/hash mismatch/.test(String(error))||n===4)throw error;}await sleep(1000*2**n);}return false;}
async function handle(item){
  const head=await s3('HEAD',item);
  if(head.status===200){
    if(Number(head.headers['content-length'])!==item.bytes)throw Error('Existing object has wrong size '+item.key);
    const actual=head.headers['x-amz-meta-sha256'];
    if(actual&&actual!==item.sha256)throw Error('Existing object has wrong metadata hash '+item.key);
    if(!await publicCheckRetry(item))throw Error('Private object not public '+item.key);
    return 'existing';
  }
  if(head.status!==404)throw Error(`R2 HEAD ${head.status} ${item.key} ${head.body}`);
  if(mode==='--verify-only')throw Error('Missing object '+item.key);
  const result=await s3('PUT',item);
  if(result.status!==200)throw Error(`R2 PUT ${result.status} ${item.key} ${result.body}`);
  if(!await publicCheckRetry(item))throw Error('Uploaded object not public '+item.key);
  return 'uploaded';
}
if(mode==='--probe'){
  const sample=items.find(item=>item.key==='Korean/guided/20261022-004/lines/a2-01-Min-joon.mp3');
  console.log(`PROBE ${sample.key} ${await handle(sample)}`);
  process.exit(0);
}
let cursor=0,done=0,uploaded=0;
async function worker(){while(cursor<items.length){const item=items[cursor++];let result;
  for(let attempt=0;attempt<3;attempt++){try{result=await handle(item);break;}catch(error){if(attempt===2||/wrong|mismatch|R2 PUT 4|R2 HEAD 4/.test(String(error)))throw error;await sleep(1000*2**attempt);}}
  if(result==='uploaded')uploaded++;done++;if(done%10===0||done===items.length)console.log(`Verified ${done}/${items.length}, newly uploaded ${uploaded}`);
}}
await Promise.all(Array.from({length:4},()=>worker()));
fs.writeFileSync(path.join(newRoot,'public-verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),objectCount:items.length,uploadedCount:uploaded,inventorySha256:sha(path.join(newRoot,'upload-inventory.json')),oldInventorySha256:sha(path.join(oldRoot,'upload-inventory.json'))},null,2)+'\n');
console.log(`SUCCESS: ${items.length} public objects byte-verified, ${uploaded} uploaded.`);
