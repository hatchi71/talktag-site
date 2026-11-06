-- TalkTag identity and access foundation. No payment or staff entitlement is
-- conferred by account creation. Apply before connecting the public site.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'past_due', 'canceled')),
  active_from timestamptz,
  active_until timestamptz,
  payment_provider text,
  provider_customer_id text,
  updated_at timestamptz not null default now(),
  check (active_until is null or active_from is null or active_until > active_from)
);

create table if not exists public.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('snowman', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (length(lesson_id) between 1 and 160),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists memberships_status_idx on public.memberships(status);
create index if not exists learning_progress_lesson_idx on public.learning_progress(lesson_id);

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.staff_roles enable row level security;
alter table public.learning_progress enable row level security;

revoke all on public.profiles, public.memberships,
  public.staff_roles, public.learning_progress from anon, authenticated;

grant select, insert, update (display_name) on public.profiles to authenticated;
grant select on public.memberships, public.staff_roles to authenticated;
grant select, insert, delete on public.learning_progress to authenticated;

create policy "Profiles are private" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users edit their own name" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their own membership" on public.memberships
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their own staff roles" on public.staff_roles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own progress" on public.learning_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users mark their own progress" on public.learning_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own completion" on public.learning_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Provision only an inactive membership when an account is created.
-- A trusted billing backend must change membership state; a trusted operator
-- must grant Snowman/admin roles. Browser clients have read-only access.
create or replace function public.handle_new_talktag_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.memberships (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_talktag_user() from public, anon, authenticated;
create trigger on_talktag_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_talktag_user();
