-- Run after the PPP 001 catalog-visibility migration. Synthetic rows are
-- created inside a transaction and rolled back. A raised exception is failure.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_archived text := 'qa-archived-001-' || replace(gen_random_uuid()::text, '-', '');
  v_current text := 'qa-current-001-' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at)
  values
    (v_user, '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated',
     'qa-' || v_user || '@talktag.invalid', '', now(), now(), now());

  insert into public.talktag_cards
    (card_id, language, area, level, ordinal, published, catalog_visible)
  values
    (v_archived, 'en', 'guided-listen-repeat', 'A1', 1, true, false),
    (v_current, 'en', 'guided-listen-repeat', 'A1', 1, true, true);
  insert into public.talktag_card_content (card_id, payload)
  values
    (v_archived, jsonb_build_object('id', v_archived, 'title', 'Archived QA 001')),
    (v_current, jsonb_build_object('id', v_current, 'title', 'Current QA 001'));
  insert into public.talktag_card_media
    (card_id, variant, r2_key, mime_type, byte_length, sha256)
  values
    (v_archived, 'main', 'qa-only/' || v_archived || '.mp3', 'audio/mpeg', 3, repeat('a', 64)),
    (v_current, 'main', 'qa-only/' || v_current || '.mp3', 'audio/mpeg', 3, repeat('b', 64));

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  if not public.can_access_talktag_card(v_archived) or
     public.resolve_talktag_card_content(v_archived) is null or
     not exists (select 1 from public.resolve_talktag_card_media(v_archived)) then
    raise exception 'Archived 001 lost protected access';
  end if;
  if exists (select 1 from public.list_talktag_cards('en', 'guided-listen-repeat', 'A1')
             where card_id = v_archived) or
     not exists (select 1 from public.list_talktag_cards('en', 'guided-listen-repeat', 'A1')
                 where card_id = v_current) then
    raise exception 'Catalog visibility failed';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  if public.resolve_talktag_card_content(v_archived) is not null or
     exists (select 1 from public.resolve_talktag_card_media(v_archived)) or
     exists (select 1 from public.list_talktag_cards('en', 'guided-listen-repeat', 'A1')
             where card_id in (v_archived, v_current)) then
    raise exception 'Visitor gained protected 001 access';
  end if;
end;
$$;

rollback;
