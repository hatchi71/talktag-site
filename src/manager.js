import {mountMemberMemo} from './member-memo.js';
import { renderMemberInsights, formatMemberDate } from './member-insights-view.js';
import { contentChecks, upcomingGatherings, compareMembers } from './manager-model.js';
import { summarizeAccess } from './entitlement.js';
import { createClient } from '@supabase/supabase-js';

export function mountManagement(root = document, suppliedClient = null) {
const status = root.querySelector('#status');
const dashboard = root.querySelector('#dashboard');
const accessCard = root.querySelector('#access-card');
function filterRows(kind){
 const query=root.querySelector('#'+kind+'-search').value.trim().toLocaleLowerCase();
 const selected=root.querySelector('#'+kind+'-filter').value;
 const rows=[...root.querySelector('#'+kind+'-list').children];let visible=0;
 for(const row of rows){row.hidden=!(row.textContent.toLocaleLowerCase().includes(query)&&(selected==='all'||row.dataset.filter===selected));if(!row.hidden)visible++;}
 root.querySelector('#'+kind+'-filter-status').textContent=rows.length?`${visible} of ${rows.length} loaded records${visible?'':' · No matches. Try another search.'}`:'No records yet.';
}
for(const kind of ['member','content'])for(const control of ['search','filter'])root.querySelector('#'+kind+'-'+control).addEventListener('input',()=>filterRows(kind));
const refreshButton=root.querySelector('#refresh-board');refreshButton.addEventListener('click',()=>{if(leaveMemo()){activeMemo?.destroy();activeMemo=null;void loadOverview();}});
let selectedMemberId=null;
let activeMemo;
function leaveMemo(){return !activeMemo?.hasUnsavedChanges()||window.confirm('Discard unsaved member memo changes?');}
let memberRows=[];
let managementClient;
function sortMembers(){
 const field=root.querySelector('#member-sort').value,order=root.querySelector('#member-sort-order').value;
 const select=root.querySelector('#member-sort-order');select.options[0].textContent=field==='name'?'Z → A / reverse name order':'Newest first';select.options[1].textContent=field==='name'?'A → Z / name order':'Oldest first';
 memberRows.sort((a,b)=>compareMembers({name:a.dataset.sortName,rank:Number(a.dataset.registrationRank)},{name:b.dataset.sortName,rank:Number(b.dataset.registrationRank)},field,order));
 root.querySelector('#member-list').append(...memberRows);filterRows('member');
}
for(const id of ['member-sort','member-sort-order'])root.querySelector('#'+id).addEventListener('change',sortMembers);

function showPanel(id){
 if(!['home','members','content','audit'].includes(id))id='home';
 for(const panel of root.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==id;
 for(const link of root.querySelectorAll('.sidebar nav a[href^="#"]')){
  const current=link.getAttribute('href')==='#'+id;link.classList.toggle('selected',current);
  if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 root.querySelector('.welcome h2').textContent=({home:'What needs your attention?',members:'Members & learning',content:'Content status',audit:'Recent changes'})[id];
}
for(const link of root.querySelectorAll('.sidebar nav a[href^="#"]'))link.addEventListener('click',event=>{event.preventDefault();showPanel(link.getAttribute('href').slice(1));});
for(const button of root.querySelectorAll('[data-open]'))button.addEventListener('click',()=>{showPanel(button.dataset.open);if(button.dataset.filter){root.querySelector('#member-filter').value=button.dataset.filter;filterRows('member');}if(button.dataset.open==='members')root.querySelector('#member-search').focus();});
root.querySelector('#attention-trials').addEventListener('click',()=>{showPanel('members');root.querySelector('#member-filter').value='trial';root.querySelector('#member-search').value='';filterRows('member');});
root.querySelector('#attention-content').addEventListener('click',()=>{showPanel('content');root.querySelector('#content-filter').value='all';filterRows('content');});
function resetMemberDetail(){if(!leaveMemo())return;activeMemo?.destroy();activeMemo=null;const detail=root.querySelector('#member-detail');detail.replaceChildren();const h=document.createElement('h4');h.textContent='Choose a member';const p=document.createElement('p');p.textContent='Select a member to see learning progress, account details, visits and access.';detail.append(h,p);selectedMemberId=null;for(const row of memberRows)row.classList.remove('is-selected');}
function selectMember(member,row,name,contact,state,controls){
 if(!leaveMemo())return;activeMemo?.destroy();activeMemo=null;
 selectedMemberId=member.user_id;
 for(const item of memberRows)item.classList.toggle('is-selected',item===row);
 const detail=root.querySelector('#member-detail');detail.replaceChildren();
 const close=document.createElement('button');close.className='detail-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close member details');close.onclick=()=>{resetMemberDetail();row.querySelector('.member-open').focus();};
 const heading=document.createElement('h4');heading.textContent=name.textContent;
 const hint=document.createElement('p');hint.className='detail-hint';hint.textContent='Changes take effect only after confirmation and are recorded in activity.';
 const label=document.createElement('label');label.textContent='Trial duration';label.append(controls[0]);
 const actions=document.createElement('div');actions.className='detail-actions';actions.append(label,...controls.slice(1));
 detail.append(close,heading,contact.cloneNode(true),state.cloneNode(true));
 const sections=renderMemberInsights(detail,member,managementClient,()=>selectedMemberId===member.user_id&&detail.contains(heading));
 if(sections)activeMemo=mountMemberMemo(sections.overview,managementClient,member.user_id,()=>selectedMemberId===member.user_id&&detail.contains(heading));
 const accessHeading=document.createElement('h5');accessHeading.textContent='Manage access';
 const policy=document.createElement('p');policy.className='detail-hint';policy.textContent=member.insights?.is_admin?'Full authority · all content · multiple devices allowed':state.textContent.startsWith('Free')?'Cards 001–010 per level, category and language · one active device':'All content · one active device';
 const accessPanel=document.createElement('div');accessPanel.append(accessHeading,policy,actions,hint);detail.append(accessPanel);
 if(sections){accessPanel.hidden=true;const nav=document.createElement('div');nav.className='member-detail-tabs';nav.setAttribute('role','group');nav.setAttribute('aria-label','Member details');
 const panels=[sections.overview,sections.learning,accessPanel];
 ['Overview','Learning','Access'].forEach((label,index)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(index===0));button.onclick=()=>{panels.forEach((panel,i)=>panel.hidden=i!==index);for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button));};nav.append(button);});detail.insertBefore(nav,sections.overview);}
}
const config = window.TalkTagAuthConfig || {};

function deny(message) {
  status.textContent = message;
  dashboard.hidden = true;
  accessCard.hidden = false;
}

async function loadMembers(client, actorId) {
  const note = root.querySelector('#member-status');
  const list = root.querySelector('#member-list');
  managementClient=client;
  const { data, error } = await client.rpc('talktag_admin_members', { p_limit: 100 });
  if (error || !Array.isArray(data)) {
    note.textContent = 'Member controls are not connected yet.';
    return;
  }
  note.textContent = `${data.length} most recently registered accounts · search covers this list`;
  const profiles = await client.rpc('talktag_admin_member_names', {p_limit:100});
  const names=new Map((profiles.data||[]).map(row=>[row.user_id,row.display_name]));
  const insightsResult=await client.rpc('talktag_admin_member_insights',{p_limit:100});
  const insights=new Map((Array.isArray(insightsResult.data)?insightsResult.data:[]).map(item=>[item.user_id,item]));
  if(insightsResult.error)note.textContent+=' · Statistics unavailable; refresh to retry';
  const roles = await client.rpc('talktag_admin_snowpals');
  const snowpals = !roles.error && Array.isArray(roles.data)
    ? new Set(roles.data.map(role => role.user_id)) : null;
  list.replaceChildren();memberRows=[];let trialEnding=0;
  for (const member of data) {
    member.insights=insights.get(member.user_id);
    const row = document.createElement('div');
    row.className = 'member-row';
    row.dataset.registrationRank=String(data.indexOf(member));row.dataset.sortName=names.get(member.user_id)||'';
    const identity = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = names.get(member.user_id) || 'Name not provided';
    const contact=document.createElement('small');contact.textContent=member.email || `Kakao / social account · ${member.user_id.slice(0,8)}`;identity.append(name,contact);
    const state = document.createElement('small');
    const tier=summarizeAccess({status:member.membership_status,trial_months:member.trial_months,active_from:member.active_from,active_until:member.active_until},(member.insights?.is_admin||member.user_id===actorId)?[{role:'admin'}]:snowpals?.has(member.user_id)?[{role:'snowman'}]:[]);
    const access=tier==='member'?'paid':tier;
    row.dataset.filter=access;
    state.className='member-badge';
    state.textContent=({admin:'Administrator',snowpal:'Snowpal',paid:'Paid',trial:'Trial',free:'Free'})[access]+(member.active_until&&['paid','trial'].includes(access)?` · until ${new Date(member.active_until).toLocaleDateString()}`:'');
    if(access==='trial'&&Date.parse(member.active_until)-Date.now()<=7*86400000)trialEnding++;
    identity.append(state);
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Trial length for ${member.email || member.user_id}`);
    for (const months of [1, 2, 3]) {
      const option = document.createElement('option');
      option.value = String(months);
      option.textContent = `${months} month${months === 1 ? '' : 's'}`;
      select.append(option);
    }
    const button = document.createElement('button');
    button.type = 'button';
    const isSelf = member.insights?.is_admin || member.user_id === actorId;
    const hasPaidPeriod = access==='paid';
    button.textContent = isSelf ? 'Administrator' : hasPaidPeriod ? 'Paid member' : 'Grant trial';
    button.disabled = isSelf || hasPaidPeriod;
    if (isSelf || hasPaidPeriod) select.disabled = true;
    button.addEventListener('click', async () => {
      if (!window.confirm(`Grant ${select.value} month(s) of full access to ${member.email || member.user_id}?`)) return;
      button.disabled = true;
      note.textContent = 'Saving trial…';
      const result = await client.rpc('talktag_admin_grant_trial', {
        p_target_user_id: member.user_id, p_months: Number(select.value)
      });
      if (result.error) {
        note.textContent = result.error.message || 'The trial was not changed.';
        button.disabled = false;
        return;
      }
      note.textContent = 'Trial granted and recorded.';
      await loadOverview();
    });
    const controls=[select,button];
    const open=document.createElement('button');open.className='member-open';open.type='button';open.append(name,contact);
    if(member.insights){const joined=document.createElement('small');joined.textContent='Joined '+formatMemberDate(member.insights.registered_at);const progress=document.createElement('small');progress.className='member-learning-summary';progress.textContent=`${member.insights.completed_count} complete · ${Math.max(0,member.insights.started_count-member.insights.completed_count)} in progress · ${member.insights.visits_30d} visits / 30d`;open.append(joined,progress);}open.setAttribute('aria-label',`Manage ${name.textContent} ${member.email||''}`);
    const chevron=document.createElement('span');chevron.textContent='→';chevron.setAttribute('aria-hidden','true');
    row.append(open,state,chevron);
    if (snowpals) {
      const roleButton = document.createElement('button');
      roleButton.type = 'button';
      const isSnowpal = snowpals.has(member.user_id);
      roleButton.textContent = isSelf ? 'Administrator' : isSnowpal ? 'Remove Snowpal' : 'Make Snowpal';
      roleButton.disabled = isSelf;
      roleButton.className = 'role-button';
      roleButton.addEventListener('click', async () => {
        const action = isSnowpal ? 'Remove Snowpal access from' : 'Grant Snowpal access to';
        if (!window.confirm(`${action} ${member.email || member.user_id}?`)) return;
        roleButton.disabled = true;
        note.textContent = 'Saving Snowpal role…';
        const result = await client.rpc('talktag_admin_set_snowpal', {
          p_target_user_id: member.user_id, p_enabled: !isSnowpal
        });
        if (result.error) {
          note.textContent = result.error.message || 'The Snowpal role was not changed.';
          roleButton.disabled = false;
          return;
        }
        note.textContent = 'Snowpal role updated and recorded.';
        await loadOverview();
      });
      controls.push(roleButton);
    }
    open.onclick=()=>selectMember(member,row,name,contact,state,controls);
    memberRows.push(row);list.append(row);
    if(selectedMemberId===member.user_id)selectMember(member,row,name,contact,state,controls);
  }
  if(!data.some(member=>member.user_id===selectedMemberId))resetMemberDetail();
  root.querySelector('#attention-trials-count').textContent=trialEnding?`${trialEnding} trial${trialEnding===1?'':'s'} ending soon`:'No trials ending soon';
  sortMembers();
}

async function loadReleaseQueue(client) {
  const note = root.querySelector('#content-status');
  const list = root.querySelector('#content-list');
  const { data, error } = await client.rpc('talktag_admin_release_queue', { p_limit: 50 });
  if (error || !Array.isArray(data)) {
    note.textContent = 'The release queue is not connected yet.';
    return;
  }
  note.textContent = `Showing ${data.length} catalog records · read only`;
  list.replaceChildren();
  for (const card of data) {
    const row = document.createElement('div');
    row.className = 'content-row';
    row.dataset.filter=card.published?'published':'pending';
    const name = document.createElement('strong');
    name.textContent = `${card.language.toUpperCase()} · ${card.area} · ${card.level} ${String(card.ordinal).padStart(3, '0')}`;
    const detail = document.createElement('small');
    detail.textContent = `${card.card_id} · ${card.media_count} media · ${card.has_content ? 'script ready' : 'script missing'}`;
    const state = document.createElement('span');
    state.className = `content-state ${card.published ? 'is-live' : ''}`;
    state.textContent = card.published ? 'Published' : 'Pending';
    row.append(name, detail, state);
    list.append(row);
  }
  const checks=contentChecks(data);
  root.querySelector('#attention-content-count').textContent=checks?`${checks} content checks`:'Content checks clear';
  filterRows('content');
}

async function loadAudit(client) {
  const note = root.querySelector('#audit-status');
  const list = root.querySelector('#audit-list');
  const { data, error } = await client.rpc('talktag_admin_recent_audit', { p_limit: 30 });
  if (error || !Array.isArray(data)) {
    note.textContent = 'The audit history is not connected yet.';
    return;
  }
  note.textContent = `${data.length} recent administrator actions`;
  list.replaceChildren();
  const home=root.querySelector('#home-activity');home.replaceChildren();
  if(!data.length)home.textContent='No administrator changes yet.';
  if(!data.length){const empty=document.createElement('p');empty.textContent='No administrator changes yet.';list.append(empty);}
  for (const entry of data) {
    const row = document.createElement('div');
    row.className = 'audit-row';
    const action = document.createElement('strong');
    action.textContent = entry.action.replaceAll('_', ' ');
    const meta = document.createElement('small');
    const when = new Date(entry.created_at);
    meta.textContent = `${Number.isNaN(when.getTime()) ? 'Unknown time' : when.toLocaleString()} · target ${entry.target_user_id || '—'}`;
    row.append(action, meta);
    list.append(row);
    if(home.children.length<5)home.append(row.cloneNode(true));
  }
}

async function loadGatherings(client){
 const result=await client.rpc('talktag_meetups_preview_list');
 const label=root.querySelector('#attention-gatherings-count');
 if(result.error||!Array.isArray(result.data)){label.textContent='Check gathering schedule';return;}
 const count=upcomingGatherings(result.data);
 label.textContent=count?`${count} upcoming gathering${count===1?'':'s'}`:'No upcoming gatherings';
}

async function loadOverview() {
  refreshButton.disabled=true;
  if (!suppliedClient && (!config.url || !/^sb_publishable_/.test(config.publishableKey || ''))) {
    refreshButton.disabled=false;deny('The account connection is unavailable.');
    return;
  }
  try {
    const client = suppliedClient || createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      deny('Please sign in with an administrator account.');
      return;
    }
    const { data, error } = await client.rpc('talktag_admin_overview');
    if (error || !data) {
      deny('This account does not have administrator access, or the Overview is not connected yet.');
      return;
    }
    const fields = {
      accounts: data.accounts,
      trials: data.activeTrials,
      paid: data.activePaid,
      snowpals: data.snowpals,
      catalog: data.catalogCards,
      ready: data.previewReadyCards
    };
    for (const [id, value] of Object.entries(fields)) {
      root.querySelector('#'+id).textContent = Number.isSafeInteger(value)
        ? value.toLocaleString() : '—';
    }
    status.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · Administrator access verified`;
    dashboard.hidden = false;
    accessCard.hidden = true;
    await Promise.all([loadMembers(client,user.id),loadReleaseQueue(client),loadAudit(client),loadGatherings(client)]);
  } catch {
    deny('Could not load the board. Check your connection, then refresh.');
  } finally {refreshButton.disabled=false;}
}

showPanel('home');
loadOverview();

}
