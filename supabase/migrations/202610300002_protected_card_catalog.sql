-- Catalog metadata for the temporary protected site. No lesson text or R2 key
-- is returned. The same server predicate used for playback filters each row.
create or replace function public.list_talktag_cards(
  p_language text, p_area text, p_level text default null
)
returns table (
  card_id text, language text, area text, level text,
  ordinal integer, title text
)
language plpgsql security definer stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then return; end if;
  if p_language not in ('en', 'ko', 'ja') or
     p_area not in ('guided-listen-repeat', 'mini-talks', 'vocal-camp',
                    'story-camp', 'readable', 'test-content') or
     (p_level is not null and p_level not in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
  then return; end if;

  return query
  select c.card_id, c.language, c.area, c.level, c.ordinal,
         coalesce(cc.payload ->> 'title', '') as title
  from public.talktag_cards c
  join public.talktag_card_content cc on cc.card_id = c.card_id
  where c.published = true
    and c.language = p_language and c.area = p_area
    and (p_level is null or c.level = p_level)
    and public.can_access_talktag_card(c.card_id)
  order by array_position(array['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'], c.level),
           c.ordinal, c.card_id;
end;
$$;

revoke all on function public.list_talktag_cards(text, text, text)
  from public, anon, authenticated;
grant execute on function public.list_talktag_cards(text, text, text)
  to authenticated;
