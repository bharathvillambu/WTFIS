-- =============================================================================
-- Flick — Online presence (green dot)
-- Adds profiles.last_seen_at + touch_presence() RPC, and republishes the
-- four "list" RPCs to include an `is_online` boolean derived from
-- last_seen_at > now() - 3 minutes. Run AFTER 0003.
-- =============================================================================

-- 1. Column + index -----------------------------------------------------------
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen_at desc);

-- 2. Heartbeat RPC ------------------------------------------------------------
-- The client calls this on app start, on focus and every ~60s while active.
create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  update public.profiles set last_seen_at = now() where id = me;
end;
$$;
grant execute on function public.touch_presence() to authenticated;

-- 3. get_nearby_users — add is_online ----------------------------------------
drop function if exists public.get_nearby_users(double precision, double precision, integer, integer, text, integer, integer, text);

create or replace function public.get_nearby_users(
  lat double precision,
  lng double precision,
  radius_meters integer default 1000,
  freshness_minutes integer default 15,
  gender_filter text default null,
  min_age integer default null,
  max_age integer default null,
  city_filter text default null
) returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  gender text,
  age integer,
  city text,
  distance_meters double precision,
  is_online boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  origin geography;
  safe_radius integer;
begin
  if lat is null or lng is null or lat < -90 or lat > 90 or lng < -180 or lng > 180 then
    raise exception 'Invalid coordinates';
  end if;
  safe_radius := greatest(100, least(coalesce(radius_meters, 1000), 20000));
  origin := geography(st_setsrid(st_makepoint(lng, lat), 4326));

  return query
  select
    p.id,
    p.instagram_username,
    p.instagram_url,
    p.avatar_url,
    p.gender,
    case
      when p.birth_date is null then null
      else (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case
            when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
            then 1 else 0
          end
      )::integer
    end as age,
    p.city,
    st_distance(p.location, origin) as distance_meters,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.profiles p
  where
    p.visible_on_radar = true
    and p.id <> auth.uid()
    and p.location is not null
    and p.instagram_url is not null
    and p.location_updated_at is not null
    and p.location_updated_at > now() - make_interval(mins => greatest(1, coalesce(freshness_minutes, 15)))
    and st_dwithin(p.location, origin, safe_radius)
    and (gender_filter is null or gender_filter = 'All' or p.gender = gender_filter)
    and (city_filter is null or lower(p.city) = lower(city_filter))
    and (
      min_age is null or p.birth_date is null or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
               then 1 else 0 end
      ) >= min_age
    )
    and (
      max_age is null or p.birth_date is null or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
               then 1 else 0 end
      ) <= max_age
    )
  order by distance_meters asc
  limit 50;
end;
$$;

grant execute on function public.get_nearby_users(
  double precision, double precision, integer, integer, text, integer, integer, text
) to authenticated;

-- 4. list_users_by_city — add is_online --------------------------------------
drop function if exists public.list_users_by_city(text, text, integer, integer, integer);

create or replace function public.list_users_by_city(
  city_filter text,
  gender_filter text default null,
  min_age integer default null,
  max_age integer default null,
  limit_count integer default 50
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
begin
  if city_filter is null or length(trim(city_filter)) = 0 then
    raise exception 'city_filter is required';
  end if;

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
  where p.id <> auth.uid()
    and p.instagram_url is not null
    and p.city is not null
    and lower(p.city) = lower(city_filter)
    and (gender_filter is null or gender_filter = 'All' or p.gender = gender_filter)
    and (min_age is null or p.birth_date is null or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
               then 1 else 0 end
    ) >= min_age)
    and (max_age is null or p.birth_date is null or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
               then 1 else 0 end
    ) <= max_age)
  order by p.updated_at desc
  limit greatest(1, least(coalesce(limit_count, 50), 200));
end;
$$;
grant execute on function public.list_users_by_city(text, text, integer, integer, integer) to authenticated;

-- 5. list_favorites — add is_online ------------------------------------------
drop function if exists public.list_favorites();

create or replace function public.list_favorites()
returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  gender text,
  age integer,
  city text,
  favorited_at timestamptz,
  is_online boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
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
    f.created_at,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.favorites f
  join public.profiles p on p.id = f.favorite_user_id
  where f.user_id = me
  order by f.created_at desc;
end;
$$;
grant execute on function public.list_favorites() to authenticated;

-- 6. list_conversations — add other_is_online --------------------------------
drop function if exists public.list_conversations();

create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_body text,
  last_at timestamptz,
  other_is_online boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;

  return query
  with pairs as (
    select
      case when sender_id = me then recipient_id else sender_id end as other_id,
      body, created_at,
      row_number() over (
        partition by case when sender_id = me then recipient_id else sender_id end
        order by created_at desc
      ) as rn
    from public.direct_messages
    where expires_at > now()
      and (sender_id = me or recipient_id = me)
  )
  select
    p.id,
    p.instagram_username,
    p.avatar_url,
    pr.body,
    pr.created_at,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as other_is_online
  from pairs pr
  join public.profiles p on p.id = pr.other_id
  where pr.rn = 1
  order by pr.created_at desc;
end;
$$;
grant execute on function public.list_conversations() to authenticated;

