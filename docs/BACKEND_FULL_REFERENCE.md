# Backend Setup — Full Reference

_Last updated: this covers migrations `0001`, `0002`, `0003` and everything the current client expects the Supabase project to provide._

Read this end-to-end before deploying. Every section is required unless
marked **Optional**.

## Contents

- [1. Apply all migrations, in order](#1-apply-all-migrations-in-order)
- [2. Verify schema, RPCs, and RLS](#2-verify-schema-rpcs-and-rls)
- [3. Auth (Google OAuth)](#3-auth-google-oauth)
- [4. Storage (avatars bucket)](#4-storage-avatars-bucket)
- [5. Scheduled cleanup for expiring rows](#5-scheduled-cleanup-for-expiring-rows)
- [6. Push notifications (Expo)](#6-push-notifications-expo)
- [7. Realtime (Optional)](#7-realtime-optional)
- [8. Post-deploy smoke test](#8-post-deploy-smoke-test)
- [9. Rollback references](#9-rollback-references)

---

## 1. Apply all migrations, in order

Migrations must be applied strictly in this order — each one depends on
schema created by the previous.

| Order | File | Adds |
|-------|------|------|
| 1 | `supabase/migrations/0001_init.sql` | `profiles`, PostGIS, RLS, storage bucket, initial RPCs. |
| 2 | `supabase/migrations/0002_gender_age_and_relaxed_validation.sql` | `gender`, `birth_date` columns, dropped strict Instagram checks, updated `get_nearby_users`. |
| 3 | `supabase/migrations/0003_messaging_likes_favorites_notifications.sql` | `direct_messages`, `profile_likes`, `favorites`, `notifications`, `push_tokens`, `profiles.city`, extended `get_nearby_users`, all messaging/social/notification/cleanup RPCs. |

### Option A — Dashboard (fastest for a single environment)

For each file above, in order:

1. Open **SQL Editor → New query**.
2. Paste the entire file contents.
3. Click **Run** and confirm "Success. No rows returned."

### Option B — Supabase CLI

Recommended for reproducible deploys.

```powershell
supabase link --project-ref <your-project-ref>
supabase db push
```

Or a single file:

```powershell
supabase db execute --file supabase/migrations/0003_messaging_likes_favorites_notifications.sql
```

---

## 2. Verify schema, RPCs, and RLS

Run each block below in the SQL Editor and confirm the described output.

### 2a. Tables exist

```sql
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles','direct_messages','profile_likes',
    'favorites','notifications','push_tokens'
  )
order by tablename;
```

Expected: 6 rows.

### 2b. `profiles` has the expected columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by column_name;
```

Must include: `gender`, `birth_date`, `city`, plus the original columns
(`id`, `instagram_username`, `instagram_url`, `avatar_url`, `location`,
`visible_on_radar`, `location_updated_at`, `created_at`, `updated_at`).

### 2c. All RPCs the client calls exist

```sql
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'update_my_location','get_nearby_users','delete_my_account',
    'send_direct_message','get_conversation','list_conversations',
    'toggle_profile_like','toggle_favorite','list_favorites',
    'list_notifications','mark_all_notifications_read',
    'list_users_by_city','cleanup_expired','upsert_push_token'
  )
order by proname;
```

Expected: 14 rows. If any are missing, re-apply the migration that
defines it (see the table in section 1).

### 2d. `get_nearby_users` signature is the extended (8-arg) version

```sql
select
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid)     as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_nearby_users';
```

`args` should list `lat, lng, radius_meters, freshness_minutes,
gender_filter, min_age, max_age, city_filter`. If it still shows the
7-arg or 4-arg version, re-run `0003`.

### 2e. RLS is enabled on every new table

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles','direct_messages','profile_likes',
    'favorites','notifications','push_tokens'
  );
```

Every row's `rowsecurity` must be `true`.

### 2f. Policies exist

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'direct_messages','profile_likes','favorites',
    'notifications','push_tokens'
  )
order by tablename, policyname;
```

Expected (at minimum):

- `direct_messages`: `dm_select_participants (SELECT)`, `dm_insert_sender (INSERT)`
- `profile_likes`: `likes_select_involved (SELECT)`, `likes_insert_own (INSERT)`, `likes_delete_own (DELETE)`
- `favorites`: `fav_select_own`, `fav_insert_own`, `fav_delete_own`
- `notifications`: `notif_select_own`, `notif_update_own`
- `push_tokens`: `push_own (ALL)`

---

## 3. Auth (Google OAuth)

Same as the initial `0001` setup — no changes in this release. If not
already done:

1. Create an OAuth Web Client in **Google Cloud → Credentials**.
2. Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. **Supabase → Authentication → Providers → Google** — paste Client ID
   and Secret, toggle On.
4. **Supabase → Authentication → URL Configuration → Redirect URLs** —
   add `instalocator://auth-callback`.

---

## 4. Storage (avatars bucket)

Created automatically by `0001_init.sql` with the correct per-user
folder RLS policies. Nothing new is required in this release.

---

## 5. Scheduled cleanup for expiring rows

The client is safe without this — expired messages and notifications are
already excluded from every RPC by `expires_at > now()` predicates and
RLS policies, so users won't see them. Run cleanup only to keep table
sizes bounded.

### If `pg_cron` is enabled (default on Supabase)

```sql
select cron.schedule(
  'cleanup_expired_every_5_min',
  '*/5 * * * *',
  $$ select public.cleanup_expired(); $$
);
```

Verify:

```sql
select jobid, schedule, command from cron.job
where jobname = 'cleanup_expired_every_5_min';
```

Remove later with:

```sql
select cron.unschedule('cleanup_expired_every_5_min');
```

### If `pg_cron` is not available

Deploy a Scheduled Edge Function that calls
`supabase.rpc('cleanup_expired')` on a 5-minute schedule.

---

## 6. Push notifications (Expo)

The DB already writes `notifications` rows for every message/like/favorite
(via the RPCs). To convert those into device pushes:

### 6a. Client-side: install `expo-notifications`

```powershell
npx expo install expo-notifications
```

Wire this once, after sign-in completes (e.g. inside `app/_layout.tsx`
or a new `usePushRegistration` hook):

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upsertPushToken } from '@/lib/notifications';

async function registerPushToken() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return;
  const tokenResp = await Notifications.getExpoPushTokenAsync();
  await upsertPushToken(tokenResp.data, Platform.OS);
}
```

Call `registerPushToken()` once the user is authenticated. The RPC and
`push_tokens` table are already in place server-side.

### 6b. Server-side: batched push edge function

Create a Supabase Edge Function (name it e.g. `push_dispatch`) with:

- **Trigger:** a Database Webhook on `INSERT` into `public.notifications`.
- **Behavior:** for each new row, resolve the recipient's token from
  `public.push_tokens` and dispatch a push via
  `https://exp.host/--/api/v2/push/send`.
- **Batching:** hold pending events per `recipient_id` in a KV/table for
  a short window (15–30 s). On window flush, send a **single** summary
  push per user (e.g. "3 new messages, 2 profile likes"). This satisfies
  the "no per-event flooding" product rule.

Sample body posted to Expo:

```json
{
  "to": "ExponentPushToken[XXXX]",
  "title": "Flick",
  "body": "3 new messages, 2 profile likes",
  "sound": "default"
}
```

Keep the Edge Function's env vars scoped to the Supabase service role so
it can read `push_tokens` regardless of RLS.

---

## 7. Realtime (Optional)

The chat and notification screens poll on a short interval, so realtime
is **not required**. If you want instant updates:

**Dashboard → Database → Replication →** enable Realtime on
`direct_messages` and `notifications`, then subscribe from the client:

```ts
supabase
  .channel('dm-me')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
      () => refreshConversation())
  .subscribe();
```

---

## 8. Post-deploy smoke test

Do this with **two accounts** on two devices/browsers.

- [ ] Sign in on both.
- [ ] Complete profile setup on both (username, gender, DOB, optional city).
- [ ] Enable **Show me on Radar** and grant location permission on both.
- [ ] From account A: open account B's Radar card → **Message** → send text.
      → account B's `NotificationBell` badge increments.
      → account B's `/messages → Chats` shows the conversation.
- [ ] Wait 5 minutes → messages disappear on both sides.
- [ ] From account A: **Like** account B's profile → account B's
      Notification Center shows a "liked your profile" entry.
- [ ] Wait 1 hour → notifications disappear from the list automatically.
- [ ] From account A: **Save (Favorite)** account B → shows up under
      `/messages → Favorited`.
- [ ] `/messages → By City`: enter a city that matches account B's
      profile → account B appears; gender and age-bucket filters narrow
      results.
- [ ] Confirm push arrives on both devices (requires section 6 done and
      the app not in the foreground).

### Quick backend-only smoke:

```sql
-- Should return with no error even if empty.
select * from public.get_nearby_users(
  lat => 12.9716, lng => 77.5946,
  radius_meters => 5000, freshness_minutes => 15,
  gender_filter => null, min_age => null, max_age => null,
  city_filter => null
);

select * from public.list_notifications();
select * from public.list_conversations();
select * from public.list_favorites();
```

---

## 9. Rollback references

- Full rollback for `0003`: see
  `docs/MESSAGING_AND_NOTIFICATIONS_BACKEND_SETUP.md` → **Rollback** section.
- Legacy URL-format checks / age columns rollback: see
  `docs/BACKEND_UPDATE_GUIDE.md`.
- Optional `instagram_url` backfill (when upgrading from a project that
  saved bare usernames): see
  `docs/AGE_BUCKETS_AND_URL_FIX_BACKEND_STEPS.md` → Step 3.

---

## Known-safe assumptions the client makes

If you deviate from any of these, the client will break loudly:

- `auth.uid()` returns the authenticated user's UUID inside every RPC.
- `SECURITY DEFINER` functions are owned by a role with rights on
  `auth.users` (default: `postgres` on Supabase).
- `pgcrypto` extension is enabled (0003 enables it if missing).
- `PostGIS` extension is enabled (0001 enables it).
- Row-Level Security is **on** for `profiles`, `direct_messages`,
  `profile_likes`, `favorites`, `notifications`, `push_tokens`.
- All 14 RPCs listed in step 2c are `grant execute … to authenticated`.

