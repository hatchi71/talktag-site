// Share only requests already in flight. Never cache an authorization result.
export function singleFlight(run) {
 let pending;
 const call=(...args)=>{
  if(pending)return pending;
  const request=Promise.resolve().then(()=>run(...args)).finally(()=>{if(pending===request)pending=null;});
  pending=request;return request;
 };
 // Authentication changes must start fresh work even if old work is unfinished.
 call.invalidate=()=>{pending=null;};
 return call;
}
