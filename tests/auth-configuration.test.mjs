import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAuthConfigurationLoader} from '../src/auth-configuration.js';
const fixture=()=>{
 const scope={},scripts=[];
 const doc={createElement:()=>({remove(){}}),head:{append(s){scripts.push(s)}}};
 return {scope,scripts,load:makeAuthConfigurationLoader(scope,doc,100)};
};
test('configuration arriving after MySpace startup is awaited',async()=>{
 const f=fixture(),first=f.load(),second=f.load();assert.equal(first,second);assert.equal(f.scripts.length,1);
 f.scope.TalkTagAuthConfig={url:'https://example.test',publishableKey:'public'};f.scripts[0].onload();assert.equal(await first,f.scope.TalkTagAuthConfig);
});
test('a network error permits a fresh retry',async()=>{
 const f=fixture(),first=f.load();f.scripts[0].onerror();await assert.rejects(first,/network/);
 const retry=f.load();f.scope.TalkTagAuthConfig={url:'https://example.test',publishableKey:'public'};f.scripts[1].onload();assert.ok(await retry);
});
test('existing configuration needs no extra network request',async()=>{
 const f=fixture();f.scope.TalkTagAuthConfig={url:'https://example.test',publishableKey:'public'};await f.load();assert.equal(f.scripts.length,0);
});
