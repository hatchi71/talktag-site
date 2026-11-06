import test from 'node:test';
import assert from 'node:assert/strict';
import { openMemberLearningState } from '../src/member-learning-state.js';
function fixture(user='a', rows=[]) {
 const saved=new Map(),calls=[];
 const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const client={from(){const q={select(){return q},eq(){return q},then(resolve){resolve({data:rows})}};return q},auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},rpc:async(name,args)=>{calls.push(args);return {error:null}}};
 return {storage,saved,calls,client};
}
test('remote state is authoritative and only changed fields are saved',async()=>{
 const f=fixture('a',[{state_key:'position',value:'42'}]);
 const s=await openMemberLearningState(f.client,'a','lesson',f.storage);
 assert.equal(s.getItem('position'),'42');s.setItem('draft','hello');await s.flush();
 assert.deepEqual(f.calls[0].p_changes,{draft:'hello'});s.close();
});
test('another account cannot upload cached changes',async()=>{
 const f=fixture('b');const s=await openMemberLearningState(f.client,'a','lesson',f.storage);
 s.setItem('position',12);await s.flush();assert.equal(f.calls.length,0);s.close();s.setItem('position',13);assert.equal(s.getItem('position'),null);
});
test('removed state is represented as a tombstone',async()=>{
 const f=fixture();const s=await openMemberLearningState(f.client,'a','lesson',f.storage);
 s.removeItem('position');await s.flush();assert.deepEqual(f.calls[0].p_changes,{position:null});s.close();
});
