import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/account.js',import.meta.url),'utf8');
const flow=source.slice(source.indexOf("  window.addEventListener('pageshow'"),source.indexOf("  registration.addEventListener"));
for(const provider of ['google','custom:talktag-kakao'])test(`${provider}: provider navigation and cached Back recover controls`,async()=>{
 const events={},clicks={},states=[],messages=[];let destination,refreshes=0;
 const context={window:{addEventListener:(name,fn)=>events[name]=fn},busy:value=>states.push(value),say:value=>messages.push(value),refreshAccount:()=>refreshes++,kakaoEnabled:true,config:{googleEnabled:true},kakaoButton:{addEventListener:(_,fn)=>clicks.kakao=fn},googleButton:{addEventListener:(_,fn)=>clicks.google=fn},t:{redirecting:'opening',googleRedirect:'opening',error:'error'},redirectTo:'https://talktag.co.kr/account.html',justSignedOut:false,navigator:{userAgent:'Safari'},location:{assign:url=>destination=url},client:{auth:{signInWithOAuth:async request=>{assert.equal(request.provider,provider);assert.equal(request.options.skipBrowserRedirect,true);return {data:{url:'https://provider.example/authorize'}};}}}};
 vm.runInNewContext(flow,context);await clicks[provider==='google'?'google':'kakao']();assert.equal(destination,'https://provider.example/authorize');assert.equal(states.at(-1),true);
 events.pageshow({persisted:true});assert.equal(states.at(-1),false);assert.equal(messages.at(-1),'');assert.equal(refreshes,1);
});
