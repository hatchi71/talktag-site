import clips from '../../workers/picture-talk-audio.js';
export async function onRequestGet({request}) {
 const authorization=request.headers.get('Authorization')||'';
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(authorization))return new Response(null,{status:401,headers});
 const check=await fetch('https://kgqgrlzrkpjcudjyiwkj.supabase.co/rest/v1/rpc/talktag_device_session_allowed',{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_9tPpE7TjNL85TzAjqM76iA_5paIvn_u',Authorization:authorization},body:'{}'});
 if(!check.ok || await check.json()!==true)return new Response(null,{status:403,headers});
 const clip=clips[new URL(request.url).searchParams.get('id')];
 if(!clip)return new Response(null,{status:404,headers});
 const bytes=Uint8Array.from(atob(clip),c=>c.charCodeAt(0));
 return new Response(bytes,{headers:{...headers,'Content-Type':'audio/mpeg','Content-Length':String(bytes.length)}});
}
