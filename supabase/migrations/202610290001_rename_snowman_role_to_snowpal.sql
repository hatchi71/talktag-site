-- Normalize the former internal Snowman role to the current product role name.
-- User clients remain read-only; only a trusted database migration changes roles.

begin;

alter table public.staff_roles
  drop constraint if exists staff_roles_role_check;

delete from public.staff_roles old_role
where old_role.role = 'snowman'
  and exists (
    select 1 from public.staff_roles existing_role
    where existing_role.user_id = old_role.user_id
      and existing_role.role = 'snowpal'
  );

update public.staff_roles
set role = 'snowpal'
where role = 'snowman';

alter table public.staff_roles
  add constraint staff_roles_role_check
    check (role in ('snowpal', 'admin'));

commit;
