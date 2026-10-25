#!/usr/bin/env node
// Verify every uploaded GLR 011 object through the public audio endpoint.
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=process.env.TALKTAG_GLR011_WORKDIR||'/private/tmp/talktag-glr011';
const manifest=JSON.parse(fs.readFileSync(`${root}/final/manifest.json`,'utf8'));
const base='https://audio.talktag.co.kr/English/guided/glr-011-20261025/';
for(const card of manifest.cards){
  const response=await fetch(base+encodeURIComponent(card.filename)+'?v='+card.sha256.slice(0,12),{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(card.id+' HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());
  const sha=crypto.createHash('sha256').update(data).digest('hex');
  if(data.length!==card.bytes||sha!==card.sha256)throw Error(card.id+' public size/hash mismatch');
  if(!/audio\/(mpeg|mp3)/i.test(response.headers.get('content-type')||''))throw Error(card.id+' content type mismatch');
  console.log(card.id+' public SHA-256 verified ('+data.length+' bytes)');
}
