-- Admin-only trial management for the temporary operations console.
-- Apply after the identity foundation and Snowpal role migration.
create table if not exists public.talktag_admin_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists talktag_admin_audit_created_idx
  on public.talktag_admin_audit (created_at desc);
alter table public.talktag_admin_audit enable row level security;
revoke all on public.talktag_admin_audit from public, anon, authenticated;

create or replace function public.talktag_admin_members(p_limit integer default 50)
returns table (
  user_id uuid, email text, membership_status text,
  active_from timestamptz, active_until timestamptz, trial_months integer
) language plpgsql security definer stable set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page size' using errcode = '22023';
  end if;
  return query
    select u.id, u.email::text, m.status, m.active_from, m.active_until, m.trial_months
    from auth.users u join public.memberships m on m.user_id = u.id
    order by u.created_at desc limit p_limit;
end;
$$;

create or replace function public.talktag_admin_grant_trial(
  p_target_user_id uuid, p_months integer
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_start timestamptz := now();
  v_until timestamptz;
  v_previous text;
begin
  if v_actor is null or not exists (
    select 1 from public.staff_roles
    where user_id = v_actor and role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_target_user_id is null or p_months is null or p_months not between 1 and 12 then
    raise exception 'Invalid trial grant' using errcode = '22023';
  end if;
  if p_target_user_id = v_actor or exists (
    select 1 from public.staff_roles where user_id = p_target_user_id and role = 'admin'
  ) then
    raise exception 'Cannot grant a trial to an administrator' using errcode = '22023';
  end if;
  select status into v_previous from public.memberships
    where user_id = p_target_user_id for update;
  if not found then
    raise exception 'Member not found' using errcode = '22023';
  end if;
  if v_previous in ('active', 'canceled') then
    raise exception 'Paid membership cannot be replaced by a trial' using errcode = '22023';
  end if;
  v_until := v_start + make_interval(months => p_months);
  update public.memberships
    set status = 'trial', active_from = v_start, active_until = v_until,
        trial_months = p_months, payment_provider = null,
        provider_customer_id = null, updated_at = now()
    where user_id = p_target_user_id;
  insert into public.talktag_admin_audit
    (actor_user_id, target_user_id, action, details)
    values (v_actor, p_target_user_id, 'grant_trial',
      jsonb_build_object('months', p_months, 'previousStatus', v_previous,
        'activeFrom', v_start, 'activeUntil', v_until));
  return jsonb_build_object('userId', p_target_user_id, 'activeUntil', v_until);
end;
$$;

revoke all on function public.talktag_admin_members(integer) from public, anon, authenticated;
grant execute on function public.talktag_admin_members(integer) to authenticated;
revoke all on function public.talktag_admin_grant_trial(uuid, integer) from public, anon, authenticated;
grant execute on function public.talktag_admin_grant_trial(uuid, integer) to authenticated;
