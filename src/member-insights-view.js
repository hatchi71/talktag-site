export const formatMemberDate = value => {
 const d = new Date(value); return value && Number.isFinite(d.getTime()) ? d.toLocaleString('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not recorded';
};
const areas={'guided-listen-repeat':'Guided L&R','mini-talks':'Mini Talks','vocal-camp':'Vocal Camp','story-camp':'Story Camp',readable:'Readable','test-content':'Tests'};
const languages={en:'English',ko:'Korean',ja:'Japanese'};
export function renderMemberInsights(host, member, client, isCurrent) {
 const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const info=member.insights;
 if(!info){host.append(make('p','Member statistics could not be loaded. Refresh to retry.'));return;}
 const facts=make('dl',undefined,'member-facts');
 for(const [label,value] of [['Registered',formatMemberDate(info.registered_at)],['Last sign-in',formatMemberDate(info.last_sign_in_at)],['Email verified',info.email_confirmed?'Yes':'No / social sign-in'],['Last learning',formatMemberDate(info.last_learning_at)],['Last visit',formatMemberDate(info.last_visit_at)]]){facts.append(make('dt',label),make('dd',value));}
 const identities=make('div',undefined,'member-identities');identities.append(make('h5','Sign-in accounts'));
 for(const id of info.identities||[]){const card=make('div',undefined,'identity-record');card.append(make('strong',({google:'Google',kakao:'Kakao',email:'Email & password / code'})[id.provider]||id.provider));card.append(make('span',id.email||member.email||'Email not supplied'));if(id.provider!=='email'&&id.provider_id)card.append(make('small',`${id.provider==='kakao'?'Kakao':'Provider'} ID · ${id.provider_id}`));identities.append(card);}
 if(!info.identities?.length)identities.append(make('p','Sign-in method not recorded.'));
 const stats=make('div',undefined,'member-stat-grid');
 for(const [n,label] of [[info.completed_count,'Completed cards'],[Math.max(0,Number(info.started_count)-Number(info.completed_count)),'In progress'],[info.visits_30d,'Visits · 30 days'],[info.active_days_30d,'Active days · 30 days']]){const stat=make('div');stat.append(make('strong',String(n||0)),make('small',label));stats.append(stat);}
 const foot=make('p',`Visits are signed-in 30-minute windows, not page views. ${info.visits||0} total recorded. Tracking ${info.tracking_since?'since '+formatMemberDate(info.tracking_since):'starts with the next signed-in visit'}.`,'detail-hint');
 const learning=make('div',undefined,'member-learning');learning.append(make('h5','Learning by language & category'),make('p','Loading learning records…'));
 const overview=make('div');overview.append(stats,facts,identities,foot);learning.hidden=true;host.append(overview,learning);
 client.rpc('talktag_admin_member_learning',{p_user_id:member.user_id}).then(({data,error})=>{
  if(!isCurrent())return;
  learning.replaceChildren(make('h5','Learning by language & category'));
  if(error||!data){learning.append(make('p','Learning records could not be loaded. Select this member again to retry.'));return;}
  for(const code of ['en','ko','ja']){
   const groups=(data.groups||[]).filter(g=>g.language===code);if(!groups.length)continue;
   const section=make('details',undefined,'member-language');section.open=code==='en';section.append(make('summary',`${languages[code]} · ${groups.reduce((n,g)=>n+Number(g.completed),0)} complete`));
   for(const g of groups){const row=make('div',undefined,'member-progress-row');row.append(make('strong',areas[g.area]||g.area),make('small',`${g.completed} / ${g.total} complete · ${Math.max(0,g.started-g.completed)} in progress`));const bar=make('progress');bar.max=g.total||1;bar.value=g.completed;bar.setAttribute('aria-label',`${languages[code]} ${areas[g.area]||g.area} completed`);row.append(bar);section.append(row);}learning.append(section);
  }
  const recent=make('details',undefined,'member-recent member-language');recent.append(make('summary',`Recent lessons · ${(data.recent||[]).length}`));
  for(const item of data.recent||[]){const row=make('div',undefined,'identity-record');row.append(make('strong',item.title||`${item.level} · ${String(item.ordinal).padStart(3,'0')}`),make('small',`${languages[item.language]} · ${areas[item.area]||item.area} · ${item.level} · ${item.completed_at?'Completed':'In progress'}`),make('small',formatMemberDate(item.last_opened_at)));recent.append(row);}
  if(!data.recent?.length)recent.append(make('p','No lesson visits recorded yet.'));learning.append(recent);
 }).catch(()=>{if(isCurrent())learning.replaceChildren(make('p','Learning records unavailable. Select the member again to retry.'));});
 return {overview,learning};
}
