-- Append this to the Snowpal migration inside BEGIN/ROLLBACK in the SQL editor.
-- The synthetic users, role changes, and audit rows are discarded at ROLLBACK.
do $$
declare
  v_admin uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_other_admin uuid := gen_random_uuid();
  v_result jsonb;
  v_audits integer;
begin
  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at)
  select id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'qa-' || id || '@talktag.invalid',
    '', now(), now(), now()
  from unnest(array[v_admin, v_member, v_other_admin]) as id;
  insert into public.staff_roles (user_id, role)
  values (v_admin, 'admin'), (v_other_admin, 'admin');

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.talktag_admin_set_snowpal(v_member, true);
    raise exception 'Member changed a Snowpal role';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  begin
    perform public.talktag_admin_set_snowpal(v_admin, true);
    raise exception 'Admin assigned Snowpal to self';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.talktag_admin_set_snowpal(v_other_admin, true);
    raise exception 'Admin altered another admin';
  exception when invalid_parameter_value then null;
  end;

  v_result := public.talktag_admin_set_snowpal(v_member, true);
  if v_result ->> 'changed' <> 'true' or not exists (
    select 1 from public.staff_roles
    where user_id = v_member and role = 'snowpal'
  ) then
    raise exception 'Snowpal grant failed';
  end if;
  v_result := public.talktag_admin_set_snowpal(v_member, true);
  if v_result ->> 'changed' <> 'false' then
    raise exception 'Duplicate grant changed state';
  end if;
  v_result := public.talktag_admin_set_snowpal(v_member, false);
  if v_result ->> 'changed' <> 'true' or exists (
    select 1 from public.staff_roles
    where user_id = v_member and role = 'snowpal'
  ) then
    raise exception 'Snowpal revoke failed';
  end if;
  select count(*) into v_audits from public.talktag_admin_audit
    where actor_user_id = v_admin and target_user_id = v_member
      and action in ('grant_snowpal', 'revoke_snowpal');
  if v_audits <> 2 then
    raise exception 'Expected two Snowpal audit records, got %', v_audits;
  end if;
end;
$$;
