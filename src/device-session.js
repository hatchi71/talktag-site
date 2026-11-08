const key=Symbol.for('talktag.deviceChecks');
const shared=globalThis[key] ||= {pending:new WeakMap(),watchers:new WeakMap()};
export function checkDeviceSession(client){
 if(shared.pending.has(client))return shared.pending.get(client);
 const request=Promise.resolve().then(()=>client.rpc('talktag_device_session_allowed')).then(({data,error})=>{
  if(error)throw new Error('Could not verify your active device. Please reconnect.');
  return data===true;
 }).finally(()=>{if(shared.pending.get(client)===request)shared.pending.delete(client);});
 shared.pending.set(client,request);return request;
}
export function invalidateDeviceSession(client){if(client)shared.pending.delete(client);}
export function watchDeviceSession(client,onReplaced,interval=15000){
 let watcher=shared.watchers.get(client);
 if(!watcher){
  watcher={callbacks:new Set(),stopped:false,busy:false};
  const check=async()=>{if(watcher.stopped||watcher.busy)return;watcher.busy=true;try{if(!await checkDeviceSession(client)){watcher.stopped=true;clearInterval(watcher.timer);for(const callback of [...watcher.callbacks])callback();}}catch{/* Server delivery stays protected; retry on the next check. */}finally{watcher.busy=false;}};
  watcher.timer=setInterval(check,interval);watcher.focus=check;
  window.addEventListener('focus',check);shared.watchers.set(client,watcher);
 }
 watcher.callbacks.add(onReplaced);
 return ()=>{watcher.callbacks.delete(onReplaced);if(!watcher.callbacks.size){watcher.stopped=true;clearInterval(watcher.timer);window.removeEventListener('focus',watcher.focus);shared.watchers.delete(client);}};
}
