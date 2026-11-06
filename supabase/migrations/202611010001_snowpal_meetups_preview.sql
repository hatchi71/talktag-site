-- Preview-only Talk & Tag schedule management. No client can write the table directly.
create table if not exists public.talktag_meetups_preview (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  location text not null check (char_length(location) between 2 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 100),
  note text not null default '' check (char_length(note) <= 600),
  status text not null default 'scheduled' check (status in ('scheduled','canceled')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talktag_meetups_preview_times check (ends_at > starts_at)
);
create index if not exists talktag_meetups_preview_starts_idx
  on public.talktag_meetups_preview (starts_at);
alter table public.talktag_meetups_preview enable row level security;
revoke all on public.talktag_meetups_preview from public, anon, authenticated;

create or replace function public.talktag_meetups_preview_list()
returns table (id uuid, title text, location text, starts_at timestamptz,
  ends_at timestamptz, capacity integer, note text, status text)
language plpgsql security definer stable set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_roles r where r.user_id = (select auth.uid())
      and r.role in ('admin','snowpal')
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  return query select m.id, m.title, m.location, m.starts_at, m.ends_at,
    m.capacity, m.note, m.status from public.talktag_meetups_preview m
    where m.starts_at >= now() - interval '30 days'
    order by m.starts_at asc limit 100;
end;
$$;

create or replace function public.talktag_meetups_preview_save(
  p_id uuid, p_title text, p_location text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_capacity integer, p_note text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.staff_roles r where r.user_id = v_actor
      and r.role in ('admin','snowpal')
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 100
     or p_location is null or char_length(btrim(p_location)) not between 2 and 160
     or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
     or p_starts_at < now() - interval '1 day' or p_capacity not between 1 and 100
     or char_length(coalesce(p_note,'')) > 600 then
    raise exception 'Invalid gathering details' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.talktag_meetups_preview
      (title, location, starts_at, ends_at, capacity, note, created_by, updated_by)
    values (btrim(p_title), btrim(p_location), p_starts_at, p_ends_at,
      p_capacity, coalesce(p_note,''), v_actor, v_actor) returning id into v_id;
  else
    update public.talktag_meetups_preview m set
      title = btrim(p_title), location = btrim(p_location), starts_at = p_starts_at,
      ends_at = p_ends_at, capacity = p_capacity, note = coalesce(p_note,''),
      updated_by = v_actor, updated_at = now()
    where m.id = p_id and m.status = 'scheduled' returning m.id into v_id;
    if v_id is null then
      raise exception 'Scheduled gathering not found' using errcode = '22023';
    end if;
  end if;
  insert into public.talktag_admin_audit
    (actor_user_id, action, details)
  values (v_actor, case when p_id is null then 'create_meetup' else 'update_meetup' end,
    jsonb_build_object('meetupId', v_id));
  return v_id;
end;
$$;

create or replace function public.talktag_meetups_preview_cancel(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_changed integer;
begin
  if v_actor is null or not exists (
    select 1 from public.staff_roles r where r.user_id = v_actor
      and r.role in ('admin','snowpal')
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  update public.talktag_meetups_preview m set status = 'canceled',
    updated_by = v_actor, updated_at = now()
    where m.id = p_id and m.status = 'scheduled';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into public.talktag_admin_audit (actor_user_id, action, details)
      values (v_actor, 'cancel_meetup', jsonb_build_object('meetupId', p_id));
  end if;
  return v_changed > 0;
end;
$$;

revoke all on function public.talktag_meetups_preview_list()
  from public, anon, authenticated;
grant execute on function public.talktag_meetups_preview_list() to authenticated;
revoke all on function public.talktag_meetups_preview_save(uuid,text,text,timestamptz,timestamptz,integer,text)
  from public, anon, authenticated;
grant execute on function public.talktag_meetups_preview_save(uuid,text,text,timestamptz,timestamptz,integer,text)
  to authenticated;
revoke all on function public.talktag_meetups_preview_cancel(uuid)
  from public, anon, authenticated;
grant execute on function public.talktag_meetups_preview_cancel(uuid) to authenticated;
