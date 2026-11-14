-- Keep member-owned learning records visible after old PPP001 card content is
-- removed. This stores only catalog metadata, never scripts, images, or media.
-- Apply before the separately gated post-live old-card cleanup.
begin;

create table if not exists public.talktag_retired_card_metadata (
  card_id text primary key check (length(card_id) between 1 and 160),
  language text not null check (language in ('en', 'ko', 'ja')),
  area text not null check (area in (
    'guided-listen-repeat', 'mini-talks', 'vocal-camp',
    'story-camp', 'readable', 'test-content'
  )),
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ordinal integer not null check (ordinal > 0),
  title text not null default '',
  release text not null,
  retired_at timestamptz not null default now()
);
alter table public.talktag_retired_card_metadata enable row level security;
revoke all on public.talktag_retired_card_metadata from public, anon, authenticated;

create or replace function public.talktag_admin_member_insights(p_limit integer default 100)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare result jsonb;
begin
 if not public.talktag_device_session_allowed() or not exists(
   select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then
   raise exception 'Administrator access required' using errcode='42501';
 end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid page size'; end if;
 select coalesce(jsonb_agg(x.item order by x.registered_at desc),'[]'::jsonb) into result from (
 select u.created_at registered_at,jsonb_build_object(
 'user_id',u.id,'registered_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
 'email_confirmed',u.email_confirmed_at is not null,
 'is_admin',exists(select 1 from public.staff_roles r where r.user_id=u.id and r.role='admin'),
 'identities',coalesce((select jsonb_agg(jsonb_build_object('provider',i.provider,'provider_id',i.provider_id,'email',i.identity_data->>'email')) from auth.identities i where i.user_id=u.id),'[]'::jsonb),
 'completed_count',(select count(*) from public.learning_progress p join (
   select card_id from public.talktag_cards where published
   union select card_id from public.talktag_retired_card_metadata
 ) c on c.card_id=p.lesson_id where p.user_id=u.id),
 'started_count',(select count(*) from (
   select h.lesson_id from public.member_learning_history h where h.user_id=u.id
   union select s.lesson_id from public.member_learning_state s where s.user_id=u.id and s.value is not null
   union select p.lesson_id from public.learning_progress p where p.user_id=u.id
 ) a join (
   select card_id from public.talktag_cards where published
   union select card_id from public.talktag_retired_card_metadata
 ) c on c.card_id=a.lesson_id),
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
 if not public.talktag_device_session_allowed() or not exists(
   select 1 from public.staff_roles where user_id=auth.uid() and role='admin') then
   raise exception 'Administrator access required' using errcode='42501';
 end if;
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
 ), historical as (
   select t.language,t.area,count(*) total,count(s.lesson_id) started,count(p.lesson_id) completed
   from public.talktag_retired_card_metadata t
   join started s on s.lesson_id=t.card_id
   left join public.learning_progress p on p.lesson_id=t.card_id and p.user_id=p_user_id
   group by t.language,t.area
 ) select jsonb_build_object(
   'groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.language,g.area) from groups g),'[]'::jsonb),
   'historical',coalesce((select jsonb_agg(to_jsonb(h) order by h.language,h.area) from historical h),'[]'::jsonb),
   'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.last_opened_at desc) from (
     select h.lesson_id,coalesce(nullif(h.title,''),t.title,'') title,h.last_opened_at,
       coalesce(c.language,t.language) language,coalesce(c.area,t.area) area,
       coalesce(c.level,t.level) level,coalesce(c.ordinal,t.ordinal) ordinal,
       p.completed_at,(t.card_id is not null and c.card_id is null) retired
     from public.member_learning_history h
     left join public.talktag_cards c on c.card_id=h.lesson_id and c.published
     left join public.talktag_retired_card_metadata t on t.card_id=h.lesson_id
     left join public.learning_progress p on p.lesson_id=h.lesson_id and p.user_id=p_user_id
     where h.user_id=p_user_id and (c.card_id is not null or t.card_id is not null)
     order by h.last_opened_at desc limit 10
   ) r),'[]'::jsonb)) into result;
 return result;
end;$$;

revoke all on function public.talktag_admin_member_insights(integer),
  public.talktag_admin_member_learning(uuid) from public, anon, authenticated;
grant execute on function public.talktag_admin_member_insights(integer),
  public.talktag_admin_member_learning(uuid) to authenticated;
commit;
