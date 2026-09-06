-- =============================================================================
-- Flick — User blocking, reporting, and store-required moderation plumbing
--
-- Adds:
--   * user_blocks         — one row per (blocker, blocked)
--   * user_reports        — user-submitted abuse reports, reviewed offline
--   * suspended flag on profiles for admin action
--   * helper is_blocked(a,b) predicate for use in list RPCs
--   * republished list RPCs (get_nearby_users, list_users_by_city,
--     list_favorites, list_conversations, search_users_by_username,
--     get_conversation, send_direct_message) to hide blocked users
--     and reject writes involving blocked users.
--
-- Run AFTER 0007.
-- =============================================================================

-- 1. Profiles: suspended flag ------------------------------------------------
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

-- 2. user_blocks -------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint block_no_self check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists blocks_select_own on public.user_blocks;
create policy blocks_select_own on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists blocks_insert_own on public.user_blocks;
create policy blocks_insert_own on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocks_delete_own on public.user_blocks;
create policy blocks_delete_own on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- 3. user_reports ------------------------------------------------------------
create table if not exists public.user_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references auth.users(id) on delete cascade,
  reported_id   uuid not null references auth.users(id) on delete cascade,
  reason        text not null check (char_length(reason) between 1 and 60),
  details       text check (char_length(details) <= 500),
  context       text,                                    -- e.g. chat, profile, radar
  status        text not null default 'open'
                check (status in ('open','reviewing','actioned','dismissed')),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid,
  constraint report_no_self check (reporter_id <> reported_id)
);
create index if not exists reports_status_idx on public.user_reports (status, created_at desc);
create index if not exists reports_reported_idx on public.user_reports (reported_id);

alter table public.user_reports enable row level security;

drop policy if exists reports_select_own on public.user_reports;
create policy reports_select_own on public.user_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists reports_insert_own on public.user_reports;
create policy reports_insert_own on public.user_reports
  for insert with check (auth.uid() = reporter_id);

-- 4. is_blocked helper -------------------------------------------------------
-- Returns true if either party has blocked the other.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- 5. RPCs to toggle block + submit report -----------------------------------
create or replace function public.block_user(target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid target'; end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (me, target_user_id)
  on conflict do nothing;

  -- Blocking implicitly clears any social relationship.
  delete from public.profile_likes
   where (liker_id = me and liked_user_id = target_user_id)
      or (liker_id = target_user_id and liked_user_id = me);
  delete from public.favorites
   where (user_id = me and favorite_user_id = target_user_id)
      or (user_id = target_user_id and favorite_user_id = me);
end $$;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  delete from public.user_blocks
    where blocker_id = me and blocked_id = target_user_id;
end $$;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.report_user(
  target_user_id uuid,
  reason text,
  details text default null,
  context text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  report_count int;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid target'; end if;
  if reason is null or length(trim(reason)) = 0 then raise exception 'reason is required'; end if;

  insert into public.user_reports (reporter_id, reported_id, reason, details, context)
  values (me, target_user_id, trim(reason), details, context)
  returning id into new_id;

  -- Auto-suspend on 3+ distinct-reporter reports in a 30d window.
  select count(distinct reporter_id) into report_count
    from public.user_reports
   where reported_id = target_user_id
     and created_at > now() - interval '30 days';
  if report_count >= 3 then
    update public.profiles
       set suspended_at = coalesce(suspended_at, now()),
           suspended_reason = coalesce(suspended_reason, 'Auto-suspended after multiple reports')
     where id = target_user_id and suspended_at is null;
  end if;

  return new_id;
end $$;
grant execute on function public.report_user(uuid, text, text, text) to authenticated;

create or replace function public.list_my_blocks()
returns table (
  blocked_id uuid,
  instagram_username text,
  avatar_url text,
  created_at timestamptz
)
language sql security definer set search_path=public as $$
  select b.blocked_id, p.instagram_username, p.avatar_url, b.created_at
    from public.user_blocks b
    join public.profiles p on p.id = b.blocked_id
   where b.blocker_id = auth.uid()
   order by b.created_at desc;
$$;
grant execute on function public.list_my_blocks() to authenticated;

-- 6. Republish list RPCs with block + suspended filters ---------------------

-- get_nearby_users ---------------------------------------------------------
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
  id uuid, instagram_username text, instagram_url text, avatar_url text,
  gender text, age integer, city text, distance_meters double precision, is_online boolean
) language plpgsql security definer set search_path=public as $$
declare origin geography; safe_radius integer; me uuid := auth.uid();
begin
  if lat is null or lng is null or lat < -90 or lat > 90 or lng < -180 or lng > 180 then
    raise exception 'Invalid coordinates';
  end if;
  safe_radius := greatest(100, least(coalesce(radius_meters, 1000), 20000));
  origin := geography(st_setsrid(st_makepoint(lng, lat), 4326));

  return query
  select p.id, p.instagram_username, p.instagram_url, p.avatar_url, p.gender,
    case when p.birth_date is null then null else (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end)::integer end as age,
    p.city, st_distance(p.location, origin) as distance_meters,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.profiles p
  where p.visible_on_radar = true
    and p.suspended_at is null
    and p.id <> coalesce(me, '00000000-0000-0000-0000-000000000000'::uuid)
    and p.location is not null
    and p.instagram_url is not null
    and p.location_updated_at is not null
    and p.location_updated_at > now() - make_interval(mins => greatest(1, coalesce(freshness_minutes, 15)))
    and st_dwithin(p.location, origin, safe_radius)
    and (gender_filter is null or gender_filter = 'All' or p.gender = gender_filter)
    and (city_filter is null or lower(p.city) = lower(city_filter))
    and (min_age is null or p.birth_date is null or (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end) >= min_age)
    and (max_age is null or p.birth_date is null or (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end) <= max_age)
    and (me is null or not public.is_blocked(me, p.id))
  order by distance_meters asc
  limit 50;
end $$;
grant execute on function public.get_nearby_users(
  double precision, double precision, integer, integer, text, integer, integer, text
) to authenticated;

-- list_users_by_city ------------------------------------------------------
drop function if exists public.list_users_by_city(text, text, integer, integer, integer);
create or replace function public.list_users_by_city(
  city_filter text,
  gender_filter text default null,
  min_age integer default null,
  max_age integer default null,
  limit_count integer default 50
) returns table (
  id uuid, instagram_username text, instagram_url text, avatar_url text,
  gender text, age integer, city text, is_online boolean
) language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if city_filter is null or length(trim(city_filter)) = 0 then
    raise exception 'city_filter is required';
  end if;

  return query
  select p.id, p.instagram_username, p.instagram_url, p.avatar_url, p.gender,
    case when p.birth_date is null then null else (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end)::integer end,
    p.city,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.profiles p
  where p.suspended_at is null
    and p.id <> coalesce(me, '00000000-0000-0000-0000-000000000000'::uuid)
    and p.instagram_url is not null
    and p.city is not null
    and lower(p.city) = lower(city_filter)
    and (gender_filter is null or gender_filter = 'All' or p.gender = gender_filter)
    and (me is null or not public.is_blocked(me, p.id))
    and (min_age is null or p.birth_date is null or (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end) >= min_age)
    and (max_age is null or p.birth_date is null or (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end) <= max_age)
  order by p.updated_at desc
  limit greatest(1, least(coalesce(limit_count, 50), 200));
end $$;
grant execute on function public.list_users_by_city(text, text, integer, integer, integer) to authenticated;

-- list_favorites ----------------------------------------------------------
drop function if exists public.list_favorites();
create or replace function public.list_favorites()
returns table (
  id uuid, instagram_username text, instagram_url text, avatar_url text,
  gender text, age integer, city text, favorited_at timestamptz, is_online boolean
) language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  return query
  select p.id, p.instagram_username, p.instagram_url, p.avatar_url, p.gender,
    case when p.birth_date is null then null else (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end)::integer end,
    p.city, f.created_at,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as is_online
  from public.favorites f
  join public.profiles p on p.id = f.favorite_user_id
  where f.user_id = me
    and p.suspended_at is null
    and not public.is_blocked(me, p.id)
  order by f.created_at desc;
end $$;
grant execute on function public.list_favorites() to authenticated;

-- list_conversations ------------------------------------------------------
drop function if exists public.list_conversations();
create or replace function public.list_conversations()
returns table (
  other_user_id uuid, other_username text, other_avatar_url text,
  last_body text, last_at timestamptz, other_is_online boolean,
  last_is_mine boolean, last_read_at timestamptz, unread_count integer
) language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  return query
  with pairs as (
    select case when sender_id = me then recipient_id else sender_id end as other_id,
           sender_id, recipient_id, body, created_at, read_at,
           row_number() over (partition by case when sender_id = me then recipient_id else sender_id end
                              order by created_at desc) as rn
      from public.direct_messages
     where expires_at > now() and (sender_id = me or recipient_id = me)
  ),
  unread as (
    select sender_id as other_id, count(*)::int as cnt
      from public.direct_messages
     where recipient_id = me and expires_at > now() and read_at is null
     group by sender_id
  )
  select p.id, p.instagram_username, p.avatar_url, pr.body, pr.created_at,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes'),
    (pr.sender_id = me), pr.read_at, coalesce(u.cnt, 0)
  from pairs pr
  join public.profiles p on p.id = pr.other_id
  left join unread u on u.other_id = pr.other_id
  where pr.rn = 1
    and p.suspended_at is null
    and not public.is_blocked(me, p.id)
  order by pr.created_at desc;
end $$;
grant execute on function public.list_conversations() to authenticated;

-- search_users_by_username ------------------------------------------------
drop function if exists public.search_users_by_username(text, integer);
create or replace function public.search_users_by_username(
  q text, limit_count integer default 30
) returns table (
  id uuid, instagram_username text, instagram_url text, avatar_url text,
  gender text, age integer, city text, is_online boolean
) language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid(); needle text;
begin
  if q is null or length(trim(q)) = 0 then return; end if;
  needle := lower(trim(q));

  return query
  select p.id, p.instagram_username, p.instagram_url, p.avatar_url, p.gender,
    case when p.birth_date is null then null else (
      date_part('year', current_date) - date_part('year', p.birth_date)
      - case when (date_part('month', current_date), date_part('day', current_date))
               < (date_part('month', p.birth_date), date_part('day', p.birth_date))
             then 1 else 0 end)::integer end,
    p.city,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes')
  from public.profiles p
  where p.id <> coalesce(me, '00000000-0000-0000-0000-000000000000'::uuid)
    and p.suspended_at is null
    and p.instagram_url is not null
    and p.instagram_username is not null
    and (lower(p.instagram_username) like needle || '%'
      or lower(p.instagram_username) like '%' || needle || '%')
    and (me is null or not public.is_blocked(me, p.id))
  order by
    case when lower(p.instagram_username) like needle || '%' then 0 else 1 end,
    p.instagram_username asc
  limit greatest(1, least(coalesce(limit_count, 30), 100));
end $$;
grant execute on function public.search_users_by_username(text, integer) to authenticated;

-- get_conversation --------------------------------------------------------
drop function if exists public.get_conversation(uuid, integer);
create or replace function public.get_conversation(other_user_id uuid, limit_count integer default 100)
returns table (
  id uuid, sender_id uuid, recipient_id uuid, body text,
  created_at timestamptz, expires_at timestamptz, read_at timestamptz
) language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if public.is_blocked(me, other_user_id) then
    return; -- silent empty result when either side has blocked the other
  end if;
  return query
  select m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.expires_at, m.read_at
  from public.direct_messages m
  where m.expires_at > now()
    and (
      (m.sender_id = me and m.recipient_id = other_user_id)
      or (m.sender_id = other_user_id and m.recipient_id = me)
    )
  order by m.created_at asc
  limit greatest(1, least(coalesce(limit_count, 100), 500));
end $$;
grant execute on function public.get_conversation(uuid, integer) to authenticated;

-- send_direct_message: refuse to send to blocked / suspended users --------
create or replace function public.send_direct_message(target_user_id uuid, message_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  actor_username text;
  target_suspended timestamptz;
  recent int;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid recipient'; end if;
  if message_body is null or length(trim(message_body)) = 0 then raise exception 'Empty message'; end if;
  if length(message_body) > 500 then raise exception 'Message too long'; end if;

  -- Reject writes across a block boundary.
  if public.is_blocked(me, target_user_id) then
    raise exception 'You cannot message this user';
  end if;

  select suspended_at into target_suspended from public.profiles where id = target_user_id;
  if target_suspended is not null then raise exception 'Recipient is unavailable'; end if;

  -- Rate limit: 60 messages / rolling minute.
  select count(*) into recent
    from public.direct_messages
   where sender_id = me and created_at > now() - interval '1 minute';
  if recent >= 60 then
    raise exception 'You are sending messages too fast. Try again in a minute.';
  end if;

  insert into public.direct_messages (sender_id, recipient_id, body)
  values (me, target_user_id, message_body)
  returning id into new_id;

  select instagram_username into actor_username from public.profiles where id = me;

  insert into public.notifications (recipient_id, actor_id, kind, body)
  values (target_user_id, me, 'message', coalesce('@' || actor_username, 'Someone') || ' sent you a message');

  return new_id;
end $$;
grant execute on function public.send_direct_message(uuid, text) to authenticated;

-- toggle_profile_like: rate-limit + block guard --------------------------
create or replace function public.toggle_profile_like(target_user_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  me uuid := auth.uid();
  liked boolean;
  actor_username text;
  recent int;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if target_user_id is null or me = target_user_id then raise exception 'Invalid target'; end if;
  if public.is_blocked(me, target_user_id) then raise exception 'You cannot like this user'; end if;

  select count(*) into recent from public.profile_likes
   where liker_id = me and created_at > now() - interval '1 minute';
  if recent >= 30 then raise exception 'Slow down. Try again in a minute.'; end if;

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
end $$;
grant execute on function public.toggle_profile_like(uuid) to authenticated;

