import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
async function exercise(state){
 let notice,reloads=0,controllerWaits=0;const eventHandlers={};
 const button={style:{},disabled:false,textContent:'',addEventListener:(name,fn)=>eventHandlers[name]=fn};const small={style:{}},strong={style:{}};
 const doc={readyState:'complete',body:{classList:{contains:()=>false},appendChild:n=>notice=n},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},createElement:()=>({style:{},setAttribute:()=>{},querySelector:s=>s==='button'?button:s==='small'?small:strong})};
 const worker={state,postMessage:(msg,ports)=>{if(msg.type==='GET_VERSION')ports[0].postMessage({version:'new-version'});}};
 const sw={controller:worker,register:async()=>({waiting:worker,active:worker,addEventListener:()=>{},update:async()=>{}}),addEventListener:()=>controllerWaits++,removeEventListener:()=>{}};
 class Channel{constructor(){this.port1={};this.port2={postMessage:data=>this.port1.onmessage?.({data})};}}
 const context={window:{isSecureContext:true},navigator:{serviceWorker:sw,onLine:true},document:doc,location:{pathname:'/K-korean.html',reload:()=>reloads++},localStorage:{getItem:()=>null,setItem:()=>{}},MessageChannel:Channel,setTimeout,clearTimeout,addEventListener:()=>{},console};
 vm.runInNewContext(fs.readFileSync('public/pwa.js','utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));assert.ok(notice);await eventHandlers.click();return {button,reloads,controllerWaits};
}
test('already-active worker reloads without waiting for a controller-change event',async()=>{const result=await exercise('activated');assert.equal(result.reloads,1);assert.equal(result.controllerWaits,0);assert.equal(result.button.disabled,false);assert.equal(result.button.textContent,'Refresh');});
test('redundant worker cannot leave update button disabled',async()=>{const result=await exercise('redundant');assert.equal(result.reloads,1);assert.equal(result.button.disabled,false);});
