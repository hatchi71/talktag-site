export async function renderMemberHistory(client, userId, host, english) {
 host.replaceChildren();
 const title=document.createElement('h2'); title.textContent=english?'Learning history':'학습 기록'; host.append(title);
 const results=await Promise.all([
   client.from('member_learning_history').select('lesson_id,title,last_opened_at').eq('user_id',userId).order('last_opened_at',{ascending:false}).limit(100),
   client.from('learning_progress').select('lesson_id,completed_at').eq('user_id',userId)
 ]);
 if(results.some(r=>r.error)){const p=document.createElement('p');p.textContent=english?'History could not be loaded. Please reconnect and reload.':'기록을 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.';host.append(p);return;}
 const completed=new Map(results[1].data.map(r=>[r.lesson_id,r.completed_at]));
 const items=[...results[0].data];
 for(const row of results[1].data)if(!items.some(i=>i.lesson_id===row.lesson_id))items.push({...row,title:row.lesson_id,last_opened_at:row.completed_at});
 const summary=document.createElement('p');summary.textContent=english?`${completed.size} completed missions · Saved to your account`:`완료한 미션 ${completed.size}개 · 계정에 저장됨`;host.append(summary);
 const list=document.createElement('ul');list.style.cssText='list-style:none;padding:0;display:grid;gap:12px';
 for(const item of items){
   const li=document.createElement('li'),a=document.createElement('a'),date=document.createElement('small');
   a.href=`/protected-card.html?id=${encodeURIComponent(item.lesson_id)}`;a.textContent=`${completed.has(item.lesson_id)?'✓ ':''}${item.title||item.lesson_id}`;
   a.style.cssText='display:block;padding:14px;border:1px solid currentColor;border-radius:14px;line-height:1.5;color:inherit';
   date.textContent=new Date(item.last_opened_at).toLocaleString(english?'en':'ko');date.style.display='block';a.append(date);li.append(a);list.append(li);
 }
 if(!items.length){summary.textContent=english?'Your learning history will appear here after you open a card.':'카드를 열면 학습 기록이 여기에 표시됩니다.';}
 host.append(list);
}
