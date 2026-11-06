export async function checkDeviceSession(client){
 const {data,error}=await client.rpc('talktag_device_session_allowed');
 if(error)throw new Error('Could not verify your active device. Please reconnect.');
 return data===true;
}
export function watchDeviceSession(client,onReplaced,interval=15000){
 let stopped=false,busy=false;
 const check=async()=>{if(stopped||busy)return;busy=true;try{if(!await checkDeviceSession(client)){stopped=true;clearInterval(timer);onReplaced();}}catch{/* Network failure is retried; server requests remain protected. */}finally{busy=false;}};
 const timer=setInterval(check,interval);
 const focus=()=>check();window.addEventListener('focus',focus);
 return ()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',focus);};
}
