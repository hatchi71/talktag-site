import { recordMemberVisit } from './member-visits.js';
import { mountManagement } from './manager.js';
import { managerMarkup, managerStyles, memberInsightStyles } from './manager-view.js';
import { checkDeviceSession, watchDeviceSession } from './device-session.js';
import { groupMySpace } from './myspace-model.js';
import { makeAuthConfigurationLoader } from './auth-configuration.js';
import { createClient } from '@supabase/supabase-js';
if (!window.__talktagMemberMySpaceLoaded) {
window.__talktagMemberMySpaceLoaded=true;
const language=location.pathname.startsWith('/japanese/')?'ja':location.pathname.startsWith('/K-korean')?'ko':'en';
const english=language==='ko';
const text=(en,ko)=>english?en:ko;
const make=(tag,value,cls)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n;};
let client,renderId=0,authSubscription, renderedUserId=null, stopMySpaceWatch=null;
const loadAuthConfiguration=makeAuthConfigurationLoader(window,document);
function hostForView(){
 if(location.pathname.includes('J-myspace'))return document.querySelector('.ja-empty');
 const requested=new URLSearchParams(location.search).get('view')==='myspace';
 if(language==='ko'&&requested){document.querySelector('#kr-home')?.setAttribute('hidden','');const host=document.querySelector('#kr-other');if(host)host.hidden=false;return host;}
 const host=document.querySelector('#myspace');return host&&(requested||host.classList.contains('active'))?host:null;
}
async function allRows(table,columns,userId){
 const rows=[];
 for(let offset=0;;offset+=500){const result=await client.from(table).select(columns).eq('user_id',userId).range(offset,offset+499);if(result.error)return result;rows.push(...result.data);if(result.data.length<500)return {data:rows};}
}
async function render(){
 const host=hostForView();if(!host)return;
 if(host.querySelector('.tt-myspace-management')&&renderedUserId)return;
 const sequence=++renderId;
 host.classList.remove('tt-myspace-admin');host.classList.add('tt-myspace');host.replaceChildren(make('h2','MySpace'));
 const note=make('p',text('Loading your account’s learning records…','계정의 학습 기록을 불러오고 있어요…'),'tt-myspace-note');host.append(note);
 let config;
 try { config=await loadAuthConfiguration(); }
 catch {
  if(sequence!==renderId)return;
  note.textContent=text('Could not load your account connection. Please check your connection and retry.','계정 연결 정보를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  const retry=make('button',text('Try again','다시 시도'));retry.type='button';retry.style.cssText='min-height:44px;padding:10px 16px;border:1px solid currentColor;border-radius:12px;background:transparent;color:inherit;font:inherit';retry.onclick=render;host.append(retry);return;
 }
 if(sequence!==renderId)return;
 client ||= window.__talktagAccessClient || createClient(config.url,config.publishableKey);
 if(!authSubscription)authSubscription=client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){stopMySpaceWatch?.();stopMySpaceWatch=null;renderedUserId=null;renderId++;host.replaceChildren(make('h2','MySpace'),make('p',text('Log in to see your learning records.','로그인하면 학습 기록을 볼 수 있어요.')));}
  if(event==='SIGNED_IN' && session?.user.id!==renderedUserId)setTimeout(render,0);
 });
 const {data:{session}}=await client.auth.getSession();
 if(!session){note.textContent=text('Sign in to see your learning records on any device.','로그인하면 어느 기기에서나 학습 기록을 볼 수 있어요.');const a=make('a',text('Log in →','로그인 →'));a.href=`/account.html?ui=${english?'en':'ko'}&from=${language}`;host.append(a);return;}
 if(!await checkDeviceSession(client)){await client.auth.signOut({scope:'local'});note.textContent=text('Signed in on another device. Please sign in again.','다른 기기에서 로그인했어요. 다시 로그인해 주세요.');return;}
 if(!stopMySpaceWatch)stopMySpaceWatch=watchDeviceSession(client,()=>client.auth.signOut({scope:'local'}));
 void recordMemberVisit(client, session.user.id);
 const roles=await client.from('staff_roles').select('role').eq('user_id',session.user.id);
 if(sequence!==renderId)return;
 if(!roles.error&&roles.data?.some(row=>row.role==='admin')){
  note.textContent=text('Manage TalkTag members, access and content here.','회원, 이용 권한, 콘텐츠를 이곳에서 관리하세요.');
  host.classList.add('tt-myspace-admin');
  renderedUserId=session.user.id;
  const board=make('div',null,'tt-myspace-management');
  const shadow=board.attachShadow({mode:'open'});
  const syncTheme=()=>board.dataset.theme=document.documentElement.dataset.appearance==='dark'?'dark':'bright';syncTheme();
  const themeObserver=new MutationObserver(()=>{if(!board.isConnected){themeObserver.disconnect();return;}syncTheme();});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-appearance']});
  const style=document.createElement('style');style.textContent=managerStyles+memberInsightStyles;
  shadow.append(style);const content=document.createElement('div');content.innerHTML=managerMarkup;shadow.append(content);
  host.append(board);mountManagement(shadow,client);return;
 }
 const results=await Promise.all([
 client.from('member_learning_history').select('lesson_id,title,last_opened_at').eq('user_id',session.user.id).order('last_opened_at',{ascending:false}).limit(100),
 allRows('learning_progress','lesson_id,completed_at',session.user.id),
 allRows('member_learning_state','lesson_id,state_key,value',session.user.id)
 ]);
 const {data:{session:current}}=await client.auth.getSession();
 if(sequence!==renderId||current?.user.id!==session.user.id)return;
 if(results.some(r=>r.error)){note.textContent=text('Records could not be loaded. Please reconnect and reload.','기록을 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.');return;}
 note.textContent=text('Your progress is saved to your account and available across devices.','학습 기록은 계정에 저장되며 다른 기기에서도 이어서 볼 수 있어요.');
 const catalog=window.TalkTagCardTitles||{};
 const groups=groupMySpace(catalog,language,results[1].data,results[0].data,results[2].data);
 note.textContent=text('Your next card, and every completed mission, by category.','이어서 할 카드와 완료한 미션을 카테고리별로 확인하세요.');
 const nav=make('nav',null,'tt-myspace-languages');nav.setAttribute('aria-label',text('Learning language','학습 언어'));
 for(const [code,label,url] of [['en','English','/E-english.html?view=myspace'],['ko','한국어','/K-korean.html?view=myspace'],['ja','日本語','/japanese/J-myspace.html']]){const a=make('a',label);a.href=url;if(code===language)a.setAttribute('aria-current','page');nav.append(a);}host.append(nav);
 const overview=make('div',null,'tt-myspace-overview');
 for(const [key,label] of [['done',text('Completed','완료')],['continuing',text('In progress','진행 중')],['notStarted',text('Not started','시작 전')]]){const count=groups.reduce((n,g)=>n+(key==='notStarted'?g[key]:g[key].length),0);const stat=make('div');stat.append(make('strong',String(count)),make('span',label));overview.append(stat);}host.append(overview);
 const labels=[text('Guided Listen & Repeat','듣고 따라 말하기'),text('Mini Talks','미니토크'),text('Vocal Camp','보컬 캠프'),text('Story Camp','스토리 캠프'),text('Readable','리더블')];
 const formatTime=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
 const cardUrl=c=>`/protected-card.html?id=${encodeURIComponent(c.id)}`;
 const identity=c=>`${c.level==='A0'&&!(c.language==='en'&&c.area==='guided-listen-repeat')?'Level 0':c.level} · ${String(c.ordinal).padStart(3,'0')}`;
 function lessonRow(c,completed=false){const row=make('li'),a=make('a',null,'tt-myspace-record');a.href=cardUrl(c);a.append(make('small',identity(c)),make('strong',c.title),make('span',completed?text('Review →','다시 보기 →'):c.started?text('Continue →','이어하기 →'):text('Start →','시작 →')));row.append(a);return row;}
 groups.forEach((g,index)=>{
  const section=make('section',null,'tt-myspace-category');const heading=make('header');const names=make('div');names.append(make('small',`0${index+1} · ${['SOUND','CONVERSATION','BUILD','CREATE','READ'][index]}`),make('h3',labels[index]));heading.append(names,make('span',text(`${g.done.length} / ${g.cards.length} complete`,`${g.done.length} / ${g.cards.length} 완료`),'tt-myspace-fraction'));section.append(heading);
  const meter=make('progress');meter.max=g.cards.length||1;meter.value=g.done.length;meter.setAttribute('aria-label',labels[index]+text(' completion',' 완료율'));section.append(meter);
  section.append(make('p',text(`${g.done.length} completed · ${g.continuing.length} in progress · ${g.notStarted} not started`,`완료 ${g.done.length} · 진행 중 ${g.continuing.length} · 시작 전 ${g.notStarted}`),'tt-myspace-counts'));
  const current=g.continuing[0];
  if(current){const resume=make('div',null,'tt-myspace-resume');resume.append(make('small',text('IN PROGRESS · ','진행 중 · ')+identity(current)),make('h4',current.title));let detail=current.position?text('Saved position ','지난 위치 ')+formatTime(current.position)+(current.durationLabel?' / '+current.durationLabel:''):current.stage?text('Practice step ','훈련 단계 ')+(current.stage+1):text('Opened previously · continue your practice','지난번에 열었던 카드 · 훈련 이어하기');resume.append(make('p',detail));const a=make('a',text('Continue this card →','이 카드 이어하기 →'));a.href=cardUrl(current);resume.append(a);section.append(resume);}
  else section.append(make('p',g.cards.length?text('No unfinished card in progress.','현재 진행 중인 카드가 없어요.'):text('New cards are coming soon.','새로운 카드를 준비하고 있어요.'),'tt-myspace-no-progress'));
  const lists=make('div',null,'tt-myspace-category-lists');
  for(const [items,label,complete] of [[g.unfinished,text('Unfinished','미완료'),false],[g.done,text('Completed','완료'),true]]){
   const details=make('details');const summary=make('summary',`${label} ${items.length} `);summary.append(make('span','⌄'));details.append(summary);const list=make('ul');for(const c of items)list.append(lessonRow(c,complete));if(!items.length)list.append(make('li',text('No cards here yet.','해당 카드가 없어요.'),'tt-myspace-empty'));details.append(list);lists.append(details);
  }section.append(lists);host.append(section);
 });
 const account=make('a',text('Account & membership →','계정 및 회원 정보 →'),'tt-myspace-account');account.href=`/account.html?ui=${english?'en':'ko'}&from=${language}`;host.append(account);

}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='talktag-manager-height')return;
 const frame=document.querySelector('.tt-myspace-management');
 if(frame&&event.source===frame.contentWindow&&Number.isFinite(event.data.height))frame.style.height=Math.max(600,Math.min(100000,event.data.height))+'px';
});
const css=make('link');css.rel='stylesheet';css.href='/myspace.css?v=members-20261107-v3';document.head.append(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
document.addEventListener('click',event=>{if(event.target.closest('[data-view="myspace"]'))setTimeout(render,0);});
window.addEventListener('pageshow',event=>{if(event.persisted)render();});

}
