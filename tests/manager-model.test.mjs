import test from 'node:test';import assert from 'node:assert/strict';
import {contentChecks,upcomingGatherings} from '../src/manager-model.js';
test('attention flags missing audio and scripts, but does not demand audio for reading',()=>{
 assert.equal(contentChecks([{published:true,has_content:true,media_count:0,area:'readable'},{published:true,has_content:true,media_count:1,area:'plain'}]),0);
 assert.equal(contentChecks([{published:true,has_content:true,media_count:0,area:'guided'},{published:true,has_content:false,media_count:1,area:'plain'},{published:false,has_content:true,media_count:1,area:'readable'}]),3);
});
test('gathering attention excludes canceled and finished events',()=>{
 const now=Date.parse('2026-11-05T06:00:00Z');
 assert.equal(upcomingGatherings([{status:'scheduled',ends_at:'2026-11-05T07:00:00Z'},{status:'canceled',ends_at:'2026-11-06T07:00:00Z'},{status:'scheduled',ends_at:'2026-11-04T07:00:00Z'}],now),1);
});
