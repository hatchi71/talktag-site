import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/picture-talk.js';
import cards from '../workers/picture-talk-cards.js';
import {existsSync} from 'node:fs';
test('Picture Talk blocks signed-out requests without disclosing scripts',async()=>{const response=await onRequestPost({request:new Request('https://talktag.co.kr/api/picture-talk',{method:'POST'})});assert.equal(response.status,401);assert.equal(await response.text(),'{}');});
test('Ten approved bilingual cards have distinct existing pictures',()=>{assert.equal(cards.length,10);assert.equal(new Set(cards.map(x=>x.image)).size,10);for(const card of cards){assert.ok(card.en.sentence&&card.ko.sentence);assert.ok(existsSync('public/picture-talk/'+card.image));}});
