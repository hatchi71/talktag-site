import { createClient } from '@supabase/supabase-js';

const config = window.TalkTagAuthConfig || {};
const status = document.querySelector('#status');
const workspace = document.querySelector('#workspace');
const denied = document.querySelector('#denied');
const form = document.querySelector('#meetup-form');
const list = document.querySelector('#meetup-list');
const listStatus = document.querySelector('#list-status');
let client;
let meetups = [];

function showDenied(message) {
  status.textContent = message;
  workspace.hidden = true;
  denied.hidden = false;
}

function localInput(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function resetForm() {
  form.reset();
  document.querySelector('#meetup-id').value = '';
  document.querySelector('#capacity').value = '8';
  document.querySelector('#form-title').textContent = 'New gathering';
  document.querySelector('#save').textContent = 'Save gathering';
}

function renderMeetups() {
  list.replaceChildren();
  if (!meetups.length) {
    listStatus.textContent = 'No gatherings are scheduled yet.';
    return;
  }
  listStatus.textContent = `${meetups.length} recent or upcoming gatherings`;
  for (const meetup of meetups) {
    const row = document.createElement('article');
    row.className = `meetup ${meetup.status === 'canceled' ? 'canceled' : ''}`;
    const title = document.createElement('strong');
    title.textContent = meetup.title;
    const details = document.createElement('small');
    details.textContent = `${new Date(meetup.starts_at).toLocaleString()}–${new Date(meetup.ends_at).toLocaleTimeString()} · ${meetup.location} · ${meetup.capacity} places · ${meetup.status}`;
    row.append(title, details);
    if (meetup.note) {
      const note = document.createElement('p');
      note.textContent = meetup.note;
      row.append(note);
    }
    if (meetup.status === 'scheduled') {
      const actions = document.createElement('div');
      actions.className = 'actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.textContent = 'Edit';
      edit.addEventListener('click', () => {
        document.querySelector('#meetup-id').value = meetup.id;
        document.querySelector('#title').value = meetup.title;
        document.querySelector('#location').value = meetup.location;
        document.querySelector('#starts').value = localInput(meetup.starts_at);
        document.querySelector('#ends').value = localInput(meetup.ends_at);
        document.querySelector('#capacity').value = String(meetup.capacity);
        document.querySelector('#note').value = meetup.note;
        document.querySelector('#form-title').textContent = 'Edit gathering';
        document.querySelector('#save').textContent = 'Save changes';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'Cancel gathering';
      let confirmingCancel = false;
      cancel.addEventListener('click', async () => {
        if (!confirmingCancel) {
          confirmingCancel = true;
          cancel.textContent = 'Confirm cancellation';
          status.textContent = `Select Confirm cancellation again to cancel “${meetup.title}”.`;
          return;
        }
        cancel.disabled = true;
        const { error } = await client.rpc('talktag_meetups_preview_cancel', { p_id: meetup.id });
        status.textContent = error ? 'The gathering could not be canceled.' : 'Gathering canceled and recorded.';
        if (error) cancel.disabled = false;
        else await loadMeetups();
      });
      actions.append(edit, cancel); row.append(actions);
    }
    list.append(row);
  }
}

async function loadMeetups() {
  const { data, error } = await client.rpc('talktag_meetups_preview_list');
  if (error || !Array.isArray(data)) {
    showDenied('Staff schedule controls are unavailable or this account lacks access.');
    return;
  }
  meetups = data;
  renderMeetups();
  workspace.hidden = false;
  denied.hidden = true;
  status.textContent = 'Staff access verified. Preview schedule only.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const start = new Date(document.querySelector('#starts').value);
  const end = new Date(document.querySelector('#ends').value);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    status.textContent = 'End time must be after start time.';
    return;
  }
  const save = document.querySelector('#save');
  save.disabled = true; status.textContent = 'Saving gathering…';
  const { error } = await client.rpc('talktag_meetups_preview_save', {
    p_id: document.querySelector('#meetup-id').value || null,
    p_title: document.querySelector('#title').value.trim(),
    p_location: document.querySelector('#location').value.trim(),
    p_starts_at: start.toISOString(), p_ends_at: end.toISOString(),
    p_capacity: Number(document.querySelector('#capacity').value),
    p_note: document.querySelector('#note').value.trim()
  });
  save.disabled = false;
  if (error) { status.textContent = error.message || 'The gathering was not saved.'; return; }
  resetForm(); await loadMeetups();
  status.textContent = 'Gathering saved and recorded.';
});
document.querySelector('#clear-form').addEventListener('click', resetForm);

async function start() {
  if (!config.url || !/^sb_publishable_/.test(config.publishableKey || '')) {
    showDenied('The temporary-site authentication service is unavailable.');
    return;
  }
  client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) { showDenied('Please sign in as a Snowpal or administrator.'); return; }
  await loadMeetups();
}
start().catch(() => showDenied('The schedule could not load. No changes were made.'));
