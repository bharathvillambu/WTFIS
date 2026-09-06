# Flick — Production Backend Steps

This document is the **single source of truth** for taking the Flick backend from the current state (last applied migration = `0005`) to a production-ready deployment. Follow every section in order. Nothing here requires the payments / subscription work.

> **Assumption before you start:** You have a Supabase project already provisioned and connected to the app via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and migrations `0001` – `0005` have been successfully applied.

---

## 0. Prerequisites (once per project)

| Item | How to check | Fix if missing |
|---|---|---|
| Supabase plan is at least **Pro** | Dashboard → Settings → Billing | Upgrade — required for `pg_cron`, `pg_net`, PITR, log drains. |
| PostGIS extension enabled | Dashboard → Database → Extensions → `postgis` | Toggle on. |
| Anon key in the app bundle only | `git grep -i "service_role"` on the app repo | Rotate keys immediately if the service_role key leaked. |
| Backups → Point-in-time Recovery enabled | Dashboard → Database → Backups | Toggle "PITR" — free on Pro. |

---

## 1. Apply the SQL migrations in order

Open **SQL Editor** in the Supabase dashboard. Paste and run the following files **one at a time, in this exact order**. Each block is idempotent, so re-running is safe.

### Order & purpose

| # | File | What it does |
|---|---|---|
| 06 | `supabase/migrations/0006_username_search.sql` | Adds `search_users_by_username(q, limit)` RPC + `profiles_username_lower_idx`. |
| 07 | `supabase/migrations/0007_push_dispatch.sql` | Enables `pg_net`; on every INSERT into `notifications` posts an Expo push. |
| 08 | `supabase/migrations/0008_blocks_reports_moderation.sql` | User blocks, user reports, auto-suspend, block filter in all list RPCs, rate limits on `send_direct_message` + `toggle_profile_like`. |
| 09 | `supabase/migrations/0009_indexes_cleanup_cron.sql` | Perf indexes on hot paths + `pg_cron` schedules for expired-row cleanup and dead-push-token pruning. |

### Steps

1. **Copy** the contents of `0006_username_search.sql` → paste in SQL Editor → **Run**.
2. Verify success (bottom-right shows "Success. No rows returned").
3. Repeat for `0007`, `0008`, `0009`.
4. After `0009`, verify pg_cron jobs are scheduled:
   ```sql
   select jobname, schedule, active from cron.job order by jobname;
   ```
   You should see `flick_cleanup_expired` (`*/5 * * * *`) and `flick_prune_dead_tokens` (`17 3 * * *`).

### Rollback

Each migration is a set of `create or replace` / `drop ... if exists`. To roll back you re-apply the previous version. Keep the SQL files in git so you always have the last-known-good state.

---

## 2. Storage bucket hardening (avatars)

Do this **once** in the Supabase dashboard.

1. Go to **Storage → `avatars` bucket → Configuration**.
2. Set:
   - **Public**: `on` (avatars are shown to peers via signed public URL — that's fine)
   - **File size limit**: `3 MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`
3. Storage policies (Policies tab) — verify these exist. If a user first-run created a bucket without RLS, add:

```sql
-- Anyone signed in can read avatars (avatars are semi-public):
create policy "avatars_read_signed_in" on storage.objects
  for select using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- A user can write only under their own folder `<uid>/…`:
create policy "avatars_write_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

> **Content moderation follow-up (not blocking launch, but strongly recommended):** wire an Edge Function that fires on `storage.objects` INSERT for the `avatars` bucket and calls Sightengine (or AWS Rekognition) with `nudity, csam, offensive` models. On a red flag, delete the object and insert a `user_reports` row with `context = 'auto_moderation'`. Ship without it for closed beta, add before public launch.

---

## 3. Auth hardening

Dashboard → **Authentication → Sign In / Providers**:

- **Google** (currently the only provider) — confirm the client ID matches `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the app. If deploying under the app-store bundle IDs `com.instalocator.app`, ensure the OAuth consent screen and origins include your Supabase callback URL and the app scheme `instalocator://`.
- Turn on **"Confirm email"** and **"Secure email change"** even for Google-only, so future email flows are safe by default.

Dashboard → **Authentication → Rate limits** (verify Pro-plan defaults):

| Setting | Value |
|---|---|
| Sign-in attempts per IP / hour | 30 |
| Password reset requests / hour | 3 |
| OTP requests / IP / hour | 10 |
| Refresh token reuse detection | on |

---

## 4. Environment variables

Dashboard → **Project Settings → Edge Functions → Environment**. Only set what you actually use. Nothing is required for the current build, but reserve these keys for future features:

| Name | Used by |
|---|---|
| `EXPO_ACCESS_TOKEN` | (optional) higher-limit push sends |
| `SIGHTENGINE_API_USER` / `_KEY` | Avatar moderation Edge Function |
| `SENTRY_DSN_SERVER` | Server-side Sentry (Edge Functions) |

For the mobile app, EAS Secrets:

```powershell
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL     --value "https://<project>.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ...anonkey..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "<client id>"
```

Never commit real values to `.env` in git; keep only `.env.example`.

---

## 5. Push notifications activation

1. **Ensure `pg_net`** was enabled (0007 handles this automatically). Verify:
   ```sql
   select extname from pg_extension where extname='pg_net';
   ```
2. **Ensure Expo project id** is set. Open `app.json` → `expo.extra.eas.projectId` — must match the EAS project the client is bound to. If empty, run `eas init` in the repo.
3. **Android production requires FCM.** Create/download `google-services.json` from Firebase Console → Project → Add Android app (package `com.instalocator.app`). Save it at the repo root and add to `app.json`:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     "...": "existing keys"
   }
   ```
4. **iOS**: EAS handles the APNs key automatically during `eas build`. If you build manually, add the "Push Notifications" capability in Xcode.
5. **Client rebuild**: `expo-notifications` is a native module, so you need a fresh build (`eas build -p android --profile production` and `-p ios`). Expo Go can't fully test remote pushes since SDK 53+.
6. **End-to-end test** after installing the new build:
   - Sign in on device A → Supabase Table Editor `push_tokens` should show a row with an `ExponentPushToken[...]` value.
   - From device B, send a chat message to A → within ~5 s you should get a banner "New message from @…".
   - Tap the banner → the chat screen for that user opens.
   - Like device A's profile from B → banner "New like".

If nothing arrives, in SQL Editor:
```sql
select * from net.http_response_status order by created_at desc limit 5;
```
Any non-200 rows tell you what Expo rejected (usually "DeviceNotRegistered" — the client will re-register on next launch).

---

## 6. Scheduled jobs (installed by 0009)

Confirm both are running:
```sql
select jobname, schedule, database, username, active from cron.job order by jobname;
```

Expected:

| jobname | schedule | purpose |
|---|---|---|
| `flick_cleanup_expired` | `*/5 * * * *` | Deletes messages/notifications past their TTL. |
| `flick_prune_dead_tokens` | `17 3 * * *` | Removes push tokens the client marked dead. |

To inspect recent runs:
```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

Any row with `status != 'succeeded'` deserves attention.

---

## 7. Verify blocks + reports + rate limits

After 0008, run these sanity queries in the SQL Editor as a signed-in user (use the Auth section to impersonate):

```sql
-- List RPCs should hide blocked users
select public.block_user('<some-user-uuid>');
select id, instagram_username from public.search_users_by_username('bharath'); -- shouldn't include blocked

-- Report → auto-suspend after 3 distinct reporters
select public.report_user('<some-user-uuid>', 'Spam', 'test');

-- Rate limit — should raise on the 61st message inside a minute
do $$
begin
  for i in 1..61 loop
    perform public.send_direct_message('<user-uuid>', 'ping ' || i);
  end loop;
end $$;
-- Expected: raises 'You are sending messages too fast.'
```

Clean up test rows afterwards:
```sql
delete from public.user_blocks   where blocker_id = auth.uid();
delete from public.user_reports  where reporter_id = auth.uid();
delete from public.direct_messages where sender_id = auth.uid() and body like 'ping %';
```

---

## 8. Observability (recommended before real users arrive)

### 8a. Log drain (Supabase Pro)

Dashboard → Project Settings → **Log Drains** → add a **BetterStack / Logtail / Axiom** target so you have >7 days of history. This is where you'll grep for `push dispatch failed`, `raise notice` messages, and any 5xx bursts.

### 8b. Uptime monitoring

Free tier of UptimeRobot on:
- `https://<project>.supabase.co/rest/v1/` (should return 200)
- `https://<project>.supabase.co/auth/v1/health` (should return 200)

### 8c. Push receipts polling (defers to Path B if you're at scale)

The trigger in 0007 is fire-and-forget. To reclaim dead tokens **automatically**, add an Edge Function that once/day fetches Expo push receipts and marks tokens dead. Skeleton (drop into `supabase/functions/expo-receipts/index.ts`):

```ts
// Pull receipt ids saved to net.http_response, hit
// POST https://exp.host/--/api/v2/push/getReceipts { ids: [...] }
// For each result whose `details.error === 'DeviceNotRegistered'`,
// UPDATE public.push_tokens SET token='' WHERE token = <that>;
```

Until this exists, dead tokens simply keep receiving 502s from Expo — no data corruption, just wasted bandwidth. Not blocking for launch.

---

## 9. Store listing prerequisites (do the day *before* submission)

- **Public hosted Privacy Policy** at `https://flick.app/privacy` (used in `constants/config.ts` and both stores). Simplest: publish a GitHub Pages site under your domain.
- **Public hosted Terms** at `https://flick.app/terms`.
- **Contact email** `support@flick.app` — set up an actual mailbox before submission; Apple/Google email you and expect a reply within days.
- **Data safety declaration** (Google Play → Console → App content → Data safety): declare Location (approximate), Personal info (name, email via Google), User content (photos, messages), and confirm no data sale.
- **App Privacy manifest** (Apple → App Store Connect → App Privacy): mirror the same disclosures.
- **Content rating**: Play → IARC questionnaire → typical result "Teen" or "Mature 17+" for dating.
- **Age rating**: Apple → 17+ for dating.
- **Screenshots**: Play 1080×1920 phone × 5, feature graphic 1024×500. Apple 6.9" and 6.7" phone screenshots (mandatory since 2026).

---

## 10. Pre-launch checklist

| Check | Verified by |
|---|---|
| ✅ All migrations 0001–0009 applied without errors | `select count(*) from pg_matviews` runs |
| ✅ Storage bucket has size + MIME limits | Storage → bucket config |
| ✅ Push receipts confirmed on both Android + iOS | Device A/B smoke test in §5 |
| ✅ `flick_cleanup_expired` cron shows recent successful runs | `cron.job_run_details` |
| ✅ Block filter hides users end-to-end (Radar / Search / Chats / Favorites / ProfileCard) | Manual test |
| ✅ Report modal submits and auto-suspends at ≥3 reports | Impersonate 3 users |
| ✅ Rate limit trips at 60 msg/min and 30 likes/min | SQL test in §7 |
| ✅ Age gate blocks Google sign-in until checkbox is on | Manual test on login |
| ✅ Hosted Privacy + Terms URLs return 200 | `curl -I` |
| ✅ Support email is monitored | Send test email |
| ✅ PITR backups enabled | Backups tab |
| ✅ Anon key only in bundle; service_role NEVER in git | `git grep` |

Once every row above is ticked, you're production-ready **at the backend layer**. The remaining work is packaging: EAS production build, TestFlight/internal track, submit for review.

---

## 11. What was intentionally deferred (do next iteration)

- **Payments / subscriptions.** Out of scope for this doc per project owner's decision.
- **Realtime WebSockets** replacing the 5s chat polling. Big battery/bandwidth win but a bigger change; land after v1.0 is stable.
- **Presence table split.** Currently `last_seen_at` lives on `profiles`. At >10k concurrent users move it to a dedicated `presence` table to avoid vacuum churn.
- **Deep links.** Requires a hosted `.well-known/apple-app-site-association` and `assetlinks.json` under your domain. Trivial once the domain is live.
- **Sentry** + **PostHog analytics**. Wire the DSN and project keys into `app.json` extras when you have them.
- **Sightengine / AWS Rekognition** avatar moderation. Add before public launch.

---

## 12. Quick reference — every SQL object introduced

New tables:
`user_blocks`, `user_reports`.

New / redefined functions:
`search_users_by_username`, `dispatch_push_on_notification` (trigger fn),
`is_blocked`, `block_user`, `unblock_user`, `report_user`, `list_my_blocks`,
`prune_dead_push_tokens`, and redefinitions of
`get_nearby_users`, `list_users_by_city`, `list_favorites`, `list_conversations`,
`search_users_by_username`, `get_conversation`, `send_direct_message`, `toggle_profile_like`.

New triggers:
`notifications_push_dispatch` (on `public.notifications`).

New indexes:
`profiles_username_lower_idx`, `profiles_visible_updated_idx`, `profiles_location_gix`,
`profiles_last_seen_idx`, `dm_participant_sender_time_idx`, `dm_participant_recv_time_idx`,
`dm_recipient_unread_only_idx`, `notif_recipient_expiry_idx`, `blocks_blocker_idx`,
`blocks_blocked_idx`, `reports_status_idx`, `reports_reported_idx`.

New pg_cron jobs:
`flick_cleanup_expired`, `flick_prune_dead_tokens`.

New extensions:
`pg_net`, `pg_cron`.

---

_Last updated for the "production-readiness" refactor. Owner: Flick backend._

