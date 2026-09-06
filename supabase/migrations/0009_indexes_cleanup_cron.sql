-- =============================================================================
-- Flick — Performance indexes + scheduled cleanup
-- Run AFTER 0008.
-- =============================================================================

-- 1. Indexes on hot paths ---------------------------------------------------

-- Radar: filter by visible_on_radar and freshness before spatial check.
create index if not exists profiles_visible_updated_idx
  on public.profiles (visible_on_radar, location_updated_at desc)
  where visible_on_radar = true;

-- Radar spatial lookups (safe to run even if get_nearby_users already picks a GiST index).
create index if not exists profiles_location_gix
  on public.profiles using gist (location);

-- Presence lookups.
-- (Column already indexed in 0004; re-create with `if not exists` for idempotence.)
create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen_at desc);

-- Message pair scans and unread counting.
create index if not exists dm_participant_sender_time_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists dm_participant_recv_time_idx
  on public.direct_messages (recipient_id, sender_id, created_at desc);
-- Unread partial index (0005 already created dm_recipient_unread_idx on
-- (recipient_id, sender_id) filtered where read_at is null — keep both).
create index if not exists dm_recipient_unread_only_idx
  on public.direct_messages (recipient_id)
  where read_at is null;

-- Notification inbox scans.
-- Partial indexes cannot use `now()` because predicates must be IMMUTABLE.
-- Use a composite recipient + expiry index instead for live-inbox queries.
create index if not exists notif_recipient_expiry_idx
  on public.notifications (recipient_id, expires_at, created_at desc);

-- Block lookups from either direction.
create index if not exists blocks_blocker_idx on public.user_blocks (blocker_id);

-- 2. pg_cron scheduled cleanup ---------------------------------------------
-- Runs cleanup_expired() every 5 minutes to remove TTL'd messages + notifications.
-- Also prunes push_tokens that Expo has told us are dead (via receipt polling).
create extension if not exists pg_cron;

-- Only schedule once — pg_cron.schedule is idempotent by jobname.
select cron.schedule(
  'flick_cleanup_expired',
  '*/5 * * * *',
  $$select public.cleanup_expired();$$
) where not exists (
  select 1 from cron.job where jobname = 'flick_cleanup_expired'
);

-- 3. dead-token pruning ----------------------------------------------------
-- Expo returns 'DeviceNotRegistered' or invalid tokens in the /receipts endpoint;
-- the client sets push_tokens.token = '' when it gets one back. We prune here.
create or replace function public.prune_dead_push_tokens()
returns void language sql security definer set search_path=public as $$
  delete from public.push_tokens where coalesce(length(trim(token)), 0) = 0;
$$;
grant execute on function public.prune_dead_push_tokens() to authenticated;

select cron.schedule(
  'flick_prune_dead_tokens',
  '17 3 * * *',                       -- 03:17 UTC daily
  $$select public.prune_dead_push_tokens();$$
) where not exists (
  select 1 from cron.job where jobname = 'flick_prune_dead_tokens'
);

