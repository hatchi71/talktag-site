-- Server-side card registry for the temporary TalkTag migration.
-- Populate only after reconciling each published card and private R2 object.
-- These tables do not grant access to existing public audio URLs.

create table if not exists public.talktag_cards (
  card_id text primary key check (length(card_id) between 1 and 160),
  language text not null check (language in ('en', 'ko', 'ja')),
  area text not null check (area in (
    'guided-listen-repeat', 'mini-talks', 'vocal-camp',
    'story-camp', 'readable', 'test-content'
  )),
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ordinal integer not null check (ordinal > 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language, area, level, ordinal, card_id)
);

create table if not exists public.talktag_card_media (
  card_id text not null references public.talktag_cards(card_id) on delete cascade,
  variant text not null default 'main' check (variant ~ '^[a-z0-9_-]{1,64}$'),
  r2_key text not null unique check (
    length(r2_key) between 1 and 1024
    and left(r2_key, 1) <> '/'
    and position('..' in r2_key) = 0
    and r2_key !~ '[[:cntrl:]]'
  ),
  mime_type text not null default 'audio/mpeg'
    check (mime_type in ('audio/mpeg', 'application/json')),
  byte_length bigint not null check (byte_length > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  primary key (card_id, variant)
);

create table if not exists public.talktag_card_content (
  card_id text primary key references public.talktag_cards(card_id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

create index if not exists talktag_cards_catalog_idx
  on public.talktag_cards(language, area, level, ordinal)
  where published;

alter table public.talktag_cards enable row level security;
alter table public.talktag_card_media enable row level security;
alter table public.talktag_card_content enable row level security;
revoke all on public.talktag_cards, public.talktag_card_media,
  public.talktag_card_content
  from public, anon, authenticated;

-- Central authorization predicate. Only trusted resolver functions can execute it.
create or replace function public.can_access_talktag_card(p_card_id text)
returns boolean language plpgsql security definer stable
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.talktag_cards%rowtype;
  v_full_access boolean := false;
begin
  if v_user_id is null then return false; end if;

  select * into v_card from public.talktag_cards
  where card_id = p_card_id and published = true;
  if not found then return false; end if;

  select exists (
    select 1 from public.staff_roles sr
    where sr.user_id = v_user_id and sr.role in ('snowpal', 'snowman', 'admin')
  ) or exists (
    select 1 from public.memberships m
    where m.user_id = v_user_id
      and m.active_from is not null and m.active_until is not null
      and m.active_from <= now() and m.active_until > now()
      and m.status in ('trial', 'active', 'canceled')
      and (m.status <> 'trial' or m.trial_months is not null)
  ) into v_full_access;

  if not v_full_access and (
    v_card.area = 'test-content' or v_card.ordinal > 10
  ) then return false; end if;

  return true;
end;
$$;

revoke all on function public.can_access_talktag_card(text)
  from public, anon, authenticated;

-- Return a private media key only after checking the current card entitlement.
-- Possessing a key alone never grants a download from the private bucket.
create or replace function public.resolve_talktag_card_media(
  p_card_id text, p_variant text default 'main'
)
returns table (r2_key text, mime_type text, byte_length bigint, sha256 text)
language plpgsql security definer stable
set search_path = ''
as $$
begin
  if not public.can_access_talktag_card(p_card_id) then return; end if;

  return query select cm.r2_key, cm.mime_type, cm.byte_length, cm.sha256
  from public.talktag_card_media cm
  where cm.card_id = p_card_id and cm.variant = p_variant;
end;
$$;

revoke all on function public.resolve_talktag_card_media(text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_talktag_card_media(text, text)
  to authenticated;

-- Lesson text, synchronized scripts and translations must move out of public
-- JavaScript/JSON bundles before this resolver becomes the learner data source.
create or replace function public.resolve_talktag_card_content(p_card_id text)
returns jsonb language plpgsql security definer stable
set search_path = ''
as $$
declare v_payload jsonb;
begin
  if not public.can_access_talktag_card(p_card_id) then return null; end if;
  select cc.payload into v_payload from public.talktag_card_content cc
  where cc.card_id = p_card_id;
  return v_payload;
end;
$$;

revoke all on function public.resolve_talktag_card_content(text)
  from public, anon, authenticated;
grant execute on function public.resolve_talktag_card_content(text)
  to authenticated;
