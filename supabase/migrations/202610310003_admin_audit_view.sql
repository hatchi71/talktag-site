-- Read-only audit history for the local tt-backstage console.
-- Keep this function unavailable to non-admin identities.
create or replace function public.talktag_admin_recent_audit(p_limit integer default 30)
returns table (
  id bigint, actor_user_id uuid, target_user_id uuid,
  action text, details jsonb, created_at timestamptz
) language plpgsql security definer stable set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page size' using errcode = '22023';
  end if;
  return query
    select a.id, a.actor_user_id, a.target_user_id,
      a.action, a.details, a.created_at
    from public.talktag_admin_audit a
    order by a.created_at desc, a.id desc
    limit p_limit;
end;
$$;

revoke all on function public.talktag_admin_recent_audit(integer)
  from public, anon, authenticated;
grant execute on function public.talktag_admin_recent_audit(integer)
  to authenticated;
