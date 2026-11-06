-- Admin-only Snowpal assignment. This deliberately cannot grant Admin.
create or replace function public.talktag_admin_snowpals()
returns table (user_id uuid)
language plpgsql security definer stable set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select r.user_id from public.staff_roles r where r.role = 'snowpal';
end;
$$;

create or replace function public.talktag_admin_set_snowpal(
  p_target_user_id uuid, p_enabled boolean
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_changed integer := 0;
begin
  if v_actor is null or not exists (
    select 1 from public.staff_roles r
    where r.user_id = v_actor and r.role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_target_user_id is null or p_enabled is null or p_target_user_id = v_actor or
     not exists (select 1 from auth.users u where u.id = p_target_user_id) or
     exists (select 1 from public.staff_roles r
             where r.user_id = p_target_user_id and r.role = 'admin') then
    raise exception 'Invalid Snowpal assignment' using errcode = '22023';
  end if;
  if p_enabled then
    insert into public.staff_roles (user_id, role)
      values (p_target_user_id, 'snowpal') on conflict do nothing;
  else
    delete from public.staff_roles r
      where r.user_id = p_target_user_id and r.role = 'snowpal';
  end if;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into public.talktag_admin_audit
      (actor_user_id, target_user_id, action, details)
    values (v_actor, p_target_user_id,
      case when p_enabled then 'grant_snowpal' else 'revoke_snowpal' end,
      jsonb_build_object('enabled', p_enabled));
  end if;
  return jsonb_build_object('userId', p_target_user_id,
    'enabled', p_enabled, 'changed', v_changed > 0);
end;
$$;

revoke all on function public.talktag_admin_snowpals()
  from public, anon, authenticated;
grant execute on function public.talktag_admin_snowpals() to authenticated;
revoke all on function public.talktag_admin_set_snowpal(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.talktag_admin_set_snowpal(uuid, boolean)
  to authenticated;
