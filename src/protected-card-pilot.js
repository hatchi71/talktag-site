import { createClient } from '@supabase/supabase-js';

const cardId = 'guided-a0-001';
const workerOrigin = 'https://talktag-private-media-preview.ejkim2022.workers.dev';
const config = window.TalkTagAuthConfig || {};
const status = document.querySelector('#status');
const lesson = document.querySelector('#lesson');
const signIn = document.querySelector('#sign-in');
const audio = document.querySelector('#audio');
let ticketExpiresAt = 0;
let renewing = false;
const showError = (message, needsLogin = false) => {
  status.hidden = false;
  status.textContent = message;
  lesson.hidden = true;
  signIn.hidden = !needsLogin;
};

async function run() {
  if (!config.url || !config.publishableKey) {
    showError('Sign-in is unavailable right now.');
    return;
  }
  const client = createClient(config.url, config.publishableKey);
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session) {
    showError('Sign in to open this card.', true);
    return;
  }
  const request = async endpoint => {
    const { data: { session: currentSession } } = await client.auth.getSession();
    if (!currentSession) throw new Error('403');
    const response = await fetch(`${workerOrigin}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
      body: JSON.stringify({ cardId }),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  };
  const installTicket = ticket => {
    if (!ticket?.url) throw new Error('invalid_payload');
    const resume = audio.currentTime;
    ticketExpiresAt = Number(ticket.expiresAt) * 1000 || 0;
    audio.src = ticket.url;
    if (resume > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = resume; }, { once: true });
  };
  const renew = async () => {
    if (renewing || !ticketExpiresAt || Date.now() < ticketExpiresAt - 10_000) return;
    renewing = true;
    const wasPlaying = !audio.paused;
    try {
      installTicket(await request('/api/media-ticket'));
      if (wasPlaying) await audio.play();
    } catch { showError('The private audio could not reconnect. Please reopen this card.'); }
    finally { renewing = false; }
  };
  for (const event of ['play', 'waiting', 'stalled']) audio.addEventListener(event, renew);
  try {
    const [content, ticket] = await Promise.all([
      request('/api/card-content'), request('/api/media-ticket')
    ]);
    if (!content || content.id !== cardId || !ticket.url) throw new Error('invalid_payload');
    document.querySelector('#title').textContent = content.title || '';
    document.querySelector('#scene').textContent = content.scene || '';
    document.querySelector('#expression').textContent = content.expressions?.[0] || '';
    document.querySelector('#meaning').textContent = content.meanings?.[0] || '';
    document.querySelector('#prompt').textContent = content.tinyPrompt || '';
    const image = document.querySelector('#artwork');
    image.src = content.artwork;
    image.alt = content.artworkAlt || '';
    installTicket(ticket);
    status.hidden = true;
    lesson.hidden = false;
  } catch (error) {
    showError(error.message === '403' ? 'This card is not included in your membership.'
      : 'The private card could not load. Please try again shortly.');
  }
}

document.querySelector('#meaning-toggle').addEventListener('click', event => {
  const node = document.querySelector('#meaning');
  node.hidden = !node.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!node.hidden));
  event.currentTarget.textContent = node.hidden ? 'Show meaning' : 'Hide meaning';
});
run();
