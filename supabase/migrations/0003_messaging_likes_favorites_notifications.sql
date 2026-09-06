-- =============================================================================
-- Flick — Messaging, Likes, Favorites, City, and In-App Notifications
-- Run AFTER 0001_init.sql and 0002_gender_age_and_relaxed_validation.sql.
-- =============================================================================

-- Needed for gen_random_uuid() on Supabase.
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. profiles: add optional city column and helpful index for city filtering.
-- =============================================================================
alter table public.profiles add column if not exists city text;
create index if not exists profiles_city_idx on public.profiles (lower(city));

-- =============================================================================
-- 2. direct_messages — 5-minute TTL, only sender/recipient can see them.
-- =============================================================================
create table if not exists public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now(),
  -- Postgres refuses `generated always as (created_at + interval '5 minutes') stored`
  -- because timestamptz + interval is STABLE, not IMMUTABLE (DST-sensitive).
  -- A DEFAULT expression works identically here since no code path ever
  -- updates created_at, and RLS blocks external UPDATEs to this table.
  expires_at   timestamptz not null default (now() + interval '5 minutes'),
  constraint dm_no_self check (sender_id <> recipient_id)
);
create index if not exists dm_pair_sent_idx on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists dm_pair_recv_idx on public.direct_messages (recipient_id, sender_id, created_at desc);
create index if not exists dm_expiry_idx    on public.direct_messages (expires_at);

alter table public.direct_messages enable row level security;

drop policy if exists dm_select_participants on public.direct_messages;
create policy dm_select_participants on public.direct_messages
  for select using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and expires_at > now()
  );

drop policy if exists dm_insert_sender on public.direct_messages;
create policy dm_insert_sender on public.direct_messages
  for insert with check (auth.uid() = sender_id);

-- =============================================================================
-- 3. profile_likes — one like per (liker, liked) pair.
-- =============================================================================
create table if not exists public.profile_likes (
  liker_id      uuid not null references auth.users(id) on delete cascade,
  liked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (liker_id, liked_user_id),
  constraint like_no_self check (liker_id <> liked_user_id)
);
create index if not exists likes_liked_idx on public.profile_likes (liked_user_id, created_at desc);

alter table public.profile_likes enable row level security;

drop policy if exists likes_select_involved on public.profile_likes;
create policy likes_select_involved on public.profile_likes
  for select using (auth.uid() = liker_id or auth.uid() = liked_user_id);

drop policy if exists likes_insert_own on public.profile_likes;
create policy likes_insert_own on public.profile_likes
  for insert with check (auth.uid() = liker_id);

drop policy if exists likes_delete_own on public.profile_likes;
create policy likes_delete_own on public.profile_likes
  for delete using (auth.uid() = liker_id);

-- =============================================================================
-- 4. favorites — separate from likes: private "saved for later" list.
-- =============================================================================
create table if not exists public.favorites (
  user_id          uuid not null references auth.users(id) on delete cascade,
  favorite_user_id uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, favorite_user_id),
  constraint fav_no_self check (user_id <> favorite_user_id)
);

alter table public.favorites enable row level security;

drop policy if exists fav_select_own on public.favorites;
create policy fav_select_own on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists fav_insert_own on public.favorites;
create policy fav_insert_own on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists fav_delete_own on public.favorites;
create policy fav_delete_own on public.favorites
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 5. notifications — in-app inbox, 1-hour TTL, auto-hidden after expiry.
-- =============================================================================
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete set null,
  kind         text not null check (kind in ('message','like','favorite')),
  body         text,
  created_at   timestamptz not null default now(),
  -- See note on direct_messages.expires_at above: DEFAULT is used instead of
  -- GENERATED because timestamptz + interval is STABLE, not IMMUTABLE.
  expires_at   timestamptz not null default (now() + interval '1 hour'),
  read_at      timestamptz
);
create index if not exists notif_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notif_expiry_idx    on public.notifications (expires_at);

alter table public.notifications enable row level security;

drop policy if exists notif_select_own on public.notifications;
create policy notif_select_own on public.notifications
  for select using (auth.uid() = recipient_id and expires_at > now());

drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- =============================================================================
-- 6. push_tokens — Expo push token per user, used by the edge function.
-- =============================================================================
create table if not exists public.push_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;

drop policy if exists push_own on public.push_tokens;
create policy push_own on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 7. get_nearby_users — extended with `city` in output + optional city filter.
-- =============================================================================
drop function if exists public.get_nearby_users(double precision, double precision, integer, integer, text, integer, integer);
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

-- =============================================================================
-- 8. list_users_by_city — browse-by-city without any GPS/radar constraint.
-- =============================================================================
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
  city text
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
    p.city
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

-- =============================================================================
-- 9. Messaging RPCs
-- =============================================================================
create or replace function public.send_direct_message(target_user_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  actor_username text;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid recipient'; end if;
  if message_body is null or length(trim(message_body)) = 0 then raise exception 'Empty message'; end if;

  insert into public.direct_messages (sender_id, recipient_id, body)
  values (me, target_user_id, message_body)
  returning id into new_id;

  select instagram_username into actor_username from public.profiles where id = me;

  -- One notification row per message; the edge function is responsible for
  -- BATCHING pushes if multiple notifications land inside a short window.
  insert into public.notifications (recipient_id, actor_id, kind, body)
  values (target_user_id, me, 'message', coalesce('@' || actor_username, 'Someone') || ' sent you a message');

  return new_id;
end;
$$;
grant execute on function public.send_direct_message(uuid, text) to authenticated;

create or replace function public.get_conversation(other_user_id uuid, limit_count integer default 100)
returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  body text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  return query
  select m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.expires_at
  from public.direct_messages m
  where m.expires_at > now()
    and (
      (m.sender_id = me and m.recipient_id = other_user_id)
      or (m.sender_id = other_user_id and m.recipient_id = me)
    )
  order by m.created_at asc
  limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;
grant execute on function public.get_conversation(uuid, integer) to authenticated;

create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_body text,
  last_at timestamptz
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
  select p.id, p.instagram_username, p.avatar_url, pr.body, pr.created_at
  from pairs pr
  join public.profiles p on p.id = pr.other_id
  where pr.rn = 1
  order by pr.created_at desc;
end;
$$;
grant execute on function public.list_conversations() to authenticated;

-- =============================================================================
-- 10. Like + Favorite RPCs (each writes an in-app notification for the target)
-- =============================================================================
create or replace function public.toggle_profile_like(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  liked boolean;
  actor_username text;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid target'; end if;

  if exists (select 1 from public.profile_likes where liker_id = me and liked_user_id = target_user_id) then
    delete from public.profile_likes where liker_id = me and liked_user_id = target_user_id;
    liked := false;
  else
    insert into public.profile_likes (liker_id, liked_user_id) values (me, target_user_id);
    liked := true;

    select instagram_username into actor_username from public.profiles where id = me;
    insert into public.notifications (recipient_id, actor_id, kind, body)
    values (target_user_id, me, 'like', coalesce('@' || actor_username, 'Someone') || ' liked your profile');
  end if;

  return liked;
end;
$$;
grant execute on function public.toggle_profile_like(uuid) to authenticated;

create or replace function public.toggle_favorite(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  favorited boolean;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid target'; end if;

  if exists (select 1 from public.favorites where user_id = me and favorite_user_id = target_user_id) then
    delete from public.favorites where user_id = me and favorite_user_id = target_user_id;
    favorited := false;
  else
    insert into public.favorites (user_id, favorite_user_id) values (me, target_user_id);
    favorited := true;
  end if;
  return favorited;
end;
$$;
grant execute on function public.toggle_favorite(uuid) to authenticated;

create or replace function public.list_favorites()
returns table (
  id uuid,
  instagram_username text,
  instagram_url text,
  avatar_url text,
  gender text,
  age integer,
  city text,
  favorited_at timestamptz
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
    f.created_at
  from public.favorites f
  join public.profiles p on p.id = f.favorite_user_id
  where f.user_id = me
  order by f.created_at desc;
end;
$$;
grant execute on function public.list_favorites() to authenticated;

-- =============================================================================
-- 11. Notifications RPCs
-- =============================================================================
create or replace function public.list_notifications()
returns table (
  id uuid,
  actor_id uuid,
  actor_username text,
  actor_avatar_url text,
  kind text,
  body text,
  created_at timestamptz,
  expires_at timestamptz,
  read_at timestamptz
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
    n.id,
    n.actor_id,
    p.instagram_username,
    p.avatar_url,
    n.kind,
    n.body,
    n.created_at,
    n.expires_at,
    n.read_at
  from public.notifications n
  left join public.profiles p on p.id = n.actor_id
  where n.recipient_id = me
    and n.expires_at > now()
  order by n.created_at desc
  limit 100;
end;
$$;
grant execute on function public.list_notifications() to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  update public.notifications set read_at = now()
  where recipient_id = me and read_at is null and expires_at > now();
end;
$$;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- =============================================================================
-- 12. Cleanup — call from Supabase scheduled function every 5 min
-- =============================================================================
create or replace function public.cleanup_expired()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.direct_messages where expires_at <= now();
  delete from public.notifications  where expires_at <= now();
end;
$$;
grant execute on function public.cleanup_expired() to authenticated;

-- =============================================================================
-- 13. Push tokens RPC
-- =============================================================================
create or replace function public.upsert_push_token(new_token text, new_platform text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if new_token is null or length(trim(new_token)) = 0 then raise exception 'Empty token'; end if;

  insert into public.push_tokens (user_id, token, platform, updated_at)
  values (me, new_token, new_platform, now())
  on conflict (user_id) do update set token = excluded.token, platform = excluded.platform, updated_at = now();
end;
$$;
grant execute on function public.upsert_push_token(text, text) to authenticated;

