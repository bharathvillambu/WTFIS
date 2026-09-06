-- =============================================================================
-- Flick — Read receipts for direct messages
-- Adds direct_messages.read_at + RLS for recipient updates + RPCs to mark
-- messages seen and to expose read status through get_conversation /
-- list_conversations (unread_count). Run AFTER 0004.
-- =============================================================================

-- 1. Column + index -----------------------------------------------------------
alter table public.direct_messages
  add column if not exists read_at timestamptz;

-- Fast lookup for unread counts per recipient.
create index if not exists dm_recipient_unread_idx
  on public.direct_messages (recipient_id, sender_id)
  where read_at is null;

-- 2. RLS — allow the recipient (only) to update read_at ----------------------
-- We intentionally allow UPDATE only when auth.uid() = recipient_id. The
-- mark_messages_read RPC uses SECURITY DEFINER and gates by auth.uid()
-- itself, but keeping this policy consistent lets Supabase clients tolerate
-- direct updates too without exposing message bodies to tampering.
drop policy if exists dm_update_recipient on public.direct_messages;
create policy dm_update_recipient on public.direct_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- 3. mark_messages_read(other_user_id) ---------------------------------------
-- Marks every not-yet-read message from `other_user_id` → me as read now.
-- Returns the number of rows that were newly marked.
create or replace function public.mark_messages_read(other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  n  integer;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid other_user_id';
  end if;

  update public.direct_messages
    set read_at = now()
    where recipient_id = me
      and sender_id = other_user_id
      and read_at is null
      and expires_at > now();

  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- 4. get_conversation — expose read_at ---------------------------------------
drop function if exists public.get_conversation(uuid, integer);

create or replace function public.get_conversation(other_user_id uuid, limit_count integer default 100)
returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
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
  select m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.expires_at, m.read_at
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

-- 5. list_conversations — add unread_count and last_is_mine + last_read_at ---
drop function if exists public.list_conversations();

create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_body text,
  last_at timestamptz,
  other_is_online boolean,
  last_is_mine boolean,
  last_read_at timestamptz,
  unread_count integer
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
      sender_id, recipient_id, body, created_at, read_at,
      row_number() over (
        partition by case when sender_id = me then recipient_id else sender_id end
        order by created_at desc
      ) as rn
    from public.direct_messages
    where expires_at > now()
      and (sender_id = me or recipient_id = me)
  ),
  unread as (
    -- Only messages *sent to me* that I haven't read count as unread.
    select sender_id as other_id, count(*)::int as cnt
    from public.direct_messages
    where recipient_id = me
      and expires_at > now()
      and read_at is null
    group by sender_id
  )
  select
    p.id                                                                as other_user_id,
    p.instagram_username                                                as other_username,
    p.avatar_url                                                        as other_avatar_url,
    pr.body                                                             as last_body,
    pr.created_at                                                       as last_at,
    (p.last_seen_at is not null and p.last_seen_at > now() - interval '3 minutes') as other_is_online,
    (pr.sender_id = me)                                                 as last_is_mine,
    pr.read_at                                                          as last_read_at,
    coalesce(u.cnt, 0)                                                  as unread_count
  from pairs pr
  join public.profiles p on p.id = pr.other_id
  left join unread u on u.other_id = pr.other_id
  where pr.rn = 1
  order by pr.created_at desc;
end;
$$;
grant execute on function public.list_conversations() to authenticated;

