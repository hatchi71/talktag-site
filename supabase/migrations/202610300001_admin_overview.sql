-- Read-only operations summary for the temporary administrator console.
-- No browser client can query the underlying member tables directly.
create or replace function public.talktag_admin_overview()
returns jsonb language plpgsql security definer stable
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.staff_roles
    where user_id = v_user_id and role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'activeTrials', (select count(*) from public.memberships
      where status = 'trial' and active_from <= now() and active_until > now()),
    'activePaid', (select count(*) from public.memberships
      where status in ('active', 'canceled') and active_from <= now() and active_until > now()),
    'snowpals', (select count(*) from public.staff_roles where role = 'snowpal'),
    'catalogCards', (select count(*) from public.talktag_cards),
    'previewReadyCards', (select count(*) from public.talktag_cards where published)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.talktag_admin_overview() from public, anon, authenticated;
grant execute on function public.talktag_admin_overview() to authenticated;
