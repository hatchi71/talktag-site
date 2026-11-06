import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/protected-media.js';

const origin = 'https://talktag-app-preview.pages.dev';
const base = 'https://talktag-private-media-preview.ejkim2022.workers.dev';
const env = {
  ALLOWED_ORIGIN: `https://protected-a0-001.talktag-app-preview.pages.dev,${origin}`,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  TICKET_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  PRIVATE_AUDIO: {
    async get(key, options) {
      if (key !== 'English/test.mp3') return null;
      const range = options?.range?.get('Range');
      if (range === 'bytes=1-2') return { body: new Uint8Array([2, 3]), size: 3, range: { offset: 1, length: 2 }, httpEtag: '"test"' };
      return { body: new Uint8Array([1, 2, 3]), size: 3, httpEtag: '"test"' };
    },
    async head(key) { return key === 'English/test.mp3' ? { size: 3, httpEtag: '"test"' } : null; }
  }
};
const post = (path, auth) => new Request(`${base}${path}`, {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer test.jwt' } : {}) },
  body: JSON.stringify({ cardId: 'guided-a0-001' })
});

test('visitor cannot receive card text or a media ticket', async () => {
  for (const path of ['/api/card-content', '/api/media-ticket', '/api/catalog']) {
    assert.equal((await worker.fetch(post(path, false), env)).status, 401);
  }
});

test('unlisted browser origins cannot call the private catalog', async () => {
  const request = new Request(`${base}/api/catalog`, { method: 'POST',
    headers: { Origin: 'https://other.example', Authorization: 'Bearer test.jwt', 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'en', area: 'mini-talks', level: 'A1' }) });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('catalog passes only validated filters to the entitlement resolver', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_request, options) => {
    assert.deepEqual(JSON.parse(options.body), {
      p_language: 'ko', p_area: 'story-camp', p_level: 'B1'
    });
    return Response.json([{ card_id: 'ko-story-camp-001-b1', title: 'A New Plan' }]);
  };
  try {
    const request = new Request(`${base}/api/catalog`, { method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer test.jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'ko', area: 'story-camp', level: 'B1' }) });
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).cards.length, 1);
    const invalid = new Request(`${base}/api/catalog`, { method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer test.jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'ko', area: 'story-camp', level: 'ALL' }) });
    assert.equal((await worker.fetch(invalid, env)).status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('signed-in pilot receives a ticket only after entitlement lookup', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (request, options) => {
    const url = new URL(typeof request === 'string' ? request : request.url);
    assert.equal(options.headers.Authorization, 'Bearer test.jwt');
    if (url.pathname.endsWith('/resolve_talktag_card_content')) return Response.json({ id: 'guided-a0-001', title: 'Say Hello' });
    if (url.pathname.endsWith('/resolve_talktag_card_media')) return Response.json([{
      r2_key: 'English/test.mp3', mime_type: 'audio/mpeg', byte_length: 3, sha256: 'a'.repeat(64)
    }]);
    throw Error('Unexpected lookup');
  };
  try {
    const content = await worker.fetch(post('/api/card-content', true), env);
    assert.equal(content.status, 200);
    assert.equal((await content.json()).title, 'Say Hello');
    const ticket = await worker.fetch(post('/api/media-ticket', true), env);
    assert.equal(ticket.status, 200);
    const { url } = await ticket.json();
    const media = await worker.fetch(new Request(url, { headers: { Origin: origin } }), env);
    assert.equal(media.status, 200);
    assert.deepEqual(new Uint8Array(await media.arrayBuffer()), new Uint8Array([1, 2, 3]));
    const partial = await worker.fetch(new Request(url, { headers: { Origin: origin, Range: 'bytes=1-2' } }), env);
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('Content-Range'), 'bytes 1-2/3');
    assert.equal(partial.headers.get('Content-Length'), '2');
    assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), new Uint8Array([2, 3]));
    const head = await worker.fetch(new Request(url, { method: 'HEAD', headers: { Origin: origin } }), env);
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('Content-Length'), '3');
    assert.equal(await head.text(), '');
    assert.equal((await worker.fetch(new Request(`${url}bad`, { headers: { Origin: origin } }), env)).status, 403);
  } finally { globalThis.fetch = originalFetch; }
});

test('denied card access never creates a playable ticket', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  try {
    const response = await worker.fetch(post('/api/media-ticket', true), env);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'card_unavailable');
  } finally { globalThis.fetch = originalFetch; }
});

test('a media ticket stops working after five minutes', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const issuedAt = 1_800_000_000_000;
  globalThis.fetch = async () => Response.json([{
    r2_key: 'English/test.mp3', mime_type: 'audio/mpeg', byte_length: 3, sha256: 'a'.repeat(64)
  }]);
  Date.now = () => issuedAt;
  try {
    const response = await worker.fetch(post('/api/media-ticket', true), env);
    assert.equal(response.status, 200);
    const { url, expiresAt } = await response.json();
    assert.equal(expiresAt, issuedAt / 1000 + 300);
    Date.now = () => issuedAt + 300_000;
    assert.equal((await worker.fetch(new Request(url), env)).status, 403);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});


test('an issued ticket cannot bypass a subsequently revoked session or grant', async () => {
  const originalFetch = globalThis.fetch;
  let allowed = true;
  globalThis.fetch = async () => Response.json(allowed ? [{
    r2_key: 'English/test.mp3', mime_type: 'audio/mpeg', byte_length: 3, sha256: 'a'.repeat(64)
  }] : []);
  try {
    const { url } = await (await worker.fetch(post('/api/media-ticket', true), env)).json();
    assert.ok(!url.includes('test.jwt'));
    assert.equal((await worker.fetch(new Request(url), env)).status, 200);
    allowed = false;
    assert.equal((await worker.fetch(new Request(url), env)).status, 403);
    assert.equal((await worker.fetch(new Request(url, {method: 'HEAD'}), env)).status, 403);
  } finally { globalThis.fetch = originalFetch; }
});
