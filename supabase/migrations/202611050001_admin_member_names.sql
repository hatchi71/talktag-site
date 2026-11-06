-- Names are descriptive only. Roles and entitlements never trust user metadata.
create or replace function public.talktag_admin_member_names(p_limit integer default 50)
returns table(user_id uuid, display_name text)
language plpgsql security definer stable set search_path = '' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.staff_roles where staff_roles.user_id=(select auth.uid()) and role='admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Invalid page size' using errcode='22023';end if;
 return query select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),'')),40)
 from auth.users u join public.memberships m on m.user_id=u.id order by u.created_at desc limit p_limit;
end;$$;
revoke all on function public.talktag_admin_member_names(integer) from public,anon,authenticated;
grant execute on function public.talktag_admin_member_names(integer) to authenticated;
