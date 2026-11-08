import { createClient } from '@supabase/supabase-js';

const entry = document.querySelector('#tt-temp-account-entry');
const config = window.TalkTagAuthConfig;
if (entry && config?.url && config?.publishableKey) {
  const english = entry.dataset.language === 'en';
  const label = entry.querySelector('[data-account-label]');
  const client = (window.__talktagAccessClient ||= createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  }));
  let signedIn = false;
  function paint(session) {
    const user = session?.user;
    signedIn = Boolean(user);
    if (!user) {
      label.textContent = english ? 'Log in' : '로그인';
      entry.setAttribute('aria-label', english ? 'Log in to TalkTag' : 'TalkTag 로그인');
      entry.classList.remove('is-signed-in');
      entry.classList.add('is-signed-out');
      return;
    }
    label.textContent = english ? 'Log out' : '로그아웃';
    entry.setAttribute('aria-label', english ? `Sign out${user.email ? ` (${user.email})` : ''}` : `로그아웃${user.email ? ` (${user.email})` : ''}`);
    entry.classList.add('is-signed-in');
    entry.classList.remove('is-signed-out');
  }
  async function update() {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) {
        label.textContent = english ? 'Check account' : '계정 확인';
        entry.setAttribute('aria-label', english ? 'Check TalkTag account status' : 'TalkTag 계정 상태 확인');
        entry.classList.remove('is-signed-in');
        entry.classList.add('is-signed-out');
        return;
      }
      paint(session);
    } catch {
      label.textContent = english ? 'Check account' : '계정 확인';
      entry.setAttribute('aria-label', english ? 'Check TalkTag account status' : 'TalkTag 계정 상태 확인');
      entry.classList.remove('is-signed-in');
      entry.classList.add('is-signed-out');
    }
  }

  entry.addEventListener('click', async event => {
    if (!signedIn) return;
    event.preventDefault();
    if (entry.getAttribute('aria-busy') === 'true') return;
    entry.setAttribute('aria-busy', 'true');
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        label.textContent = english ? 'Try sign out again' : '다시 로그아웃';
        return;
      }
      paint(null);
      window.dispatchEvent(new Event('talktag:auth-signed-out'));
    } finally {
      entry.removeAttribute('aria-busy');
    }
  });
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      paint(session);
      if (event === 'SIGNED_OUT') window.dispatchEvent(new Event('talktag:auth-signed-out'));
    }
  });
  update();
  window.addEventListener('storage', event => { if (!event.key || event.key.includes('auth-token')) update(); });
  window.addEventListener('pageshow', update);
}
