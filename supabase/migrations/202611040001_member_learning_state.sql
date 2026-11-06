-- Account-owned resume state and recent lesson history. Existing completions stay intact.
begin;
create table if not exists public.member_learning_state (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (length(lesson_id) between 1 and 160),
 state_key text not null check (length(state_key) between 1 and 300),
 value text,
 updated_at timestamptz not null default now(),
 primary key(user_id, lesson_id, state_key)
);
create table if not exists public.member_learning_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (length(lesson_id) between 1 and 160),
 title text not null default '',
 last_opened_at timestamptz not null default now(),
 primary key(user_id, lesson_id)
);
alter table public.member_learning_state enable row level security;
alter table public.member_learning_history enable row level security;
create policy own_learning_state_select on public.member_learning_state for select to authenticated using(user_id=auth.uid());
create policy own_learning_history_select on public.member_learning_history for select to authenticated using(user_id=auth.uid());
grant select on public.member_learning_state, public.member_learning_history to authenticated;
revoke all on public.member_learning_state, public.member_learning_history from anon;
create or replace function public.save_member_learning_state(p_lesson_id text,p_changes jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not public.can_access_talktag_card(p_lesson_id) then raise exception 'Card unavailable'; end if;
 if jsonb_typeof(p_changes)<>'object' or octet_length(p_changes::text)>200000 then raise exception 'Invalid state'; end if;
 insert into public.member_learning_state(user_id,lesson_id,state_key,value)
 select auth.uid(),p_lesson_id,key,case when value='null'::jsonb then null else value#>>'{}' end from jsonb_each(p_changes)
 on conflict(user_id,lesson_id,state_key) do update set value=excluded.value,updated_at=now();
end $$;
create or replace function public.record_member_lesson_open(p_lesson_id text,p_title text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.can_access_talktag_card(p_lesson_id) then raise exception 'Card unavailable'; end if;
 insert into public.member_learning_history(user_id,lesson_id,title) values(auth.uid(),p_lesson_id,left(p_title,500))
 on conflict(user_id,lesson_id) do update set title=excluded.title,last_opened_at=now();
end $$;
revoke all on function public.save_member_learning_state(text,jsonb),public.record_member_lesson_open(text,text) from public,anon;
grant execute on function public.save_member_learning_state(text,jsonb),public.record_member_lesson_open(text,text) to authenticated;
commit;
