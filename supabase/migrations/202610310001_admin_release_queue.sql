-- Read-only release queue. Publishing is deliberately separate from this view.
create or replace function public.talktag_admin_release_queue(p_limit integer default 50)
returns table (
  card_id text, language text, area text, level text, ordinal integer,
  published boolean, media_count bigint, has_content boolean
) language plpgsql security definer stable set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page size' using errcode = '22023';
  end if;
  return query
    select c.card_id, c.language, c.area, c.level, c.ordinal, c.published,
      (select count(*) from public.talktag_card_media m where m.card_id = c.card_id),
      exists (select 1 from public.talktag_card_content d where d.card_id = c.card_id)
    from public.talktag_cards c
    order by c.published, c.language, c.area, c.level, c.ordinal
    limit p_limit;
end;
$$;

revoke all on function public.talktag_admin_release_queue(integer) from public, anon, authenticated;
grant execute on function public.talktag_admin_release_queue(integer) to authenticated;
