// Supabase owns saved state; local storage holds only account-scoped pending writes.
export async function openMemberLearningState(client, userId, lessonId, storage = globalThis.localStorage) {
  const cacheKey = `talktag-member-cache:v1:${userId}:${lessonId}`;
  let values = {}, pending = {}, timer, active = true, saving = null;
  const notify = message => globalThis.dispatchEvent?.(new CustomEvent('talktag:sync-status', { detail: { message } }));
  const cache = () => { try { if (Object.keys(pending).length) storage.setItem(cacheKey, JSON.stringify({ pending, cachedAt: Date.now() })); else storage.removeItem?.(cacheKey); } catch {} };
  const { data, error } = await client.from('member_learning_state').select('state_key,value').eq('user_id', userId).eq('lesson_id', lessonId);
  if (error) throw new Error('Learning records could not be loaded. Please reconnect and try again.');
  for (const row of data || []) values[row.state_key] = row.value;
  try {
    const saved = JSON.parse(storage.getItem(cacheKey) || 'null');
    if (saved?.pending && typeof saved.pending === 'object' && !Array.isArray(saved.pending)) pending = saved.pending;
  } catch {}
  Object.assign(values, pending);
  async function flush() {
    clearTimeout(timer); timer = null;
    if (!active || saving || !Object.keys(pending).length) return saving;
    const batch = { ...pending };
    saving = (async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!active || session?.user.id !== userId) return;
      const result = await client.rpc('save_member_learning_state', { p_lesson_id: lessonId, p_changes: batch });
      if (result.error) { notify('Not synced yet. Reconnect to save your progress.'); return; }
      for (const key of Object.keys(batch)) if (pending[key] === batch[key]) delete pending[key];
      cache(); notify('Progress saved');
    })().catch(() => { notify('Not synced yet. Reconnect to save your progress.'); }).finally(() => { saving = null; if (active && Object.keys(pending).length && !timer) timer = setTimeout(flush, 5000); });
    return saving;
  }
  function setItem(key, value) {
    if (!active) return;
    values[key] = value === null ? null : String(value); pending[key] = values[key]; cache();
    if (!timer) timer = setTimeout(flush, 1000);
  }
  const online = () => flush();
  globalThis.addEventListener?.('online', online);
  if (Object.keys(pending).length) timer = setTimeout(flush, 0);
  return {
    getItem: key => values[key] ?? null, setItem,
    removeItem: key => setItem(key, null), flush,
    close() { active = false; clearTimeout(timer); globalThis.removeEventListener?.('online', online); values = {}; },
  };
}
