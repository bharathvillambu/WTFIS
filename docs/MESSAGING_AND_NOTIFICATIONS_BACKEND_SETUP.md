# Backend Setup — Messaging, Likes, Favorites, City & Notifications

This document lists every SQL / backend step required to enable the new
features in this release:

- 5-minute ephemeral messages (with in-app countdown and auto-hide)
- Profile Likes and Favorites (each writes an in-app notification)
- City field on profiles + browse-by-city listing
- In-app Notification Center (1-hour TTL, top-right bell)
- Batched push notifications via an Expo push edge function

All schema/RPC changes live in a single migration:
`supabase/migrations/0003_messaging_likes_favorites_notifications.sql`

---

## Prerequisites

Make sure these earlier migrations are already applied to your project:

- `0001_init.sql` — base schema, RLS, and initial RPCs.
- `0002_gender_age_and_relaxed_validation.sql` — gender/age columns + updated `get_nearby_users`.

If not, apply them first following `docs/BACKEND_UPDATE_GUIDE.md`.

---

## Step 1 — Apply the migration

### Option A — Supabase Dashboard (fastest)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of
   `supabase/migrations/0003_messaging_likes_favorites_notifications.sql`.
3. Click **Run**. You should see "Success. No rows returned".

### Option B — Supabase CLI

```powershell
supabase db push
```

or, to run a single file explicitly:

```powershell
supabase db execute --file supabase/migrations/0003_messaging_likes_favorites_notifications.sql
```

---

## Step 2 — Enable Realtime (optional but recommended)

The chat screen currently polls every 5 seconds. If you want instant
updates, enable Realtime on the `direct_messages` and `notifications`
tables:

**Dashboard →** Database → Replication → toggle `direct_messages` and
`notifications` to **On**.

The client subscription code path is straightforward to add once realtime
is enabled — see `lib/messages.ts` and `lib/notifications.ts`.

---

## Step 3 — Schedule the expiry cleanup job

Expired messages and notifications are automatically excluded from all
queries by their RLS policies, so the app looks correct immediately even
without a cleanup job. To keep the tables physically small, run
`public.cleanup_expired()` on a schedule.

### On Supabase (SQL Editor)

If your project has `pg_cron` enabled (default on Supabase):

```sql
select cron.schedule(
  'cleanup_expired_every_5_min',
  '*/5 * * * *',
  $$ select public.cleanup_expired(); $$
);
```

To remove later:

```sql
select cron.unschedule('cleanup_expired_every_5_min');
```

Alternatively, deploy a scheduled Edge Function that calls
`supabase.rpc('cleanup_expired')` every 5 minutes.

---

## Step 4 — Configure push notifications

Client-side registration lands the user's Expo push token in
`public.push_tokens` (via the `upsert_push_token` RPC). To actually deliver
pushes you need to run a small Edge Function that listens for new
notification rows and calls Expo's push API.

### 4a. Enable the Expo Notifications module in the app

The `expo-notifications` module needs to be added to the client:

```powershell
npx expo install expo-notifications
```

Then wire up token registration in the app once the user is signed in
(the RPC is already available server-side).

### 4b. Deploy the push edge function

Create a Supabase Edge Function (name it `push_notifications`) with the
following behavior:

- Trigger: a database webhook on `INSERT` into `public.notifications`.
- Read the recipient's push token from `public.push_tokens`.
- **Batch** by recipient over a rolling 60-second window using a KV
  store or a small `pending_pushes` table so we send **one grouped push
  per user** instead of one per event (e.g. "3 new messages, 2 likes").
- POST to `https://exp.host/--/api/v2/push/send` with the token, title,
  and body.

Sample body of the push payload:

```json
{
  "to": "ExponentPushToken[XXXX]",
  "title": "Flick",
  "body": "3 new messages, 2 profile likes",
  "sound": "default"
}
```

Batching guidance (server-side, edge function):
- Keep an in-memory or KV counter per `recipient_id`.
- On the first notification, delay push send by ~15–30 seconds.
- On subsequent notifications in the same window, increment counters.
- After the delay, flush a single grouped message.

This matches the product rule that we **do not flood the user with
per-event notifications**.

---

## Step 5 — Verify everything

Run these one-liners in the SQL editor to sanity-check the new surface:

```sql
-- Confirm new tables exist
select tablename from pg_tables where schemaname = 'public'
and tablename in ('direct_messages','profile_likes','favorites','notifications','push_tokens');

-- Confirm new functions exist
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
and proname in (
  'send_direct_message','get_conversation','list_conversations',
  'toggle_profile_like','toggle_favorite','list_favorites',
  'list_notifications','mark_all_notifications_read',
  'cleanup_expired','upsert_push_token','list_users_by_city'
);

-- Confirm profiles.city column
select column_name from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name='city';
```

Then do these client-side smoke tests:

- [ ] Sign in with two accounts.
- [ ] From Radar → open a profile → tap **Message** → send a message.
- [ ] Wait ~5 minutes → the message disappears in both threads.
- [ ] Tap **Like** → the target receives a `like` notification in their
      **Notification Center** (top-right bell).
- [ ] Wait ~1 hour → notifications auto-hide from the list.
- [ ] Tap **Save (Favorite)** → target shows up in **Messages → Favorited**.
- [ ] In **Messages → By City** enter a city → users from that city
      appear (respecting gender/age filters).

---

## Rollback (destructive)

To remove everything this migration added:

```sql
drop function if exists public.upsert_push_token(text, text);
drop function if exists public.cleanup_expired();
drop function if exists public.mark_all_notifications_read();
drop function if exists public.list_notifications();
drop function if exists public.list_favorites();
drop function if exists public.toggle_favorite(uuid);
drop function if exists public.toggle_profile_like(uuid);
drop function if exists public.list_conversations();
drop function if exists public.get_conversation(uuid, integer);
drop function if exists public.send_direct_message(uuid, text);
drop function if exists public.list_users_by_city(text, text, integer, integer, integer);

drop table if exists public.push_tokens;
drop table if exists public.notifications;
drop table if exists public.favorites;
drop table if exists public.profile_likes;
drop table if exists public.direct_messages;

alter table public.profiles drop column if exists city;
```

The prior `get_nearby_users` (without `city_filter`) will need to be
re-created from `0002_gender_age_and_relaxed_validation.sql` if you roll
back this migration.

