import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/picture-talk.js';
import cards from '../workers/picture-talk-cards.js';
import {existsSync} from 'node:fs';
test('Picture Talk blocks signed-out requests without disclosing scripts',async()=>{const response=await onRequestPost({request:new Request('https://talktag.co.kr/api/picture-talk',{method:'POST'})});assert.equal(response.status,401);assert.equal(await response.text(),'{}');});
test('100 approved bilingual cards have distinct existing pictures',()=>{assert.equal(cards.length,100);assert.equal(new Set(cards.map(x=>x.image)).size,100);for(const card of cards){assert.ok(card.en.sentence&&card.ko.sentence);assert.ok(existsSync('public/picture-talk/'+card.image));}});

import {onRequestGet} from '../functions/api/picture-talk-audio.js';
import clips from '../workers/picture-talk-audio.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
test('Sentence audio is protected from signed-out requests',async()=>{const response=await onRequestGet({request:new Request('https://talktag.co.kr/api/picture-talk-audio?id=001-en')});assert.equal(response.status,401);assert.equal((await response.arrayBuffer()).byteLength,0);});
test('All 200 sentence clips match approved source hashes and no word clips are exposed',()=>{const release=JSON.parse(readFileSync('docs/PICTURE_TALK_100_RELEASE_20261109.json'));assert.equal(Object.keys(clips).length,200);for(const row of release.sentenceClips)assert.equal(createHash('sha256').update(Buffer.from(clips[row.id],'base64')).digest('hex'),row.sha256);for(const card of cards)for(const lang of ['en','ko']){assert.ok(card[lang].phonetic);assert.deepEqual(Object.keys(card[lang].audio),['sentence']);assert.ok(clips[card[lang].audio.sentence]);}});
