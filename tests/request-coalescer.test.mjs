import test from 'node:test';import assert from 'node:assert/strict';
import {singleFlight} from '../src/request-coalescer.js';
import {checkDeviceSession} from '../src/device-session.js';
test('simultaneous refreshes share work but the next refresh is fresh',async()=>{let count=0;const run=singleFlight(async()=>++count);const results=await Promise.all([run(),run(),run()]);assert.deepEqual(results,[1,1,1]);assert.equal(await run(),2);});
test('device checks merge simultaneous calls but never cache a prior allow',async()=>{let count=0;const client={rpc:async()=>({data:++count===1})};assert.deepEqual(await Promise.all([checkDeviceSession(client),checkDeviceSession(client)]),[true,true]);assert.equal(await checkDeviceSession(client),false);assert.equal(count,2);});
test('a failed refresh is not retained and can be retried',async()=>{let n=0;const run=singleFlight(async()=>{if(++n===1)throw Error('offline');return 'fresh';});await assert.rejects(run());assert.equal(await run(),'fresh');});
test('authentication invalidation starts fresh work without waiting for old work',async()=>{let finishOld,n=0;const run=singleFlight(()=>++n===1?new Promise(r=>finishOld=r):'new user');const old=run();await Promise.resolve();run.invalidate();assert.equal(await run(),'new user');finishOld('old user');assert.equal(await old,'old user');assert.equal(await run(),'new user');});
