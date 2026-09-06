-- =============================================================================
-- Flick — Push notification dispatch (Expo Push API via pg_net)
--
-- On every INSERT into public.notifications the trigger looks up the recipient's
-- Expo push token (if any) and POSTs a message to https://exp.host/--/api/v2/push/send.
-- Fire-and-forget: any HTTP failure is swallowed so it never blocks the INSERT.
--
-- Run AFTER 0006.
-- =============================================================================

create extension if not exists pg_net;

-- One centralised dispatcher for message / like / favorite pushes.
create or replace function public.dispatch_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tok  text;
  actor_username text;
  title text;
  body  text;
  route text;
  payload jsonb;
begin
  -- Expired notifications never push.
  if new.expires_at is not null and new.expires_at <= now() then
    return new;
  end if;

  select token into tok from public.push_tokens where user_id = new.recipient_id;
  if tok is null then return new; end if;

  select instagram_username into actor_username
    from public.profiles where id = new.actor_id;

  if new.kind = 'message' then
    title := coalesce('New message from @' || actor_username, 'New message');
    body  := coalesce(new.body, 'You have a new message');
    route := '/chat/' || coalesce(new.actor_id::text, '');
  elsif new.kind = 'like' then
    title := 'New like';
    body  := coalesce(new.body, coalesce('@' || actor_username, 'Someone') || ' liked your profile');
    route := '/notifications';
  elsif new.kind = 'favorite' then
    title := 'Added to favorites';
    body  := coalesce(new.body, coalesce('@' || actor_username, 'Someone') || ' favorited you');
    route := '/notifications';
  else
    title := 'Flick';
    body  := coalesce(new.body, 'You have a new notification');
    route := '/notifications';
  end if;

  payload := jsonb_build_object(
    'to',       tok,
    'sound',    'default',
    'title',    title,
    'body',     body,
    'priority', 'high',
    'channelId','default',
    'data', jsonb_build_object(
      'notification_id', new.id,
      'kind',            new.kind,
      'actor_id',        new.actor_id,
      'route',           route
    )
  );

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'Accept',          'application/json',
      'Accept-Encoding', 'gzip, deflate'
    ),
    body    := payload
  );
  return new;
exception when others then
  raise notice 'push dispatch failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notifications_push_dispatch on public.notifications;
create trigger notifications_push_dispatch
after insert on public.notifications
for each row execute function public.dispatch_push_on_notification();

