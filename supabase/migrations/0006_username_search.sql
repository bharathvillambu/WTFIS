-- =============================================================================
-- Flick — Username search
-- Adds `search_users_by_username(q text, limit_count int)` which returns
-- profiles whose instagram_username matches the given query (case-insensitive
-- prefix / substring). Excludes the caller. Run AFTER 0005.
-- =============================================================================

-- Fast case-insensitive prefix lookup on instagram_username.
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(instagram_username));

create or replace function public.search_users_by_username(
  q text,
  limit_count integer default 30
) returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  gender text,
  age integer,
  city text,
  is_online boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  needle text;
begin
  if q is null or length(trim(q)) = 0 then
    return; -- empty query → no rows
  end if;
  needle := lower(trim(q));

  return query
  select
    p.id, p.instagram_username, p.instagram_url, p.avatar_url, p.gender,
    case when p.birth_date is null then null
         else (
           date_part('year', current_date) - date_part('year', p.birth_date)
           - case when (date_part('month', current_date), date_part('day', current_date))
                    < (date_part('month', p.birth_date), date_part('day', p.birth_date))
                  then 1 else 0 end
         )::integer end,
    p.city,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.profiles p
  where p.id <> coalesce(me, '00000000-0000-0000-0000-000000000000'::uuid)
    and p.instagram_url is not null
    and p.instagram_username is not null
    -- Prefer prefix matches; also allow substring matches so `bharath` finds `@my_bharath`.
    and (lower(p.instagram_username) like needle || '%'
      or lower(p.instagram_username) like '%' || needle || '%')
  -- Prefix matches first, then alphabetical.
  order by
    case when lower(p.instagram_username) like needle || '%' then 0 else 1 end,
    p.instagram_username asc
  limit greatest(1, least(coalesce(limit_count, 30), 100));
end;
$$;
grant execute on function public.search_users_by_username(text, integer) to authenticated;

