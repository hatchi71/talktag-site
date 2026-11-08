export async function connectMemberRecords(client, userId) {
 const result = await client.from('learning_progress').select('lesson_id,completed_at').eq('user_id', userId);
 if (result.error) throw result.error;
 const completed = {};
 const lessonId = id => {
   const value=String(id);
   const camp=value.match(/^(?:(ko|ja)-)?(vocal|story)camp:([A-C][0-2]):(\d+)(?::short-v3)?$/);
   if(camp)return `${camp[1]||'en'}-${camp[2]}-camp-${String(camp[4]).padStart(3,'0')}-${camp[3].toLowerCase()}`;
   return value.replace(/^readable:en:/,'').replace(/^(audio|readable):/,'');
 };
 for (const row of result.data || []) completed[row.lesson_id] = {completedAt:row.completed_at,source:'manual'};
 const records = {
   userId,
   get(id) { return completed[lessonId(id)]; },
   async set(id, done) {
     const {data:{session}}=await client.auth.getSession();
     if (session?.user.id!==userId) throw Error('Sign in required');
     const key=lessonId(id), query=client.from('learning_progress');
     const response=done?await query.insert({user_id:userId,lesson_id:key}):await query.delete().eq('user_id',userId).eq('lesson_id',key);
     if(response.error && !(done&&response.error.code==='23505')) throw response.error;
     if(done)completed[key]={completedAt:new Date().toISOString(),source:'manual'};else delete completed[key];
     window.dispatchEvent(new CustomEvent('talktag:completion-change', {detail:{id,completed:done}}));
   }
 };
 const {data:{session:current}}=await client.auth.getSession();
 if(current?.user.id!==userId)return null;
 window.TalkTagMemberRecords=records;
 window.dispatchEvent(new CustomEvent('talktag:completion-change', {detail:{id:null,hydrated:true}}));
 return records;
}
