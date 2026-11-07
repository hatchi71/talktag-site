// Never put analytics failures on the sign-in/playback critical path.
const lastRecorded = new Map();
export async function recordMemberVisit(client, userId, now = Date.now()) {
 if (!userId || now - (lastRecorded.get(userId) || 0) < 60000) return;
 lastRecorded.set(userId, now);
 try { const result = await client.rpc('talktag_record_visit'); if(result.error) lastRecorded.delete(userId); }
 catch { lastRecorded.delete(userId); }
}
