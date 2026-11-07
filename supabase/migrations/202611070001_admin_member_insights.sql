begin;
-- One visit per authenticated account and 30-minute server window. No IP,
-- browser fingerprint, OAuth token, or browsing URL is stored.
create table if not exists public.member_visit_windows (
 user_id uuid not null references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 last_seen_at timestamptz not null default now(),
 primary key(user_id,window_start)
);
alter table public.member_visit_windows enable row level security;
revoke all on public.member_visit_windows from public,anon,authenticated;
create or replace function public.talktag_record_visit() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.talktag_device_session_allowed() then raise exception 'Active sign-in required' using errcode='42501'; end if;
 insert into public.member_visit_windows(user_id,window_start)
 values(auth.uid(),to_timestamp(floor(extract(epoch from now())/1800)*1800))
 on conflict(user_id,window_start) do update set last_seen_at=now();
end;$$;
revoke all on function public.talktag_record_visit() from public,anon,authenticated;
grant execute on function public.talktag_record_visit() to authenticated;

create or replace function public.talktag_admin_member_insights(p_limit integer default 100)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare result jsonb;
begin
 if not public.talktag_device_session_allowed() or not exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then
 raise exception 'Administrator access required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid page size';end if;
 select coalesce(jsonb_agg(x.item order by x.registered_at desc),'[]'::jsonb) into result from (
 select u.created_at registered_at,jsonb_build_object(
 'user_id',u.id,'registered_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
 'email_confirmed',u.email_confirmed_at is not null,
 'is_admin',exists(select 1 from public.staff_roles r where r.user_id=u.id and r.role='admin'),
 'identities',coalesce((select jsonb_agg(jsonb_build_object('provider',i.provider,'provider_id',i.provider_id,'email',i.identity_data->>'email')) from auth.identities i where i.user_id=u.id),'[]'::jsonb),
 'completed_count',(select count(*) from public.learning_progress p join public.talktag_cards c on c.card_id=p.lesson_id and c.published where p.user_id=u.id),
 'started_count',(select count(*) from (select h.lesson_id from public.member_learning_history h where h.user_id=u.id union select s.lesson_id from public.member_learning_state s where s.user_id=u.id and s.value is not null union select p.lesson_id from public.learning_progress p where p.user_id=u.id) a join public.talktag_cards c on c.card_id=a.lesson_id and c.published),
 'last_learning_at',(select max(t) from (select max(last_opened_at) t from public.member_learning_history where user_id=u.id union all select max(updated_at) from public.member_learning_state where user_id=u.id union all select max(completed_at) from public.learning_progress where user_id=u.id) a),
 'visits',(select count(*) from public.member_visit_windows v where v.user_id=u.id),
 'visits_30d',(select count(*) from public.member_visit_windows v where v.user_id=u.id and v.last_seen_at>=now()-interval '30 days'),
 'active_days_30d',(select count(distinct (v.last_seen_at at time zone 'Asia/Seoul')::date) from public.member_visit_windows v where v.user_id=u.id and v.last_seen_at>=now()-interval '30 days'),
 'tracking_since',(select min(window_start) from public.member_visit_windows),
 'last_visit_at',(select max(last_seen_at) from public.member_visit_windows v where v.user_id=u.id)
 ) item from auth.users u join public.memberships m on m.user_id=u.id order by u.created_at desc limit p_limit) x;
 return result;
end;$$;

create or replace function public.talktag_admin_member_learning(p_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare result jsonb;
begin
 if not public.talktag_device_session_allowed() or not exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then
 raise exception 'Administrator access required' using errcode='42501';end if;
 with started as (
 select lesson_id from public.member_learning_history where user_id=p_user_id
 union select lesson_id from public.member_learning_state where user_id=p_user_id and value is not null
 union select lesson_id from public.learning_progress where user_id=p_user_id
 ), groups as (
 select c.language,c.area,count(*) total,
 count(s.lesson_id) started,count(p.lesson_id) completed
 from public.talktag_cards c left join started s on s.lesson_id=c.card_id
 left join public.learning_progress p on p.lesson_id=c.card_id and p.user_id=p_user_id
 where c.published group by c.language,c.area
 ) select jsonb_build_object('groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.language,g.area) from groups g),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.last_opened_at desc) from (
 select h.lesson_id,h.title,h.last_opened_at,c.language,c.area,c.level,c.ordinal,p.completed_at
 from public.member_learning_history h join public.talktag_cards c on c.card_id=h.lesson_id and c.published
 left join public.learning_progress p on p.lesson_id=h.lesson_id and p.user_id=p_user_id
 where h.user_id=p_user_id order by h.last_opened_at desc limit 10) r),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.talktag_admin_member_insights(integer),public.talktag_admin_member_learning(uuid) from public,anon,authenticated;
grant execute on function public.talktag_admin_member_insights(integer),public.talktag_admin_member_learning(uuid) to authenticated;
commit;
