import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/account.js',import.meta.url),'utf8');
const fn=s.slice(s.indexOf('  async function signedInDestination'),s.indexOf("  const reauthKey"));
for(const [name,data,error,expected] of [['admin',[{role:'admin'}],null,'/E-english.html?view=myspace'],['free',[],null,'/K-korean.html'],['snowpal',[{role:'snowman'}],null,'/K-korean.html'],['failed role lookup',[{role:'admin'}],true,'/K-korean.html']])test(name,async()=>{
const c=vm.createContext({preferredLandingLanguage:'en',landingHref:'/K-korean.html',client:{from:()=>({select:()=>({eq:async()=>({data,error})})})}});vm.runInContext(fn,c);assert.equal(await c.signedInDestination({id:'verified-user'}),expected);
});
