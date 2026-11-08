import cards from '../../workers/picture-talk-cards.js';
export async function onRequestPost({request}) {
 const authorization=request.headers.get('Authorization')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(authorization))return new Response('{}',{status:401,headers});
 const check=await fetch('https://kgqgrlzrkpjcudjyiwkj.supabase.co/rest/v1/rpc/talktag_device_session_allowed',{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_9tPpE7TjNL85TzAjqM76iA_5paIvn_u',Authorization:authorization},body:'{}'});
 if(!check.ok || await check.json()!==true)return new Response('{}',{status:403,headers});
 return new Response(JSON.stringify(cards),{headers});
}
