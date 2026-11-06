import { checkDeviceSession, watchDeviceSession } from './device-session.js';
import { connectMemberRecords } from './member-records.js';
import { createClient } from '@supabase/supabase-js';

const FREE_LIMIT = 10;
const fullTiers = new Set(['trial', 'member', 'snowpal', 'snowman', 'admin']);
const config = window.TalkTagAuthConfig || {};
const routeLanguage = new URLSearchParams(location.search).get('lang');
const lang = location.pathname.startsWith('/japanese/') ? 'ja'
  : (window.TalkTagNative?.language === 'ko' || routeLanguage === 'ko' || location.pathname.startsWith('/K-korean')) ? 'ko' : 'en';
const words = {
  en: {
    free: 'FREE', locked: 'SIGN IN OR MEMBERSHIP REQUIRED',
    note: 'Sign in to use this card.',
    visitorStatus: 'Sign in to use cards. A free account opens cards 001–010 in each level of each learning area.',
    signedInFreeStatus: 'Free member · Cards 001–010 in each level of each learning area are available. A Trial or monthly membership opens all cards.',
    fullStatus: 'Full access is active for this account.',
    unknownStatus: 'We could not confirm the account plan. Cards stay locked until access is verified.',
    test: 'Test practice is for members. You can still visit the Test Preppers landing page.',
    unknown: 'We could not verify access just now. Sign in or try again.',
    visitorTitle: 'Sign in to use TalkTag cards',
    visitorBody: 'Cards are available to signed-in members. A free account opens cards 001–010 in each level of every learning area.',
    freeLockedNote: 'This card needs a Trial or monthly membership.',
    unknownNote: 'Access could not be confirmed. Please try again.',
    cta: 'Account & membership →', retry: 'Try again',
    title: 'Keep learning with TalkTag',
    body: 'Sign in to use TalkTag cards. A free account opens cards 001–010 in every level of every learning area. Trial members, monthly Members, Snowpals, and Administrators have full access.',
    login: 'Sign in or view your account →'
  },
  ko: {
    free: '무료', locked: '로그인 또는 회원 권한 필요',
    note: '카드를 이용하려면 먼저 로그인해 주세요.',
    visitorStatus: '카드를 이용하려면 로그인해 주세요. 무료 회원은 각 학습 영역의 레벨마다 001~010번 카드를 이용할 수 있어요.',
    signedInFreeStatus: '무료 회원 · 각 학습 영역의 레벨마다 001~010번 카드를 이용할 수 있어요. 체험 회원 또는 월 정기 회원은 모든 카드를 이용할 수 있습니다.',
    fullStatus: '이 계정은 전체 콘텐츠를 이용할 수 있습니다.',
    unknownStatus: '회원 상태를 확인하지 못했어요. 확인될 때까지 카드는 잠겨 있습니다.',
    test: '시험 연습 콘텐츠는 회원 전용입니다. 시험 안내 페이지는 계속 볼 수 있습니다.',
    unknown: '이용 범위를 확인할 수 없습니다. 로그인하거나 다시 시도해 주세요.',
    visitorTitle: 'TalkTag 카드 이용을 위해 로그인해 주세요',
    visitorBody: '카드는 로그인한 회원이 이용할 수 있습니다. 무료 회원은 각 학습 영역의 각 레벨에서 001~010번 카드를 이용할 수 있어요.',
    freeLockedNote: '이 카드는 체험 회원 또는 월 정기 회원 전용입니다.',
    unknownNote: '이용 권한을 확인하지 못했어요. 다시 시도해 주세요.',
    cta: '계정 및 회원 정보 →', retry: '다시 확인',
    title: 'TalkTag와 계속 배워요',
    body: '카드를 이용하려면 로그인해 주세요. 무료 회원은 각 학습 영역의 각 레벨에서 001~010번 카드를 이용할 수 있습니다. 체험 회원, 월 정기 회원, 스노우팔, 관리자 계정은 전체 콘텐츠를 이용할 수 있습니다.',
    login: '로그인 또는 계정 확인 →'
  },
  ja: {
    free: '無料', locked: 'ログインまたは会員登録が必要',
    note: 'カードを利用するにはログインしてください。',
    visitorStatus: 'カードを利用するにはログインしてください。無料アカウントでは各学習エリアの各レベルのカード001〜010を利用できます。',
    signedInFreeStatus: '無料会員 · 各学習エリアの各レベルでカード001〜010を利用できます。トライアルまたは月額会員は全カードを利用できます。',
    fullStatus: 'このアカウントでは全コンテンツを利用できます。',
    unknownStatus: '会員状態を確認できません。確認できるまでカードはロックされます。',
    test: '試験対策コンテンツは会員限定です。試験案内ページは引き続きご覧いただけます。',
    unknown: 'アクセスを確認できませんでした。ログインするか、もう一度お試しください。',
    visitorTitle: 'TalkTagのカードを使うにはログインしてください',
    visitorBody: 'カードはログイン後に利用できます。無料アカウントでは各学習エリアの各レベルのカード001〜010を利用できます。',
    freeLockedNote: 'このカードはトライアルまたは月額会員向けです。',
    unknownNote: 'アクセス権を確認できません。もう一度お試しください。',
    cta: 'アカウント・会員情報 →', retry: '再確認',
    title: 'TalkTagで学習を続けましょう',
    body: 'カードを使うにはログインしてください。無料会員は各学習エリアの各レベルでカード001〜010を利用できます。トライアル、月額会員、Snowpal、管理者は全コンテンツを利用できます。',
    login: 'ログイン・アカウント確認 →'
  }
}[lang === 'ko' ? 'en' : 'ko'];

function getClient() {
  if (!config.url || !config.publishableKey || !/^sb_publishable_/.test(config.publishableKey)) return null;
  if (!window.__talktagAccessClient) {
    window.__talktagAccessClient = createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  return window.__talktagAccessClient;
}

let stopDeviceWatch, watchedDeviceUser;
async function resolveTier() {
  const client = getClient();
  if (!client) return { tier: 'visitor', user: null };
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) return { tier: 'unknown', user: null };
    if (!session?.user) { window.TalkTagMemberRecords = null; return { tier: 'visitor', user: null }; }
    const user = session.user;
    if(!await checkDeviceSession(client)){await client.auth.signOut({scope:'local'});return {tier:'visitor',user:null};}
    if(watchedDeviceUser!==user.id){stopDeviceWatch?.();watchedDeviceUser=user.id;stopDeviceWatch=watchDeviceSession(client,()=>{watchedDeviceUser=null;window.TalkTagMemberRecords=null;client.auth.signOut({scope:'local'});});}
    await connectMemberRecords(client, user.id);
    const [membershipResult, rolesResult] = await Promise.all([
      client.from('memberships').select('status,trial_months,active_from,active_until').eq('user_id', user.id).maybeSingle(),
      client.from('staff_roles').select('role').eq('user_id', user.id)
    ]);
    if (membershipResult.error || rolesResult.error) return { tier: 'unknown', user };
    const now = Date.now();
    const roles = new Set((rolesResult.data || []).map(row => row.role));
    if (roles.has('admin')) return { tier: 'admin', user };
    if (roles.has('snowpal') || roles.has('snowman')) return { tier: 'snowpal', user };
    const membership = membershipResult.data;
    const starts = !membership?.active_from || Date.parse(membership.active_from) <= now;
    const ends = !membership?.active_until || Date.parse(membership.active_until) > now;
    if (membership?.status === 'trial' && Number.isInteger(membership.trial_months)
      && membership.trial_months > 0 && membership.active_from && membership.active_until
      && starts && ends) return { tier: 'trial', user };
    if (['active', 'canceled'].includes(membership?.status) && membership?.active_from && membership?.active_until && starts && ends) return { tier: 'member', user };
    return { tier: 'free', user };
  } catch {
    return { tier: 'unknown', user: null };
  }
}

const statePromise = resolveTier();
const authClient = getClient();
let currentTier = null;
let currentUser = null;
let accessRefresh = Promise.resolve();
function refreshAccessState() {
  accessRefresh = accessRefresh.then(async () => {
    const { tier, user } = await resolveTier();
    currentTier = tier;
    currentUser = user;
    const page = currentProtectedPage();
    const accessPanel = document.querySelector('main .tt-access-panel');
    if (page) {
      const allowed = fullTiers.has(tier) || (tier === 'free' && page.area !== 'test-content' && page.ordinal <= FREE_LIMIT);
      if (!allowed) {
        if (!accessPanel) blockPage(page, tier);
        return;
      }
      // Restore the original page only when an access panel was previously shown.
      // The next load will be allowed and therefore cannot trigger another reload.
      if (accessPanel) { location.reload(); return; }
    }
    showAccessStatus(tier, user);
    applyCatalogCards(tier);
  }).catch(() => {});
  return accessRefresh;
}
authClient?.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') lockForSignedOut();
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    // Reconcile access in place. Reloading on every Supabase auth notification
    // can race session restoration and make the lesson list appear to lose cards.
    setTimeout(refreshAccessState, 0);
  }
});
window.addEventListener('talktag:auth-signed-out', lockForSignedOut);
window.addEventListener('storage', event => {
  if (!event.key?.includes('auth-token')) return;
  if (event.newValue === null) lockForSignedOut();
  else refreshAccessState();
});
// Reconcile server completion when returning from a player or another app tab.
window.addEventListener('focus', refreshAccessState);
window.addEventListener('pageshow', async event => {
  if (!event.persisted) return;
  refreshAccessState();
});
function normalizedPath(path = location.pathname) {
  return path.toLowerCase().replace(/\.html$/, '').replace(/\/$/, '');
}
function isTestContentPath(path = location.pathname) {
  const lower = normalizedPath(path);
  return lower === '/toeic' || lower.startsWith('/toeic/')
    || /\/(?:japanese\/)?(?:j-)?(?:jpt|jlpt)(?:[-/][^/]*)?$/.test(lower);
}
function isToeicLandingPath(path = location.pathname) { return /\/toeic(?:\/index)?$/.test(normalizedPath(path)); }
function isTestLandingPath(path = location.pathname) {
  const lower = normalizedPath(path);
  return isToeicLandingPath(lower) || /\/japanese\/(?:j-)?(?:jpt|jlpt)$/.test(lower);
}
function accessOrdinalForAudio(id) {
  const lessons = window.TalkTagAudioLessons;
  if (!Array.isArray(lessons)) {
    const encoded = String(id || '').match(/-(\d{3})(?:-|$)/)?.[1];
    return encoded ? Number(encoded) : null;
  }
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) {
    const encoded = String(id || '').match(/-(\d{3})(?:-|$)/)?.[1];
    return encoded ? Number(encoded) : null;
  }
  const unit = Number(lesson.unit || lesson.episode);
  if (Number.isInteger(unit) && unit > 0) return unit;
  const explicitNumber = String(lesson.id || '').match(/-(\d{3})(?:-|$)/)?.[1]
    || String(lesson.id || '').match(/-(\d+)(?:$)/)?.[1];
  if (explicitNumber && Number(explicitNumber) > 0) return Number(explicitNumber);
  const languageFor = item => item.language || (/^(?:ko-|mt-ko-)/.test(item.id) ? 'ko' : /^(?:ja-|mt-ja-)/.test(item.id) ? 'ja' : 'en');
  const sameLevel = lessons.filter(item => item.type === lesson.type && item.level === lesson.level
    && languageFor(item) === lang && (lesson.type !== 'plain' || item.format === lesson.format));
  return sameLevel.findIndex(item => item.id === id) + 1;
}
function accessOrdinalForFamily(camp, familyNumber, requestedLevel = 'A1') {
  const number = Number.parseInt(familyNumber, 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function currentProtectedPage() {
  const path = location.pathname;
  if (isTestContentPath(path) && !isTestLandingPath(path)) return { area: 'test-content', ordinal: Infinity };
  const id = new URLSearchParams(location.search).get('id');
  const route = normalizedPath(path);
  if (/\/(?:audio-player|k-korean-audio-player|j-glr-player)$/.test(route) && id) {
    const ordinal = accessOrdinalForAudio(id) || Infinity;
    return { area: id.includes('mini') || id.startsWith('mt-') ? 'mini-talks' : 'guided-listen-repeat', ordinal };
  }
  if (/vocalcamp-(?:family|player)|J-vocalcamp-player/i.test(path)) {
    const params = new URLSearchParams(location.search);
    const ordinal = accessOrdinalForFamily('vocal', params.get('family'), params.get('level') || 'A1') || Infinity;
    return { area: 'vocal-camp', ordinal };
  }
  if (/storycamp-(?:family|reader)|J-storycamp-reader/i.test(path)) {
    const params = new URLSearchParams(location.search);
    const ordinal = accessOrdinalForFamily('story', params.get('family'), params.get('level') || 'A1') || Infinity;
    return { area: 'story-camp', ordinal };
  }
  if (/\/k-korean-starter$/.test(route)) {
    return { area: 'story-camp', ordinal: 1 };
  }
  if (/\/(?:k-korean-)?readable-chapter$/.test(route)) {
    const params = new URLSearchParams(location.search);
    const unit = (params.get('id') || '').match(/(\d{3})$/)?.[1];
    return { area: 'readable', ordinal: unit ? Number(unit) : Infinity };
  }
  return null;
}
function accountHref() {
  return `/account.html?ui=${lang === 'ko' ? 'en' : 'ko'}&preview=1&from=${lang}`;
}
function canAccessPage(tier, page) {
  return fullTiers.has(tier)
    || (tier === 'free' && page.area !== 'test-content' && page.ordinal >= 1 && page.ordinal <= FREE_LIMIT);
}
function lockForSignedOut() {
  window.TalkTagMemberRecords = null;
  window.dispatchEvent(new CustomEvent('talktag:completion-change'));
  currentTier = 'visitor';
  currentUser = null;
  applyCatalogCards('visitor');
  const page = currentProtectedPage();
  if (page && !document.querySelector('main .tt-access-panel')) blockPage(page, 'visitor');
  showAccessStatus('visitor', null);
}
function addStyles() {
  if (document.getElementById('tt-access-style')) return;
  const style = document.createElement('style');
  style.id = 'tt-access-style';
  style.textContent = `.tt-access-pill{display:inline-flex;align-items:center;margin:0 8px 6px 0;padding:3px 9px;border:1px solid #a8d4b5;border-radius:999px;background:#e7f4e9;color:#276744;font-size:11px;font-weight:900;letter-spacing:.04em}.tt-access-pill.is-locked{border-color:#e1cba5;background:#f7efe1;color:#78511d}.tt-access-locked{position:relative;opacity:.9}.tt-access-locked .tt-access-disabled{pointer-events:none!important;cursor:not-allowed!important;filter:grayscale(.55);background:#e9e6df!important;color:#77808a!important;box-shadow:none!important}.tt-access-lock-note{margin:0;color:#766348;font-size:13px;font-weight:750;line-height:1.45}.tt-access-prompt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 14px;margin-top:10px;padding:10px 12px;border:1px solid #e5dccb;border-radius:14px;background:#f7f3eb}.tt-access-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0;padding:9px 14px;border:1px solid #c8d6e7;border-radius:12px;background:#edf4fc;color:#153a6a;text-decoration:none;font-size:13px;font-weight:850}.tt-access-panel{max-width:680px;margin:clamp(24px,7vh,72px) auto;padding:clamp(22px,5vw,40px);border:1px solid #3c5874;border-radius:26px;background:#1a304d;color:#eef4ff;box-shadow:0 20px 55px #081a2c35}.tt-access-panel h1,.tt-access-panel h2{margin:0 0 12px;color:#f4f7ff;font-size:clamp(27px,5vw,40px);line-height:1.1}.tt-access-panel p{color:#c6d2e2}.tt-access-panel .tt-access-cta{min-width:190px;min-height:48px;background:#78a8ff;color:#122d4f;border:0}.tt-access-panel button{min-height:44px;padding:9px 14px;border:1px solid #6c8099;border-radius:12px;background:transparent;color:#eff5ff;font:inherit;font-weight:800}.tt-access-status{margin:0 16px 12px;padding:8px 12px;border:1px solid #d8e1dc;border-radius:12px;color:#526578;font-size:13px}@media(max-width:560px){.tt-access-prompt{grid-template-columns:1fr}.tt-access-prompt .tt-access-cta{justify-self:start}}`;
  style.textContent += `html[data-appearance=dark] .tt-access-prompt{background:#13243d;border-color:#344b68}html[data-appearance=dark] .tt-access-lock-note{color:#d4c4a7}html[data-appearance=dark] .tt-access-cta{background:#1b3659;border-color:#51729b;color:#e5efff}html[data-appearance=dark] .tt-access-pill{background:#193b31;border-color:#39745d;color:#d8f1e4}html[data-appearance=dark] .tt-access-pill.is-locked{background:#493b2c;border-color:#80603c;color:#f1dfc7}`;
  document.head.append(style);
}
function markCard(card, allowed, showFreeBadge) {
  if (allowed) {
    if (card.classList.contains('tt-access-locked')) {
      card.classList.remove('tt-access-locked');
      card.querySelector('.tt-access-pill.is-locked')?.remove();
      card.querySelector('.tt-access-prompt')?.remove();
      card.querySelectorAll('a.tt-access-disabled').forEach(anchor => {
        const href = anchor.dataset.ttAccessOriginalHref;
        if (href) anchor.setAttribute('href', href);
        delete anchor.dataset.ttAccessOriginalHref;
        anchor.classList.remove('tt-access-disabled');
        anchor.removeAttribute('aria-disabled');
        anchor.removeAttribute('tabindex');
      });
      card.querySelectorAll('[data-tt-access-was-disabled]').forEach(control => {
        control.disabled = control.dataset.ttAccessWasDisabled === 'true';
        delete control.dataset.ttAccessWasDisabled;
        control.removeAttribute('aria-disabled');
      });
    }
    if (!showFreeBadge) card.querySelector('.tt-access-pill:not(.is-locked)')?.remove();
    if (showFreeBadge && !card.querySelector('.tt-access-pill')) {
      const pill = document.createElement('span');
      pill.className = 'tt-access-pill'; pill.textContent = words.free;
      (card.querySelector('.lesson-card-actions,.camp-episode-actions') || card).prepend(pill);
    }
    return;
  }
  if (card.classList.contains('tt-access-locked')) return;
  card.querySelector('.tt-access-pill:not(.is-locked)')?.remove();
  card.classList.add('tt-access-locked');
  const badge = document.createElement('span'); badge.className = 'tt-access-pill is-locked'; badge.textContent = words.locked;
  (card.querySelector('.lesson-card-actions,.camp-episode-actions') || card).prepend(badge);
  card.querySelectorAll('a[href]').forEach(anchor => {
    anchor.dataset.ttAccessOriginalHref = anchor.getAttribute('href');
    anchor.classList.add('tt-access-disabled');
    anchor.removeAttribute('href');
    anchor.setAttribute('aria-disabled', 'true');
    anchor.setAttribute('tabindex', '-1');
  });
  card.querySelectorAll('.lesson-card-actions button,.lesson-card-actions input,.camp-episode-actions button,.camp-episode-actions input').forEach(control => {
    control.dataset.ttAccessWasDisabled = String(control.disabled);
    control.disabled = true;
    control.setAttribute('aria-disabled', 'true');
  });
  const actions = card.querySelector('.lesson-card-actions,.camp-episode-actions') || card;
  const prompt = document.createElement('div'); prompt.className = 'tt-access-prompt';
  const note = document.createElement('p'); note.className = 'tt-access-lock-note'; note.textContent = words.note;
  prompt.append(note);
  const link = document.createElement('a'); link.className = 'tt-access-cta'; link.href = accountHref();
  link.textContent = words.cta; link.dataset.accessCta = 'true'; prompt.append(link);
  actions.after(prompt);
}
function applyCatalogCards(tier) {
  if (!tier) return;
  document.querySelectorAll('[data-tt-access-index]').forEach(card => {
    const ordinal = Number(card.dataset.ttAccessIndex);
    const freeMemberCard = tier === 'free' && Number.isInteger(ordinal) && ordinal > 0 && ordinal <= FREE_LIMIT;
    const allowed = fullTiers.has(tier) || freeMemberCard;
    markCard(card, allowed, tier === 'free');
    if (!allowed) {
      const note = card.querySelector('.tt-access-lock-note');
      if (note) note.textContent = tier === 'visitor' ? words.note
        : tier === 'unknown' ? words.unknownNote : words.freeLockedNote;
    }
  });
}
function showAccessStatus(tier, user) {
  const heading = document.querySelector('.catalog-head');
  if (!heading) return;
  let status = document.getElementById('tt-access-status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'tt-access-status';
    status.className = 'tt-access-status';
    heading.after(status);
  }
  if (fullTiers.has(tier)) status.textContent = words.fullStatus;
  else if (tier === 'unknown') status.textContent = words.unknownStatus;
  else if (tier === 'visitor') status.textContent = words.visitorStatus;
  else status.textContent = user ? words.signedInFreeStatus : words.visitorStatus;
}
function blockPage(page, tier) {
  addStyles();
  const main = document.querySelector('main') || document.body;
  main.inert = false;
  main.removeAttribute('aria-busy');
  const panel = document.createElement('section'); panel.className = 'tt-access-panel'; panel.setAttribute('role', 'status');
  const heading = document.createElement('h1'); heading.textContent = tier === 'unknown' ? words.unknown : tier === 'visitor' ? words.visitorTitle : words.title;
  const description = document.createElement('p');
  description.textContent = page.area === 'test-content' ? words.test : tier === 'unknown' ? words.unknown : tier === 'visitor' ? words.visitorBody : words.body;
  panel.append(heading, description);
  if (tier === 'unknown') {
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = words.retry;
    retry.addEventListener('click', () => location.reload()); panel.append(retry);
  }
  const link = document.createElement('a'); link.className = 'tt-access-cta'; link.href = accountHref(); link.textContent = words.login;
  panel.append(link);
  const audio = document.querySelector('audio'); if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  main.replaceChildren(panel);
}
function start() {
  addStyles();
  const pendingPage = currentProtectedPage();
  const protectedMain = pendingPage && document.querySelector('main');
  if (protectedMain) {
    protectedMain.inert = true;
    protectedMain.setAttribute('aria-busy', 'true');
  }
  let applyScheduled = false;
  const observer = new MutationObserver(records => {
    if (currentTier === null || applyScheduled) return;
    const cardsAdded = records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE
      && (node.matches?.('[data-tt-access-index]') || node.querySelector?.('[data-tt-access-index]'))));
    if (!cardsAdded) return;
    applyScheduled = true;
    requestAnimationFrame(() => { applyScheduled = false; applyCatalogCards(currentTier); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  statePromise.then(({ tier, user }) => {
    currentTier = tier;
    showAccessStatus(tier, user);
    if (isToeicLandingPath() && !fullTiers.has(tier)) {
      const landing = document.querySelector('#toeicLanding');
      const protectedDeck = document.querySelector('#practiceMain');
      const toolbar = document.querySelector('.topbar');
      if (protectedDeck) protectedDeck.hidden = true;
      if (toolbar) toolbar.hidden = true;
      for (const button of document.querySelectorAll('#openLcHub, #openRcHub')) {
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopImmediatePropagation();
          landing?.querySelector('.tt-access-panel')?.remove();
          const panel = document.createElement('section'); panel.className = 'tt-access-panel';
          const heading = document.createElement('h2'); heading.textContent = words.title;
          const description = document.createElement('p'); description.textContent = words.test;
          const link = document.createElement('a'); link.className = 'tt-access-cta'; link.href = accountHref(); link.textContent = words.login;
          panel.append(heading, description, link); landing?.append(panel);
        }, { capture: true });
      }
    }
    const page = currentProtectedPage();
    if (page && !canAccessPage(tier, page)) {
      blockPage(page, tier);
      return;
    }
    if (protectedMain) {
      protectedMain.inert = false;
      protectedMain.removeAttribute('aria-busy');
    }
    applyCatalogCards(tier);
  });
}
window.TalkTagAccess = { ready: statePromise, freeLimit: FREE_LIMIT };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
