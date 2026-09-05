-- Insta Locator — Gender/Age fields + Radar filters + relaxed validation
-- Run this AFTER 0001_init.sql, in the Supabase SQL editor, or via
-- `supabase db push` / `supabase migration up` if using the Supabase CLI.

-- ============================================================================
-- 1. DROP the old strict Instagram username/URL format checks.
--    Product decision: username is now a free-form display handle, and the
--    "Open Instagram" button URL is a generic link fully controlled by the
--    user (no longer restricted to instagram.com).
-- ============================================================================
alter table public.profiles drop constraint if exists instagram_username_format;
alter table public.profiles drop constraint if exists instagram_url_format;

-- ============================================================================
-- 2. NEW COLUMNS: gender, birth_date
-- ============================================================================
alter table public.profiles
  add column if not exists gender text,
  add column if not exists birth_date date;

alter table public.profiles
  drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('Male', 'Female', 'Other'));

-- Simple sanity check: birth_date must be in the past and imply a
-- reasonable age (0-120). The 18+ minimum age is enforced in the app UI.
alter table public.profiles
  drop constraint if exists profiles_birth_date_check;
alter table public.profiles
  add constraint profiles_birth_date_check
  check (
    birth_date is null or (
      birth_date <= current_date
      and birth_date >= current_date - interval '120 years'
    )
  );

-- ============================================================================
-- 3. REPLACE get_nearby_users(...) to also return gender + a derived age,
--    and to accept optional gender / min_age / max_age filters.
--    IMPORTANT: only derived `age` is ever returned — never `birth_date`.
--
--    NOTE: the output column below is named `age`, which collides with
--    Postgres's built-in age(date, date) function if we tried to call it
--    inside this function body (PL/pgSQL resolves `age` to the OUT
--    parameter, not the function, and errors out). To avoid that entirely,
--    age is computed manually via date_part() instead of calling age().
-- ============================================================================
drop function if exists public.get_nearby_users(double precision, double precision, integer, integer);

create or replace function public.get_nearby_users(
  lat double precision,
  lng double precision,
  radius_meters integer default 1000,
  freshness_minutes integer default 15,
  gender_filter text default null,
  min_age integer default null,
  max_age integer default null
)
returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  gender text,
  age integer,
  distance_meters double precision
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

  -- Clamp radius server-side so the client can never request an
  -- unreasonably large search area (max 20km for this MVP).
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
            then 1
            else 0
          end
      )::integer
    end as age,
    st_distance(p.location, origin) as distance_meters
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
    and (
      min_age is null
      or p.birth_date is null
      or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case
            when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
            then 1
            else 0
          end
      ) >= min_age
    )
    and (
      max_age is null
      or p.birth_date is null
      or (
        date_part('year', current_date) - date_part('year', p.birth_date)
        - case
            when (date_part('month', current_date), date_part('day', current_date))
                 < (date_part('month', p.birth_date), date_part('day', p.birth_date))
            then 1
            else 0
          end
      ) <= max_age
    )
  order by distance_meters asc
  limit 50;
end;
$$;

grant execute on function public.get_nearby_users(
  double precision, double precision, integer, integer, text, integer, integer
) to authenticated;
