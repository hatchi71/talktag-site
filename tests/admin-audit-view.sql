begin;
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

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_row record;
begin
  insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
  select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    'qa-' || id || '@talktag.invalid','',now(),now(),now()
  from unnest(array[v_admin,v_member]) as id;
  insert into public.staff_roles (user_id,role) values (v_admin,'admin');
  insert into public.talktag_admin_audit (actor_user_id,target_user_id,action,details)
    values (v_admin,v_member,'qa_audit_read','{}'::jsonb);
  perform set_config('request.jwt.claim.sub',v_member::text,true);
  begin
    perform public.talktag_admin_recent_audit(30);
    raise exception 'Non-admin read audit history';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  select * into v_row from public.talktag_admin_recent_audit(30)
    where action = 'qa_audit_read' and target_user_id = v_member;
  if not found then raise exception 'Admin could not read audit history'; end if;
  begin
    perform public.talktag_admin_recent_audit(101);
    raise exception 'Oversized audit page was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
rollback;
