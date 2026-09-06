-- Flick MVP schema
-- Run this in the Supabase SQL editor, or via `supabase db push` /
-- `supabase migration up` if using the Supabase CLI.

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists postgis;

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  location geography(point, 4326),
  visible_on_radar boolean not null default false,
  location_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint instagram_username_format check (
    instagram_username is null or instagram_username ~ '^[a-zA-Z0-9._]{1,30}$'
  ),
  constraint instagram_url_format check (
    instagram_url is null or instagram_url ~ '^https?://(www\.)?instagram\.com/[a-zA-Z0-9._]{1,30}/?(\?.*)?$'
  )
);

-- Spatial index for fast ST_DWithin / nearest-neighbour queries.
create index if not exists profiles_location_gix on public.profiles using gist (location);

-- Speeds up filtering visible + fresh users before the distance check.
create index if not exists profiles_visible_idx on public.profiles (visible_on_radar, location_updated_at);

-- ============================================================================
-- 3. updated_at TRIGGER
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;

-- Users may read ONLY their own full profile row directly.
-- Nearby-user discovery goes through the get_nearby_users() RPC instead,
-- which returns a minimal, coordinate-free projection.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = id);

-- No "select all" / "select nearby" policy is created on purpose.
-- Nearby discovery is handled exclusively by the SECURITY DEFINER RPC below,
-- so exact locations are never exposed via PostgREST directly.

-- ============================================================================
-- 5. RPC: update_my_location(lat, lng)
-- ============================================================================
-- Lets an authenticated user push their own current location. Runs with
-- the caller's own privileges (no SECURITY DEFINER needed) since RLS
-- already restricts writes to the user's own row.
create or replace function public.update_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if lat is null or lng is null or lat < -90 or lat > 90 or lng < -180 or lng > 180 then
    raise exception 'Invalid coordinates';
  end if;

  update public.profiles
  set
    location = geography(st_setsrid(st_makepoint(lng, lat), 4326)),
    location_updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found. Create a profile before updating location.';
  end if;
end;
$$;

grant execute on function public.update_my_location(double precision, double precision) to authenticated;

-- ============================================================================
-- 6. RPC: get_nearby_users(lat, lng, radius_meters)
-- ============================================================================
-- SECURITY DEFINER so it can read other users' `location` column (which is
-- otherwise locked down by RLS to "select own row only"), while returning
-- ONLY the minimal, coordinate-free fields Radar needs. search_path is
-- pinned to prevent function hijacking.
create or replace function public.get_nearby_users(
  lat double precision,
  lng double precision,
  radius_meters integer default 1000,
  freshness_minutes integer default 15
)
returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
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
  order by distance_meters asc
  limit 50;
end;
$$;

grant execute on function public.get_nearby_users(double precision, double precision, integer, integer) to authenticated;

-- ============================================================================
-- 7. RPC: delete_my_account()
-- ============================================================================
-- Deletes the caller's profile row and, where permitted, their auth user.
-- Deleting from auth.users requires elevated privileges, so this function
-- is SECURITY DEFINER but strictly scoped to auth.uid() — a user can only
-- ever delete their own account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.profiles where id = uid;

  -- Requires the function owner to have privileges on auth.users
  -- (true for the default `postgres` role that owns this function
  -- when created via the Supabase SQL editor / migrations).
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- ============================================================================
-- 8. STORAGE: avatars bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can only manage files inside a folder named after their own uid,
-- e.g. avatars/<user_id>/avatar.jpg — preventing overwrite of others' files.
drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_own_write" on storage.objects;
create policy "avatar_own_write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_own_update" on storage.objects;
create policy "avatar_own_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_own_delete" on storage.objects;
create policy "avatar_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

