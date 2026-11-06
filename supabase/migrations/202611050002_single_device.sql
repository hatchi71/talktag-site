begin;
-- One persistent winning session per member. Logging out the new session never
-- reactivates an older one. Only trusted admin roles bypass the device limit.
create table if not exists public.member_active_session (
 user_id uuid primary key references auth.users(id) on delete cascade,
 session_id uuid not null,
 signed_in_at timestamptz not null
);
alter table public.member_active_session enable row level security;
revoke all on public.member_active_session from public,anon,authenticated;
create or replace function public.talktag_track_session()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.member_active_session(user_id,session_id,signed_in_at)
 values(new.user_id,new.id,new.created_at)
 on conflict(user_id) do update set session_id=excluded.session_id,signed_in_at=excluded.signed_in_at
 where excluded.signed_in_at>member_active_session.signed_in_at
 or (excluded.signed_in_at=member_active_session.signed_in_at and excluded.session_id>member_active_session.session_id);
 return new;
end;$$;
revoke all on function public.talktag_track_session() from public,anon,authenticated;
drop trigger if exists talktag_one_active_session on auth.sessions;
create trigger talktag_one_active_session after insert on auth.sessions for each row execute function public.talktag_track_session();
insert into public.member_active_session(user_id,session_id,signed_in_at)
 select distinct on(user_id) user_id,id,created_at from auth.sessions order by user_id,created_at desc,id desc
 on conflict(user_id) do update set session_id=excluded.session_id,signed_in_at=excluded.signed_in_at
 where excluded.signed_in_at>=member_active_session.signed_in_at;
create or replace function public.talktag_device_session_allowed()
returns boolean language sql security definer stable set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from auth.sessions s where s.id::text=(auth.jwt()->>'session_id') and s.user_id=auth.uid())
 and (exists(select 1 from public.staff_roles r where r.user_id=auth.uid() and r.role='admin')
 or exists(select 1 from public.member_active_session a where a.user_id=auth.uid() and a.session_id::text=(auth.jwt()->>'session_id')));
$$;
revoke all on function public.talktag_device_session_allowed() from public,anon,authenticated;
grant execute on function public.talktag_device_session_allowed() to authenticated;
-- Add the same check to the canonical lesson authorization predicate.
do $$ declare definition text;begin
 definition:=pg_get_functiondef('public.can_access_talktag_card(text)'::regprocedure);
 if position('talktag_device_session_allowed()' in definition)=0 then
  definition:=replace(definition,'if v_user_id is null then return false; end if;', 'if v_user_id is null or not public.talktag_device_session_allowed() then return false; end if;');
  if position('talktag_device_session_allowed()' in definition)=0 then raise exception 'Card authorization pattern changed';end if;
  execute definition;
 end if;
end;$$;
-- Existing own-account rules still apply; this restriction cannot grant access.
do $$ declare t text;begin
 foreach t in array array['learning_progress','member_learning_state','member_learning_history'] loop
 execute format('drop policy if exists talktag_active_device on public.%I',t);
 execute format('create policy talktag_active_device on public.%I as restrictive for all to authenticated using(public.talktag_device_session_allowed()) with check(public.talktag_device_session_allowed())',t);
 end loop;
end;$$;
commit;
