import test from 'node:test';import assert from 'node:assert/strict';import {compareMembers} from '../src/manager-model.js';
const members=[{name:'Zoe',rank:0},{name:'Anna',rank:1},{name:'',rank:2}];
test('registration order works both ways',()=>{assert.deepEqual([...members].sort((a,b)=>compareMembers(a,b)).map(x=>x.rank),[0,1,2]);assert.deepEqual([...members].sort((a,b)=>compareMembers(a,b,'registered','asc')).map(x=>x.rank),[2,1,0]);});
test('name order reverses and unnamed accounts stay last',()=>{assert.deepEqual([...members].sort((a,b)=>compareMembers(a,b,'name','asc')).map(x=>x.rank),[1,0,2]);assert.deepEqual([...members].sort((a,b)=>compareMembers(a,b,'name','desc')).map(x=>x.rank),[0,1,2]);});
