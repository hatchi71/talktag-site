-- A trusted operator can grant a dated, non-paying trial for N calendar months.
-- The browser keeps read-only access to this table. The trusted grant workflow
-- records trial_months, active_from and active_until together.
alter table public.memberships
  add column if not exists trial_months integer
    check (trial_months is null or trial_months > 0);

alter table public.memberships
  drop constraint if exists memberships_status_check;
alter table public.memberships
  add constraint memberships_status_check
    check (status in ('inactive', 'trial', 'active', 'past_due', 'canceled'));

alter table public.memberships
  add constraint memberships_trial_period_check
    check (status <> 'trial' or
      (trial_months is not null and active_from is not null and active_until is not null));
