/* Completion authority is the signed-in member record in Supabase. */
(() => {
 'use strict';
 const id=(camp,level,number)=>`${camp}camp:${level}:${Number(number)}${Number(number)===1?':short-v3':''}`;
 window.TalkTagCampProgress={id,done:(camp,level,number)=>Boolean(window.TalkTagCompletion?.get(id(camp,level,number))),set:(camp,level,number,value)=>window.TalkTagCompletion?.set(id(camp,level,number),value)};
})();
