// TalkTag private media delivery. Bind PRIVATE_AUDIO to a bucket without a
// public R2 URL. The browser first requests a card-specific playback ticket.
const encoder = new TextEncoder();
const MAX_TICKET_SECONDS = 5 * 60;

function cors(origin, env) {
  const headers = new Headers({ Vary: 'Origin', 'Cache-Control': 'no-store' });
  if (origin && allowedOrigin(origin, env)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, ETag');
  }
  return headers;
}

function allowedOrigin(origin, env) {
  return typeof origin === 'string' && (env.ALLOWED_ORIGIN || '')
    .split(',').map(value => value.trim()).includes(origin);
}

function json(value, status, headers) {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { status, headers });
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unbase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('Bad ticket');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function signer(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Keep the originating authorization encrypted; never put a readable JWT in a URL.
// Every new media request rechecks the same card entitlement and winning session.
async function authorizationKey(secret) {
  const material = await crypto.subtle.digest('SHA-256', encoder.encode('talktag-media-auth-v1:' + secret));
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function sealAuthorization(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv },
    await authorizationKey(secret), encoder.encode(value)));
  return base64url(iv) + '.' + base64url(encrypted);
}
async function openAuthorization(value, secret) {
  const [iv, encrypted] = value.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64url(iv) },
    await authorizationKey(secret), unbase64url(encrypted)));
}

function validRequest(request, env) {
  return allowedOrigin(request.headers.get('Origin'), env)
    && /^Bearer [A-Za-z0-9._~-]+$/.test(request.headers.get('Authorization') || '');
}

async function lookup(request, env, rpc, input) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: request.headers.get('Authorization')
    },
    body: JSON.stringify(input),
    cache: 'no-store'
  });
}

async function issueTicket(request, env, headers) {
  if (!validRequest(request, env)) return json({ error: 'sign_in_required' }, 401, headers);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
  const cardId = input?.cardId;
  const variant = input?.variant || 'main';
  if (typeof cardId !== 'string' || cardId.length > 160 ||
      typeof variant !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(variant)) {
    return json({ error: 'bad_request' }, 400, headers);
  }
  const auth = await lookup(request, env, 'resolve_talktag_card_media',
    { p_card_id: cardId, p_variant: variant });
  if (auth.status === 401 || auth.status === 403) return json({ error: 'sign_in_required' }, 401, headers);
  if (!auth.ok) return json({ error: 'access_unavailable' }, 503, headers);
  const rows = await auth.json();
  if (!Array.isArray(rows) || rows.length !== 1) return json({ error: 'card_unavailable' }, 403, headers);
  const media = rows[0];
  if (!media || typeof media.r2_key !== 'string' || media.r2_key.startsWith('/') ||
      media.r2_key.includes('..')) return json({ error: 'access_unavailable' }, 503, headers);
  const expires = Math.floor(Date.now() / 1000) + MAX_TICKET_SECONDS;
  const payload = base64url(encoder.encode(JSON.stringify({
    key: media.r2_key, mime: media.mime_type, exp: expires,
    bytes: media.byte_length, sha256: media.sha256, cardId, variant,
    authorization: await sealAuthorization(request.headers.get('Authorization'), env.TICKET_SECRET)
  })));
  const signature = base64url(new Uint8Array(await crypto.subtle.sign('HMAC',
    await signer(env.TICKET_SECRET), encoder.encode(payload))));
  const url = new URL(request.url);
  return json({ url: `${url.origin}/media/${payload}.${signature}`, expiresAt: expires }, 200, headers);
}

async function serveContent(request, env, headers) {
  if (!validRequest(request, env)) return json({ error: 'sign_in_required' }, 401, headers);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
  const cardId = input?.cardId;
  if (typeof cardId !== 'string' || !cardId || cardId.length > 160) {
    return json({ error: 'bad_request' }, 400, headers);
  }
  const auth = await lookup(request, env, 'resolve_talktag_card_content',
    { p_card_id: cardId });
  if (auth.status === 401 || auth.status === 403) return json({ error: 'sign_in_required' }, 401, headers);
  if (!auth.ok) return json({ error: 'access_unavailable' }, 503, headers);
  const content = await auth.json();
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return json({ error: 'card_unavailable' }, 403, headers);
  }
  return json(content, 200, headers);
}

async function serveCatalog(request, env, headers) {
  if (!validRequest(request, env)) return json({ error: 'sign_in_required' }, 401, headers);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
  const language = input?.language;
  const area = input?.area;
  const level = input?.level ?? null;
  if (!['en', 'ko', 'ja'].includes(language) ||
      !['guided-listen-repeat', 'mini-talks', 'vocal-camp', 'story-camp', 'readable', 'test-content'].includes(area) ||
      (level !== null && !['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level))) {
    return json({ error: 'bad_request' }, 400, headers);
  }
  const auth = await lookup(request, env, 'list_talktag_cards',
    { p_language: language, p_area: area, p_level: level });
  if (auth.status === 401 || auth.status === 403) return json({ error: 'sign_in_required' }, 401, headers);
  if (!auth.ok) return json({ error: 'access_unavailable' }, 503, headers);
  const cards = await auth.json();
  if (!Array.isArray(cards)) return json({ error: 'access_unavailable' }, 503, headers);
  return json({ cards }, 200, headers);
}

async function serveMedia(request, env, headers, ticket) {
  const pieces = ticket.match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!pieces) return new Response(null, { status: 404, headers });
  let payload;
  try {
    const valid = await crypto.subtle.verify('HMAC', await signer(env.TICKET_SECRET),
      unbase64url(pieces[2]), encoder.encode(pieces[1]));
    if (!valid) return new Response(null, { status: 403, headers });
    payload = JSON.parse(new TextDecoder().decode(unbase64url(pieces[1])));
  } catch { return new Response(null, { status: 403, headers }); }
  if (!Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000 ||
      typeof payload.key !== 'string' || payload.key.startsWith('/') ||
      payload.key.includes('..')) return new Response(null, { status: 403, headers });

  // Fail closed for older unbound tickets, revoked membership, or a replaced device.
  let authorization;
  try { authorization = await openAuthorization(payload.authorization, env.TICKET_SECRET); }
  catch { return new Response(null, { status: 403, headers }); }
  let check;
  try {
    check = await lookup(new Request(request.url, { headers: { Authorization: authorization } }), env,
      'resolve_talktag_card_media', { p_card_id: payload.cardId, p_variant: payload.variant });
  } catch { return new Response(null, { status: 503, headers }); }
  if (!check.ok) return new Response(null, { status: check.status === 401 || check.status === 403 ? 403 : 503, headers });
  let rows;
  try { rows = await check.json(); } catch { return new Response(null, { status: 503, headers }); }
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].r2_key !== payload.key ||
      rows[0].sha256 !== payload.sha256 || rows[0].byte_length !== payload.bytes) {
    return new Response(null, { status: 403, headers });
  }

  const object = request.method === 'HEAD' 
    ? await env.PRIVATE_AUDIO.head(payload.key)
    : await env.PRIVATE_AUDIO.get(payload.key, { range: request.headers });
  if (!object) return new Response(null, { status: 404, headers });
  if (!Number.isSafeInteger(payload.bytes) || object.size !== payload.bytes) {
    return new Response(null, { status: 503, headers });
  }
  headers.set('Content-Type', payload.mime || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Content-Length', String(object.range?.length || object.size));
  const partial = Boolean(request.headers.get('Range') && object.range);
  if (partial) headers.set('Content-Range',
    `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
  return new Response(request.method === 'HEAD' ? null : object.body,
    { status: partial ? 206 : 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request.headers.get('Origin'), env);
    if (!env.PRIVATE_AUDIO || !env.TICKET_SECRET || !env.SUPABASE_URL ||
        !env.SUPABASE_PUBLISHABLE_KEY || !env.ALLOWED_ORIGIN) {
      return json({ error: 'service_unavailable' }, 503, headers);
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/api/media-ticket' && request.method === 'POST') {
      return issueTicket(request, env, headers);
    }
    if (url.pathname === '/api/card-content' && request.method === 'POST') {
      return serveContent(request, env, headers);
    }
    if (url.pathname === '/api/catalog' && request.method === 'POST') {
      return serveCatalog(request, env, headers);
    }
    if (url.pathname.startsWith('/media/') && ['GET', 'HEAD'].includes(request.method)) {
      return serveMedia(request, env, headers, url.pathname.slice('/media/'.length));
    }
    return new Response(null, { status: 404, headers });
  }
};
