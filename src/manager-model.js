export function contentChecks(cards){
 return cards.filter(card=>!card.published||!card.has_content||(Number(card.media_count)===0&&card.area!=='readable')).length;
}
export function upcomingGatherings(items,now=Date.now()){
 return items.filter(item=>item.status==='scheduled'&&Date.parse(item.ends_at)>now).length;
}

export function compareMembers(a,b,field='registered',order='desc'){
 const sign=order==='asc'?1:-1;
 if(field==='name'){
  const missingA=!a.name,missingB=!b.name;
  if(missingA!==missingB)return missingA?1:-1;
  return sign*(a.name||'').localeCompare(b.name||'',['ko','en'],{numeric:true,sensitivity:'base'})||a.rank-b.rank;
 }
 // The admin RPC returns registration dates newest-first; preserve that server order.
 return sign*(b.rank-a.rank);
}
