import { strongPassword, passwordChecks } from './password-policy.js';
import { checkDeviceSession, watchDeviceSession } from './device-session.js';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_AREAS, FREE_CARDS_PER_AREA, summarizeAccess } from './entitlement.js';

const copy = {
  ko: {
    back: '홈으로', title: '함께 배워요.', lead: '카카오 또는 이메일로 로그인하세요.',
    leadEmail: '이메일로 로그인하세요.',
    kakao: '카카오로 계속하기', or: '또는 이메일', emailLabel: '이메일 주소',
    emailButton: '로그인 링크 받기', emailHint: '비밀번호가 필요 없는 일회용 로그인 링크를 보내드립니다. 이메일 앱 안에서 열리면 Safari나 Chrome으로 열어 주세요.',
    signedIn: '로그인되었습니다', signOut: '로그아웃',
    accessNote: '로그인만으로 유료 콘텐츠 이용권이 생기지는 않습니다.',
    accessHeading: '회원 상태',
    accessChecking: ['이용 범위 확인 중', '회원 상태를 확인하고 있습니다.'],
    accessUnknown: ['이용 범위를 확인할 수 없습니다', '잠시 후 다시 접속해 주세요. 유료 콘텐츠는 확인 전까지 열리지 않습니다.'],
    accessFree: ['무료 회원', '로그인한 무료 회원은 각 학습 영역의 레벨마다 001~010번 카드를 이용할 수 있습니다. 시험 안내는 볼 수 있지만 시험 콘텐츠는 체험·정기 회원과 Snowpal, 관리자 전용입니다.'],
    accessTrial: ['체험 회원', '관리자가 지정한 1~3개월의 체험 기간 동안 세 언어의 모든 학습·시험 콘텐츠를 이용할 수 있습니다. 기간이 끝나면 무료 회원 권한으로 돌아갑니다. 현재는 임시 사이트의 화면 규칙이며 서버 파일 보호는 아직 연결되지 않았습니다.'],
    accessMember: ['활성 정기 회원', '결제가 확인된 기간 동안 세 언어의 모든 학습·시험 콘텐츠를 이용할 수 있습니다. 결제 확인과 서버 파일 보호는 아직 연결되지 않았습니다.'],
    accessSnowpal: ['Snowpal', '관리자가 지정한 Snowpal은 세 언어의 모든 콘텐츠와 Talk & Tag 일정 관리 권한을 가집니다.'],
    accessAdmin: ['관리자', '세 언어의 모든 콘텐츠와 TalkTag 서비스 전체를 관리할 수 있는 권한입니다. 보안이 적용된 관리자 도구는 아직 연결되지 않았습니다.'],
    setup: '로그인 준비 중입니다. 인증 서비스 설정 후 이용하실 수 있습니다.',
    loading: '계정 상태를 확인하는 중입니다…',
    sending: '로그인 링크를 보내는 중입니다…',
    sent: '이메일을 확인해 주세요. 받은 로그인 링크를 이 기기에서 여세요.',
    redirecting: '카카오 로그인으로 이동합니다…',
    kakaoAccount: '카카오 계정',
    kakaoCallbackError: '카카오 로그인을 완료하지 못했습니다. 다시 시도해 주세요.',
    signedOut: '로그아웃했습니다.',
    signedOutKakao: 'TalkTag에서 로그아웃했습니다. 일반 브라우저에서는 다음 로그인 때 카카오 계정을 확인합니다. 카카오톡 안 브라우저에서는 바로 로그인될 수 있습니다.',
    error: '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    emailRateLimit: '로그인 링크 요청이 너무 잦아 잠시 제한되었습니다. 가장 최근에 받은 링크를 사용하거나, 시간을 두고 다시 요청해 주세요.',
    expiredLink: '이 로그인 링크는 만료되었거나 이미 사용되었습니다. 이 브라우저에서 새 링크를 요청하고, 가장 최근에 받은 이메일을 열어 주세요.',
    sessionError: '로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.'
  },
  en: {
    back: 'Back home', title: 'Learn together.', lead: 'Sign in with Kakao or email.',
    leadEmail: 'Sign in with email.',
    kakao: 'Continue with Kakao', or: 'or use email', emailLabel: 'Email address',
    emailButton: 'Send sign-in link', emailHint: 'We’ll email you a one-time link. No password needed. If your email app opens it inside the app, choose Open in Safari or Chrome.',
    signedIn: 'You’re signed in', signOut: 'Sign out',
    accessNote: 'Signing in does not by itself unlock paid content.',
    accessHeading: 'Membership status',
    accessChecking: ['Checking access', 'Verifying your membership status.'],
    accessUnknown: ['Access could not be verified', 'Please try again shortly. Paid content stays unavailable until verification succeeds.'],
    accessFree: ['Free member', 'Signed-in free members can use cards 001–010 in every level of each learning area. Test landing pages stay open; test practice is for Trial and paid Members, Snowpals, and Administrators.'],
    accessTrial: ['Trial member', 'An Administrator assigns a 1–3 month period. Active Trial members can use all learning and test content in all three languages; access returns to Free when the period ends.'],
    accessMember: ['Active monthly member', 'Paid members can use all learning and test content in English, Korean, and Japanese while their membership is active. Monthly payment verification is still being prepared.'],
    accessSnowpal: ['Snowpal', 'An Administrator-assigned Snowpal has unlimited access to all three languages and Talk & Tag schedule management.'],
    accessAdmin: ['Administrator', 'This role has full authority over TalkTag, all language content, memberships, trials, and service settings. The secure administration tools are not connected yet.'],
    setup: 'Sign-in is being set up. It will be available after the authentication service is configured.',
    loading: 'Checking your account…',
    sending: 'Sending your sign-in link…',
    sent: 'Check your email and open the sign-in link on this device.',
    redirecting: 'Opening Kakao sign-in…',
    kakaoAccount: 'Kakao account',
    kakaoCallbackError: 'Kakao sign-in was not completed. Please try again.',
    signedOut: 'You’ve signed out.',
    signedOutKakao: 'You’ve signed out of TalkTag. A regular browser will ask you to confirm your Kakao account next time; KakaoTalk’s in-app browser may sign you right back in.',
    error: 'Could not complete sign-in. Please try again shortly.',
    emailRateLimit: 'Too many sign-in link requests. Use the most recent email link, or wait before requesting another.',
    expiredLink: 'This sign-in link has expired or was already used. Request a new link in this browser, then open the newest email.',
    sessionError: 'Could not check your sign-in status. Please try again.'
  }
};

Object.assign(copy.ko, {
 google:'Google로 계속하기',passwordMethod:'이메일 + 비밀번호',codeMethod:'이메일 인증번호',passwordLabel:'비밀번호',codeLabel:'이메일 인증번호',verifyCode:'인증하고 로그인',newPassword:'비밀번호를 잊으셨나요?',setPasswordTitle:'비밀번호 설정',newPasswordLabel:'새 비밀번호 (12자 이상)',confirmPassword:'비밀번호 확인',savePassword:'비밀번호 저장',managePassword:'비밀번호 설정 / 변경',
 lead:'이메일 또는 소셜 계정으로 로그인하세요.',emailButton:'로그인',emailHint:'설치한 TalkTag 앱에서는 여기서 로그인하세요. 이메일 인증번호도 이 화면에 입력할 수 있어요.',sending:'로그인 중입니다…',sent:'이메일의 인증번호를 이 화면에 입력해 주세요. 링크를 열 필요가 없어요.',codeSend:'인증번호 받기',codeSending:'인증번호를 보내는 중입니다…',passwordError:'이메일과 비밀번호를 확인해 주세요. 비밀번호가 없다면 아래에서 설정할 수 있어요.',passwordMismatch:'두 비밀번호가 일치하지 않습니다.',passwordSaved:'비밀번호가 저장되었습니다.',passwordSetupHint:'이메일 인증 후 비밀번호를 설정할 수 있어요.',googleRedirect:'Google 로그인으로 이동합니다…',
});
Object.assign(copy.en, {
 google:'Continue with Google',passwordMethod:'Email + password',codeMethod:'Email code',passwordLabel:'Password',codeLabel:'Email verification code',verifyCode:'Verify and log in',newPassword:'Forgot your password?',setPasswordTitle:'Set your password',newPasswordLabel:'New password (at least 12 characters)',confirmPassword:'Confirm password',savePassword:'Save password',managePassword:'Set or change password',
 lead:'Log in with your email and password, or a social account.',emailButton:'Log in',emailHint:'In the installed TalkTag app, sign in here. You can also enter an email code on this screen.',sending:'Signing in…',sent:'Enter the code from your email on this screen. You do not need to open a link.',codeSend:'Send verification code',codeSending:'Sending your code…',passwordError:'Check your email and password. If you do not have a password, set one using the option below.',passwordMismatch:'The passwords do not match.',passwordSaved:'Your password is saved.',passwordSetupHint:'Verify your email to set your password.',googleRedirect:'Opening Google sign-in…',
});
const params = new URLSearchParams(location.search);
const language = params.get('ui') === 'en' ? 'en' : 'ko';
const t = copy[language];
const landingLanguageKey = 'talktag-last-used-language';
const validLandingLanguages = new Set(['en', 'ko', 'ja']);
const explicitLandingLanguage = params.get('from');
let preferredLandingLanguage = null;
if (validLandingLanguages.has(explicitLandingLanguage)) preferredLandingLanguage = explicitLandingLanguage;
try {
  const savedLanguage = localStorage.getItem(landingLanguageKey);
  if (!preferredLandingLanguage && validLandingLanguages.has(savedLanguage)) preferredLandingLanguage = savedLanguage;
} catch { /* Browser storage can be unavailable in private contexts. */ }
if (!preferredLandingLanguage) {
  const browserLanguage = (navigator.language || '').split('-')[0].toLowerCase();
  preferredLandingLanguage = browserLanguage === 'en' ? 'en'
    : browserLanguage === 'ko' ? 'ko'
    : browserLanguage === 'ja' ? 'ja'
    : 'en';
}
document.documentElement.lang = language;
document.title = `${language === 'ko' ? '로그인' : 'Sign in'} · TalkTag`;
document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t[node.dataset.i18n]; });
const backLink = document.querySelector('#back-link');
const isPreview = params.get('preview') === '1';
const landingHref = {
  en: '/E-english.html',
  ko: '/',
  ja: '/japanese/J-index.html'
}[preferredLandingLanguage];
backLink.href = landingHref;
if (isPreview) document.querySelector('.account-brand').href = '/';

const status = document.querySelector('#account-status');
const signedOut = document.querySelector('#signed-out');
const signedIn = document.querySelector('#signed-in');
const lead = document.querySelector('.lead');
const kakaoButton = document.querySelector('#kakao-button');
const emailButton = document.querySelector('#email-button');
const emailForm = document.querySelector('#email-form');
const signoutButton = document.querySelector('#signout-button');
const accountEmail = document.querySelector('#account-email');
const accessTitle = document.querySelector('#access-title');
const accessDescription = document.querySelector('#access-description');
const displayAccess = key => {
  const [title, description] = t[key];
  accessTitle.textContent = title;
  accessDescription.textContent = key === 'accessFree'
    ? description.replace('{cardLimit}', String(FREE_CARDS_PER_AREA)).replace('{areaCount}', String(ACCESS_AREAS.length))
    : description;
};
const say = (message, kind = 'notice') => {
  status.textContent = message;
  status.dataset.kind = kind;
};
const busy = value => { for (const id of ['kakao-button','google-button','email-button','signout-button','verify-code','save-password','use-code','use-password','set-password-start','register-submit','mode-login','mode-register']) document.getElementById(id).disabled=value; };
const isEmailRateLimit = error => error?.status === 429 || /rate.?limit/i.test(error?.code || '');
const showUser = user => {
  signedIn.hidden = !user;
  if (!user) document.querySelector('#member-history')?.replaceChildren();
  signedOut.hidden = Boolean(user);
  lead.hidden = Boolean(user);
  accountEmail.textContent = user
    ? (user.email || user.user_metadata?.name || user.user_metadata?.preferred_username || t.kakaoAccount)
    : '';
  if (user) displayAccess('accessChecking');
};
const config = window.TalkTagAuthConfig || {};
const kakaoEnabled = config.kakaoEnabled === true;
const googleButton=document.querySelector('#google-button');
googleButton.hidden=config.googleEnabled!==true;
let emailMode='password', setPasswordIntent=false, codeEmail='', registering=false, codeType='email';
function chooseEmailMode(mode) {
 emailMode=mode;
 document.querySelector('#password-field').hidden=mode!=='password';
 document.querySelector('#password').required=mode==='password';
 document.querySelector('#password').value='';
 document.querySelector('#code-form').hidden=true;
 for(const type of ['password','code'])document.querySelector('#use-'+type).setAttribute('aria-pressed',String(type===mode));
 emailButton.textContent=mode==='password'?t.emailButton:t.codeSend;
}
document.querySelector('#use-password').onclick=()=>{setPasswordIntent=false;chooseEmailMode('password');};
document.querySelector('#use-code').onclick=()=>{setPasswordIntent=false;chooseEmailMode('code');};
document.querySelector('#set-password-start').onclick=()=>{setPasswordIntent=true;chooseEmailMode('code');say(t.passwordSetupHint);};
const registration=document.querySelector('#register-form');
const rules=language==='en'?['12–128 characters','At least one lowercase letter (a–z)','At least one uppercase letter (A–Z)','At least one number (0–9)','At least one symbol (for example ! @ #)']:['12~128자','영문 소문자 1자 이상 (a–z)','영문 대문자 1자 이상 (A–Z)','숫자 1자 이상 (0–9)','특수문자 1자 이상 (예: ! @ #)'];
document.querySelector('#password-rules').replaceChildren(...rules.map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));
for(const [id,en,ko] of [['mode-login','Log in','로그인'],['mode-register','Create account','회원가입'],['register-title','Register with email','이메일로 회원가입'],['register-name-label','Real name or nickname','이름 또는 닉네임'],['register-email-label','Email address','이메일 주소'],['register-password-label','Create password','비밀번호 만들기'],['register-confirm-label','Confirm password','비밀번호 확인'],['register-submit','Create account','회원가입']])document.getElementById(id).textContent=language==='en'?en:ko;
function accountMode(register){registering=register;document.title=register?(language==='en'?'Create account · TalkTag':'회원가입 · TalkTag'):(language==='en'?'Log in · TalkTag':'로그인 · TalkTag');lead.textContent=register?(language==='en'?'Create your TalkTag account. Verify your email, then log in.':'계정을 만들고 이메일을 인증한 뒤 로그인하세요.'):t.lead;registration.hidden=!register;emailForm.hidden=register;document.querySelector('#login-methods').hidden=register;document.querySelector('#set-password-start').hidden=register;document.querySelector('#code-form').hidden=true;document.querySelector('.hint').hidden=register;for(const [id,active] of [['mode-login',!register],['mode-register',register]])document.getElementById(id).setAttribute('aria-pressed',String(active));say('');}
document.querySelector('#mode-login').onclick=()=>accountMode(false);
document.querySelector('#mode-register').onclick=()=>accountMode(true);
document.querySelector('#set-password-start').textContent=language==='en'?'Forgot your password?':'비밀번호를 잊으셨나요?';
document.querySelector('#register-password').addEventListener('input',event=>{const checks=Object.values(passwordChecks(event.target.value));document.querySelectorAll('#password-rules li').forEach((li,i)=>li.classList.toggle('passed',checks[i]));event.target.setCustomValidity('');});
if (!kakaoEnabled) {
  kakaoButton.hidden = true;
  document.querySelector('.divider').hidden = true;
  document.querySelector('.lead').textContent = t.leadEmail;
}
document.querySelector('#device-policy-note').textContent=language==='en'?'One active device per account. Signing in on a new device ends access on the previous device. Administrators are exempt.':'계정당 한 기기에서 이용할 수 있어요. 새 기기에서 로그인하면 이전 기기의 이용이 종료됩니다. 관리자 계정은 제외됩니다.';
let configured = false;
try {
  const url = new URL(config.url);
  configured = url.protocol === 'https:' && /^sb_publishable_/.test(config.publishableKey || '');
} catch (_) { /* Missing configuration leaves login unavailable. */ }

if (!configured) {
  signedOut.hidden = false;
  busy(true);
  document.querySelector('#email').disabled = true;
  say(t.setup);
} else {
  const callbackParams = new URLSearchParams(location.hash.slice(1));
  let pendingLandingRedirect = params.get('next') === 'manager' || callbackParams.has('access_token') || callbackParams.has('code') || params.has('code');
  const callbackError = new URLSearchParams(location.hash.slice(1));
  const errorCode = callbackError.get('error_code') || params.get('error_code');
  let expiredLink = errorCode === 'otp_expired';
  let kakaoCallbackFailed = !expiredLink && Boolean(callbackError.get('error') || params.get('error'));
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
  });
  const redirectTo = `${location.origin}/account.html?ui=${language}&preview=1&from=${preferredLandingLanguage}`;
  async function signedInDestination(user) {
    if (!user?.id) return landingHref;
    const {data,error}=await client.from('staff_roles').select('role').eq('user_id',user.id);
    return !error && data?.some(row=>row.role==='admin') ? (preferredLandingLanguage==='ja'?'/japanese/J-myspace.html':preferredLandingLanguage==='ko'?'/K-korean.html?view=myspace':'/E-english.html?view=myspace') : landingHref;
  }
  const reauthKey = 'talktag-kakao-reauth-after-logout';
  let justSignedOut = sessionStorage.getItem(reauthKey) === '1';
  signedOut.hidden = false;
  say(t.loading);
  let refreshSequence = 0;
  const refreshAccount = async () => {
    const sequence = ++refreshSequence;
    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sequence !== refreshSequence) return;
      if (sessionError) { showUser(null); say(t.sessionError, 'error'); return; }
      if (!session) {
        showUser(null);
        say(expiredLink ? t.expiredLink : kakaoCallbackFailed ? t.kakaoCallbackError : justSignedOut ? t.signedOutKakao : '', expiredLink || kakaoCallbackFailed ? 'error' : justSignedOut ? 'success' : 'notice');
        return;
      }
      const { data: { user }, error } = await client.auth.getUser();
      if (sequence !== refreshSequence) return;
      if (error || !user) { showUser(null); say(t.sessionError, 'error'); return; }
      if(params.get('registered')==='1'){params.delete('registered');pendingLandingRedirect=false;await client.auth.signOut({scope:'local'});showUser(null);accountMode(false);history.replaceState(null,'',location.pathname+'?'+params.toString());say(language==='en'?'Email verified. Registration is complete. Log in with your email and password.':'이메일 인증과 회원가입이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.','success');return;}
      if(!await checkDeviceSession(client)){await client.auth.signOut({scope:'local'});showUser(null);say(language==='en'?'This account was signed in on another device. Sign in again to use this device.':'다른 기기에서 로그인했어요. 이 기기를 사용하려면 다시 로그인해 주세요.','error');return;}
      if (pendingLandingRedirect && memberName(user)) {
        pendingLandingRedirect = false;
        location.replace(await signedInDestination(user));
        return;
      }
      showUser(user);
      if(document.activeElement!==nameInput)nameInput.value=memberName(user);
      nameForm.dataset.required=String(!memberName(user));
      document.querySelector('#manage-password').hidden=!user.email;
      document.querySelector('#set-password-form').hidden=!setPasswordIntent;
      const historyHost=document.querySelector('#member-history');
      historyHost.replaceChildren();
      const mySpaceLink=document.createElement('a');
      mySpaceLink.href=preferredLandingLanguage==='ja'?'/japanese/J-myspace.html':preferredLandingLanguage==='ko'?'/K-korean.html?view=myspace':'/E-english.html?view=myspace';
      mySpaceLink.textContent=language==='en'?'Open MySpace →':'MySpace 열기 →';
      mySpaceLink.className='action secondary';historyHost.append(mySpaceLink);
      justSignedOut = false;
      sessionStorage.removeItem(reauthKey);
      expiredLink = false;
      kakaoCallbackFailed = false;
      say('');
      const [membershipResult, rolesResult] = await Promise.all([
        client.from('memberships').select('status,trial_months,active_from,active_until').eq('user_id', user.id).maybeSingle(),
        client.from('staff_roles').select('role').eq('user_id', user.id)
      ]);
      if (sequence !== refreshSequence) return;
      if (membershipResult.error || rolesResult.error) { displayAccess('accessUnknown'); return; }
      const role = summarizeAccess(membershipResult.data, rolesResult.data || []);
      displayAccess(`access${role[0].toUpperCase()}${role.slice(1)}`);
    } catch (_) {
      if (sequence !== refreshSequence) return;
      if (!signedIn.hidden) displayAccess('accessUnknown');
      else { showUser(null); say(t.sessionError, 'error'); }
    }
  };
  const memberName = user => String(user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const nameForm=document.querySelector('#member-name-form'),nameInput=document.querySelector('#member-name');
  document.querySelector('#member-name-title').textContent=language==='en'?'Your name or nickname':'이름 또는 닉네임';
  document.querySelector('#member-name-label').textContent=language==='en'?'Name shown to TalkTag managers':'회원 관리에 사용할 이름';
  document.querySelector('#member-name-help').textContent=language==='en'?'Use 2–40 characters. A nickname is fine; your legal name is not required.':'2~40자로 입력해 주세요. 실명 대신 닉네임을 사용해도 됩니다.';
  document.querySelector('#save-member-name').textContent=language==='en'?'Save name':'이름 저장';
  async function finishSignIn(){const {data:{user}}=await client.auth.getUser();if(!await checkDeviceSession(client)){await refreshAccount();return;}if(memberName(user))location.replace(await signedInDestination(user));else{pendingLandingRedirect=false;await refreshAccount();nameInput.focus();}}
  nameForm.addEventListener('submit',async event=>{event.preventDefault();const value=nameInput.value.trim();if(value.length<2||value.length>40){nameInput.setCustomValidity(language==='en'?'Enter 2–40 characters.':'2~40자로 입력해 주세요.');nameInput.reportValidity();return;}nameInput.setCustomValidity('');const button=document.querySelector('#save-member-name');button.disabled=true;const {error}=await client.auth.updateUser({data:{display_name:value}});button.disabled=false;document.querySelector('#member-name-status').textContent=error?(language==='en'?'Could not save. Please try again.':'저장하지 못했어요. 다시 시도해 주세요.'):(language==='en'?'Name saved.':'이름을 저장했습니다.');if(!error){const {data:{user}}=await client.auth.getUser();location.replace(await signedInDestination(user));}});
  nameInput.addEventListener('input',()=>nameInput.setCustomValidity(''));
  refreshAccount();
  client.auth.onAuthStateChange(() => { setTimeout(refreshAccount, 0); });
  // Safari restores disabled controls from its back/forward cache after OAuth.
  window.addEventListener('pageshow', event => {
    if (event.persisted) { busy(false); say(''); refreshAccount(); }
  });
  if (kakaoEnabled) kakaoButton.addEventListener('click', async () => {
    busy(true); say(t.redirecting);
    try {
      const options = { redirectTo, skipBrowserRedirect: true };
      // A TalkTag sign-out does not end Kakao's browser session. Reconfirm the
      // account on the next explicit Kakao sign-in so logout is not a silent loop.
      if (justSignedOut && !/KAKAOTALK/i.test(navigator.userAgent)) options.queryParams = { prompt: 'login' };
      const { data, error } = await client.auth.signInWithOAuth({ provider: 'custom:talktag-kakao', options });
      if (error || !data?.url) throw error || new Error('Missing provider URL');
      // Replace the redirect trampoline: Back returns to TalkTag, not OAuth again.
      location.assign(data.url);
    } catch (_) { busy(false); say(t.error, 'error'); }
  });
  if(config.googleEnabled===true) googleButton.addEventListener('click',async()=>{
    busy(true);say(t.googleRedirect);
    try {const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});if(error||!data?.url)throw error||new Error('Missing provider URL');location.assign(data.url);}
    catch {busy(false);say(t.error,'error');}
  });
  registration.addEventListener('submit',async event=>{
    event.preventDefault();if(!registration.reportValidity())return;
    const name=document.querySelector('#register-name').value.trim(),email=document.querySelector('#register-email').value.trim(),password=document.querySelector('#register-password').value;
    if(name.length<2){say(language==='en'?'Enter a name or nickname with 2–40 characters.':'이름 또는 닉네임을 2~40자로 입력해 주세요.','error');return;}
    if(!strongPassword(password)){say(language==='en'?'Your password must meet every requirement below.':'비밀번호는 아래의 모든 조건을 충족해야 합니다.','error');return;}
    if(password!==document.querySelector('#register-confirm').value){say(t.passwordMismatch,'error');return;}
    busy(true);say(language==='en'?'Creating your account…':'계정을 만드는 중입니다…');
    try{const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:redirectTo+'&registered=1'}});
      if(error){say(isEmailRateLimit(error)?t.emailRateLimit:(language==='en'?'Could not register. Check your details or try logging in if you already have an account.':'회원가입을 완료하지 못했습니다. 입력 정보를 확인하거나 기존 계정으로 로그인해 주세요.'),'error');}
      else{document.querySelector('#register-password').value='';document.querySelector('#register-confirm').value='';
        if(data.session){await client.auth.signOut({scope:'local'});accountMode(false);showUser(null);say(language==='en'?'Account created. Log in with your email and password.':'회원가입이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.','success');}
        else{codeEmail=email;codeType='signup';registration.hidden=true;document.querySelector('#code-form').hidden=false;say(language==='en'?'Check your email and enter the verification code to finish registration. If already registered, use Log in.':'이메일 인증번호를 입력하면 회원가입이 완료됩니다. 이미 가입했다면 로그인해 주세요.','success');}
      }
    }catch{say(t.error,'error');}finally{busy(false);}
  });
  emailForm.addEventListener('submit', async event => {
    event.preventDefault();if(!emailForm.reportValidity())return;
    const email=document.querySelector('#email').value.trim();
    busy(true);say(emailMode==='password'?t.sending:t.codeSending);
    expiredLink=false;kakaoCallbackFailed=false;
    try {
      if(emailMode==='password') {
        const password=document.querySelector('#password').value;
        const {error}=await client.auth.signInWithPassword({email,password});
        document.querySelector('#password').value='';
        if(error)say(t.passwordError,'error');else await finishSignIn();
      } else {
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:false}});
        if(error)say(isEmailRateLimit(error)?t.emailRateLimit:t.error,'error');
        else {codeEmail=email;codeType='email';document.querySelector('#code-form').hidden=false;say(t.sent,'success');document.querySelector('#email-code').focus();}
      }
    } catch {say(t.error,'error');}
    busy(false);
  });
  document.querySelector('#code-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!event.currentTarget.reportValidity()||!codeEmail)return;
    busy(true);
    try {
      const {error}=await client.auth.verifyOtp({email:codeEmail,token:document.querySelector('#email-code').value.trim(),type:codeType});
      document.querySelector('#email-code').value='';
      if(error)say(t.expiredLink,'error');else if(codeType==='signup'){await client.auth.signOut({scope:'local'});accountMode(false);showUser(null);say(language==='en'?'Email verified. You can now log in with your email and password.':'이메일 인증이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.','success');}else if(setPasswordIntent){await refreshAccount();document.querySelector('#new-password').focus();}else await finishSignIn();
    }catch{say(t.error,'error');}busy(false);
  });
  document.querySelector('#manage-password').onclick=()=>{setPasswordIntent=true;document.querySelector('#set-password-form').hidden=false;};
  document.querySelector('#set-password-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!event.currentTarget.reportValidity())return;
    const password=document.querySelector('#new-password').value;
    if(!strongPassword(password)){say(language==='en'?'Use 12–128 characters with uppercase, lowercase, a number and a symbol.':'12~128자에 영문 대문자·소문자, 숫자, 특수문자를 모두 포함해 주세요.','error');return;}
    if(password!==document.querySelector('#confirm-password').value){say(t.passwordMismatch,'error');return;}
    busy(true);
    try {const {error}=await client.auth.updateUser({password});if(error){say(t.error,'error');}else{event.target.reset();setPasswordIntent=false;document.querySelector('#set-password-form').hidden=true;say(t.passwordSaved,'success');}}
    catch{say(t.error,'error');}busy(false);
  });
  signoutButton.addEventListener('click', async () => {
    busy(true);
    const { error } = await client.auth.signOut();
    if (!error) {
      justSignedOut = true;
      sessionStorage.setItem(reauthKey, '1');
      showUser(null);
      say(t.signedOutKakao, 'success');
    } else say(t.error, 'error');
    busy(false);
  });
}
