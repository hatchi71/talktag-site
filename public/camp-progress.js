/* Completion authority is the signed-in member record in Supabase. */
(() => {
 'use strict';
 // PPP 001 uses the protected player's card ID; older and Japanese keys keep their existing mapping.
 const id=(camp,level,number)=>{
  if(Number(number)===1 && !camp.startsWith('ja-')){
   const language=camp.startsWith('ko-')?'ko':'en';
   const area=camp.replace(/^ko-/,'');
   return `${language}-${area}-camp-${level.toLowerCase()}-001-ppp-v2`;
  }
  return `${camp}camp:${level}:${Number(number)}${Number(number)===1?':short-v3':''}`;
 };
 window.TalkTagCampProgress={id,done:(camp,level,number)=>Boolean(window.TalkTagCompletion?.get(id(camp,level,number))),set:(camp,level,number,value)=>window.TalkTagCompletion?.set(id(camp,level,number),value)};
})();
