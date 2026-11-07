import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {formatMemberDate} from '../src/member-insights-view.js';
import {recordMemberVisit} from '../src/member-visits.js';
test('visit tracking deduplicates within a minute, isolates users and retries failures',async()=>{
 const calls=[];let fail=false;const client={rpc:async(name)=>{calls.push(name);return {error:fail?{}:null};}};
 await recordMemberVisit(client,'a',100000);await recordMemberVisit(client,'a',110000);assert.equal(calls.length,1);
 await recordMemberVisit(client,'b',110000);assert.equal(calls.length,2);
 await recordMemberVisit(client,'a',170000);assert.equal(calls.length,3);
 fail=true;await recordMemberVisit(client,'a',240000);await recordMemberVisit(client,'a',240001);assert.equal(calls.length,5);
});
test('unknown timestamps stay unknown rather than displaying epoch or invalid date',()=>{
 for(const value of [null,undefined,'','invalid'])assert.equal(formatMemberDate(value),'Not recorded');
 assert.match(formatMemberDate('2026-11-07T00:00:00Z'),/2026/);
});
test('statistics are admin-only and visit writes are session-bound without direct table grants',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/202611070001_admin_member_insights.sql',import.meta.url),'utf8');
 assert.equal((sql.match(/raise exception 'Administrator access required'/g)||[]).length,2);
 assert.match(sql,/values\(auth.uid\(\),to_timestamp/);
 assert.match(sql,/alter table public.member_visit_windows enable row level security/);
 assert.match(sql,/revoke all on public.member_visit_windows from public,anon,authenticated/);
 assert.doesNotMatch(sql,/grant select on public.member_visit_windows/i);
 assert.match(sql,/floor\(extract\(epoch from now\(\)\)\/1800\)/);
});
