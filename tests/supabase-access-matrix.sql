-- Reversible production-policy check. Paste the entire file into the SQL editor.
-- It creates synthetic users and cards only inside this transaction, then rolls
-- everything back. A raised exception means the server policy failed.
begin;

do $$
declare
  v_users uuid[] := array[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid()
  ];
  v_tier text;
  v_user uuid;
  v_area text;
  v_tier_idx integer;
  v_card_ordinal integer;
  v_card text;
  v_expected boolean;
  v_actual boolean;
begin
  for v_area in select unnest(array[
    'guided-listen-repeat', 'mini-talks', 'vocal-camp',
    'story-camp', 'readable', 'test-content'
  ]) loop
    foreach v_card_ordinal in array array[1, 10, 11] loop
      v_card := 'qa-access-' || replace(v_area, '-', '') || '-' || v_card_ordinal;
      insert into public.talktag_cards
        (card_id, language, area, level, ordinal, published)
      values (v_card, 'en', v_area, 'A1', v_card_ordinal, true);
      insert into public.talktag_card_content (card_id, payload)
      values (v_card, jsonb_build_object('id', v_card, 'title', 'QA only'));
      insert into public.talktag_card_media
        (card_id, variant, r2_key, mime_type, byte_length, sha256)
      values (v_card, 'main', 'qa-only/' || v_card || '.mp3',
        'audio/mpeg', 3, repeat('a', 64));
    end loop;
  end loop;
  insert into public.talktag_cards
    (card_id, language, area, level, ordinal, published)
  values ('qa-unpublished-control', 'en', 'guided-listen-repeat', 'A1', 999, false);
  insert into public.talktag_card_content (card_id, payload)
  values ('qa-unpublished-control', '{"title":"Unpublished QA control"}'::jsonb);

  -- A signed-out visitor must not open even card 001.
  perform set_config('request.jwt.claim.sub', '', true);
  if public.can_access_talktag_card('qa-access-minitalks-1') then
    raise exception 'Visitor was granted a card';
  end if;
  if public.resolve_talktag_card_content('qa-access-minitalks-1') is not null or
    exists (select 1 from public.resolve_talktag_card_media('qa-access-minitalks-1')) or
    exists (select 1 from public.list_talktag_cards('en', 'mini-talks', 'A1')) then
    raise exception 'Visitor received protected content, media, or catalog rows';
  end if;

  for v_tier_idx in 1..5 loop
    v_user := v_users[v_tier_idx];
    insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, created_at, updated_at)
    values
      (v_user, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated',
       'qa-' || v_user || '@talktag.invalid', '', now(), now(), now());
  end loop;

  update public.memberships set status = 'trial', trial_months = 2,
    active_from = now() - interval '1 day',
    active_until = now() + interval '2 months'
  where user_id = v_users[2];
  update public.memberships set status = 'active',
    active_from = now() - interval '1 day',
    active_until = now() + interval '1 month'
  where user_id = v_users[3];
  insert into public.staff_roles (user_id, role)
  values (v_users[4], 'snowpal'), (v_users[5], 'admin');

  for v_tier_idx in 1..5 loop
    v_user := v_users[v_tier_idx];
    v_tier := (array['free', 'trial', 'paid', 'snowpal', 'admin'])[v_tier_idx];
    perform set_config('request.jwt.claim.sub', v_user::text, true);
    -- Exercise the actual preview release, not only synthetic policy rows.
    for v_card in select unnest(array[
      'guided-a0-001', 'mt-en-a1-001', 'en-readable-001-a1',
      'en-story-camp-001-a1', 'en-vocal-camp-001-a1',
      'ko-guided-a1-001', 'mt-ko-a1-001', 'ko-readable-a1-001',
      'ko-story-camp-001-a1', 'ko-vocal-camp-001-a1',
      'ja-guided-a1-001', 'ja-story-camp-001-a1',
      'ja-vocal-camp-001-a1'
    ]) loop
      if not public.can_access_talktag_card(v_card) or
         public.resolve_talktag_card_content(v_card) is null then
        raise exception 'Published preview card unavailable: tier %, card %',
          v_tier, v_card;
      end if;
    end loop;
    if not exists (select 1 from public.talktag_cards c
                   where c.card_id = 'qa-unpublished-control' and not c.published) then
      raise exception 'Unpublished control card is missing';
    end if;
    if public.can_access_talktag_card('qa-unpublished-control') or
       public.resolve_talktag_card_content('qa-unpublished-control') is not null then
      raise exception 'Unpublished card leaked to tier %', v_tier;
    end if;
    -- The free account sees every first-ten episode part in every area;
    -- full-access tiers must resolve every migrated published record.
    for v_card in select c.card_id from public.talktag_cards c
                  where c.published and c.card_id not like 'qa-access-%'
    loop
      select (v_tier <> 'free' or (c.area <> 'test-content' and c.ordinal <= 10))
        into v_expected from public.talktag_cards c where c.card_id = v_card;
      if public.can_access_talktag_card(v_card) is distinct from v_expected or
         (public.resolve_talktag_card_content(v_card) is not null)
           is distinct from v_expected then
        raise exception 'Migrated card access mismatch: tier %, card %', v_tier, v_card;
      end if;
    end loop;
    for v_area in select unnest(array[
      'guided-listen-repeat', 'mini-talks', 'vocal-camp',
      'story-camp', 'readable', 'test-content'
    ]) loop
      foreach v_card_ordinal in array array[1, 10, 11] loop
        v_card := 'qa-access-' || replace(v_area, '-', '') || '-' || v_card_ordinal;
        v_expected := v_tier <> 'free' or
          (v_area <> 'test-content' and v_card_ordinal <= 10);
        v_actual := public.can_access_talktag_card(v_card);
        if v_actual is distinct from v_expected then
          raise exception 'Wrong access: tier %, area %, ordinal %, got %',
            v_tier, v_area, v_card_ordinal, v_actual;
        end if;
        if (public.resolve_talktag_card_content(v_card) is not null)
            is distinct from v_expected or
           exists (select 1 from public.resolve_talktag_card_media(v_card))
            is distinct from v_expected or
           exists (select 1 from public.list_talktag_cards('en', v_area, 'A1')
                   where card_id = v_card) is distinct from v_expected then
          raise exception 'Resolver/catalog mismatch: tier %, area %, ordinal %',
            v_tier, v_area, v_card_ordinal;
        end if;
      end loop;
    end loop;
  end loop;

  -- A trial ends exactly at active_until; a canceled paid period retains
  -- access only until its paid-through end date.
  update public.memberships set active_until = now() - interval '1 second'
  where user_id = v_users[2];
  perform set_config('request.jwt.claim.sub', v_users[2]::text, true);
  if public.can_access_talktag_card('qa-access-minitalks-11') then
    raise exception 'Expired trial was granted card 011';
  end if;
  update public.memberships set status = 'canceled'
  where user_id = v_users[3];
  perform set_config('request.jwt.claim.sub', v_users[3]::text, true);
  if not public.can_access_talktag_card('qa-access-minitalks-11') then
    raise exception 'Paid-through canceled member lost access early';
  end if;
end;
$$;

rollback;
