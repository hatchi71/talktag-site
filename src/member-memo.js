import {formatMemberDate} from './member-insights-view.js';
export function mountMemberMemo(host,client,userId,isCurrent){
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const box=make('section');box.className='member-memo';
 const title=make('h5','Private member memo'),hint=make('p','Administrator only · This member cannot see your memo.');hint.className='detail-hint';
 const label=make('label','Memo for this member');const input=make('textarea');input.rows=6;input.maxLength=10000;input.placeholder='Add useful information about this member…';input.disabled=true;label.append(input);
 const status=make('p','Loading memo…');status.setAttribute('role','status');status.className='detail-hint';
 const save=make('button','Save memo');save.type='button';save.disabled=true;
 const reload=make('button','Reload saved memo');reload.type='button';reload.className='memo-reload';
 const actions=make('div');actions.className='memo-actions';actions.append(save,reload);box.append(title,hint,label,actions,status);host.append(box);
 let revision=0,saved='',saving=false,dirty=false;
 const update=()=>{dirty=input.value!==saved;save.disabled=saving||input.disabled||!dirty;save.textContent=saving?'Saving…':'Save memo';if(dirty&&!saving)status.textContent='Unsaved changes';};
 input.addEventListener('input',update);
 const beforeLeave=event=>{if(!box.isConnected){window.removeEventListener('beforeunload',beforeLeave);return;}if(dirty){event.preventDefault();event.returnValue='';}};
 window.addEventListener('beforeunload',beforeLeave);
 async function load(){
  if(dirty&&!window.confirm('Discard unsaved changes and reload the saved memo?'))return;
  input.disabled=true;save.disabled=true;status.textContent='Loading memo…';
  try{const {data,error}=await client.rpc('talktag_admin_get_member_memo',{p_user_id:userId});if(!isCurrent())return;if(error||!data)throw error||Error('Unable to load');revision=data.revision;saved=data.memo;input.value=saved;input.disabled=false;dirty=false;update();status.textContent=data.updated_at?'Saved '+formatMemberDate(data.updated_at):'No memo yet.';}
  catch{if(isCurrent())status.textContent='Memo could not be loaded. Please reload to retry.';}
 }
 reload.onclick=load;
 save.onclick=async()=>{if(saving||input.disabled)return;saving=true;input.disabled=true;reload.disabled=true;update();const value=input.value;
  try{const {data,error}=await client.rpc('talktag_admin_save_member_memo',{p_user_id:userId,p_memo:value,p_revision:revision});if(!isCurrent())return;if(error||!data)throw error||Error('Unable to save');revision=data.revision;saved=value;status.textContent='Saved '+formatMemberDate(data.updated_at);}
  catch(error){if(isCurrent())status.textContent=error?.code==='40001'?'Another administrator changed this memo. Copy your text, then reload before saving.':'Could not save. Your text is still here; please retry.';}
  finally{saving=false;if(isCurrent()){input.disabled=false;reload.disabled=false;dirty=input.value!==saved;save.disabled=!dirty;save.textContent='Save memo';}}
 };
 void load();
 return {hasUnsavedChanges:()=>dirty,destroy:()=>window.removeEventListener('beforeunload',beforeLeave)};
}
