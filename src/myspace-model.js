export const areas=['guided-listen-repeat','mini-talks','vocal-camp','story-camp','readable'];
export function groupMySpace(catalog,language,completions,history,states){
 const completed=new Map(completions.map(r=>[r.lesson_id,r.completed_at]));
 const visits=new Map(history.map(r=>[r.lesson_id,r]));
 const saved=new Map();
 for(const row of states){if(!saved.has(row.lesson_id))saved.set(row.lesson_id,[]);saved.get(row.lesson_id).push(row);}
 return areas.map(area=>{
  const cards=Object.entries(catalog).filter(([,c])=>c.language===language&&c.area===area).map(([id,c])=>{
   const records=saved.get(id)||[];
   const position=records.find(r=>/position/.test(r.state_key)&&Number(r.value)>0);
   const stage=records.find(r=>/:stage$/.test(r.state_key)&&Number(r.value)>0);
   const started=visits.has(id)||records.some(r=>r.value!==null&&!/pause|completed/.test(r.state_key)&&r.value!==''&&r.value!=='0');
   return {...c,id,completedAt:completed.get(id),started,position:Number(position?.value)||0,stage:Number(stage?.value)||0,lastOpened:visits.get(id)?.last_opened_at||''};
  }).sort((a,b)=>a.level.localeCompare(b.level)||a.ordinal-b.ordinal||a.id.localeCompare(b.id));
  const done=cards.filter(c=>c.completedAt).sort((a,b)=>b.completedAt.localeCompare(a.completedAt));
  const unfinished=cards.filter(c=>!c.completedAt);
  const continuing=unfinished.filter(c=>c.started).sort((a,b)=>b.lastOpened.localeCompare(a.lastOpened));
  return {area,cards,done,unfinished,continuing,notStarted:unfinished.length-continuing.length};
 });
}

// Keep the member's own records visible after a lesson leaves the public catalog.
// The private retirement table is administrator-only; these rows come from the member's
// existing progress, visit history, and saved state queries.
export function historicalMySpace(catalog,language,completions,history,states){
 const visits=new Map(history.map(row=>[row.lesson_id,row]));
 const completed=new Map(completions.map(row=>[row.lesson_id,row.completed_at]));
 const ids=new Set([...completed.keys(),...visits.keys(),...states.map(row=>row.lesson_id)]);
 const cardLanguage=id=>/^(?:ko-|mt-ko-)/.test(id)?'ko':/^(?:ja-|mt-ja-)/.test(id)?'ja':'en';
 return [...ids].filter(id=>id&&!id.includes(':')&&!catalog[id]&&cardLanguage(id)===language).map(id=>{
  const visit=visits.get(id),completedAt=completed.get(id)||'',lastOpened=visit?.last_opened_at||'';
  const level=id.match(/(?:^|-)(a0|a1|a2|b1|b2|c1|c2)(?:-|$)/i)?.[1]?.toUpperCase()||'';
  return {id,title:visit?.title||`${level||'Earlier'} lesson`,level,completedAt,lastOpened};
 }).sort((a,b)=>(b.lastOpened||b.completedAt).localeCompare(a.lastOpened||a.completedAt));
}
