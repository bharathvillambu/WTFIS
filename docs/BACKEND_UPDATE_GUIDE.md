# Backend Update Guide

This document explains exactly how to push the backend changes required by
the latest app update (Instagram-style theme, gender/age fields, Radar
list + filters, and relaxed username/URL validation) to your Supabase
project.

## What changed and why

| Change | Reason |
|---|---|
| Added `gender` column (`profiles`) | Needed for the new gender filter/chip on Radar and profile setup. |
| Added `birth_date` column (`profiles`) | Needed for the new calendar date-of-birth picker; only a derived **age** is ever exposed to other users, never the raw date. |
| Dropped strict `instagram_username_format` check | Username is now a free-form display handle — "no validation" per product decision. |
| Dropped strict `instagram_url_format` check | The "Open Instagram" button now opens **any** URL the user stores, not just instagram.com links. |
| `get_nearby_users(...)` RPC replaced | Now also returns `gender` and `age`, and accepts optional `gender_filter`, `min_age`, `max_age` parameters so filtering can happen server-side. |

All of this lives in a new migration file:
`supabase/migrations/0002_gender_age_and_relaxed_validation.sql`

The original `supabase/migrations/0001_init.sql` is unchanged and must
already have been applied once before.

---

## Option A — Apply via the Supabase Dashboard (fastest, no CLI needed)

1. Go to your project at https://app.supabase.com.
2. Open **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open `supabase/migrations/0002_gender_age_and_relaxed_validation.sql`
   from this repo, copy its entire contents, and paste it into the editor.
5. Click **Run**. You should see "Success. No rows returned".
6. Verify the new columns exist: go to **Table Editor** → `profiles` and
   confirm you now see `gender` and `birth_date` columns.

That's it — no app restart needed, the RPC change takes effect immediately.

---

## Option B — Apply via the Supabase CLI

If you manage this project with the Supabase CLI and have already linked
it (`supabase link --project-ref <your-project-ref>`):

```powershell
# From the project root
supabase db push
```

This applies any migration files under `supabase/migrations/` that haven't
been applied yet, in filename order (`0001_...` then `0002_...`).

To apply a single migration file manually instead:

```powershell
supabase db execute --file supabase/migrations/0002_gender_age_and_relaxed_validation.sql
```

---

## Post-migration checklist

- [ ] `profiles` table has `gender` (text, nullable) and `birth_date` (date, nullable) columns.
- [ ] Inserting a profile with an arbitrary, non-Instagram username/URL no longer fails.
- [ ] Calling `get_nearby_users` with `gender_filter` / `min_age` / `max_age` arguments works from the SQL editor, e.g.:
  ```sql
  select * from public.get_nearby_users(
    lat => 12.9716,
    lng => 77.5946,
    radius_meters => 5000,
    freshness_minutes => 15,
    gender_filter => 'Female',
    min_age => 20,
    max_age => 30
  );
  ```
- [ ] The app's `.env` still has valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) — this migration does not change those.

## Rolling back (if needed)

There is no auto-generated "down" migration. To manually revert:

```sql
-- Restore the old strict validation (optional)
alter table public.profiles add constraint instagram_username_format
  check (instagram_username is null or instagram_username ~ '^[a-zA-Z0-9._]{1,30}$');
alter table public.profiles add constraint instagram_url_format
  check (instagram_url is null or instagram_url ~ '^https?://(www\.)?instagram\.com/[a-zA-Z0-9._]{1,30}/?(\?.*)?$');

-- Drop the new columns
alter table public.profiles drop column if exists gender;
alter table public.profiles drop column if exists birth_date;

-- Then re-run the original get_nearby_users(...) definition from 0001_init.sql
```

## Notes on privacy

- `birth_date` is **never** returned by any RPC or PostgREST query available
  to other users — only the derived, whole-number `age` field is exposed via
  `get_nearby_users`, consistent with the existing "no raw coordinates"
  privacy model for location.
- Row-level security on `profiles` is unchanged: users can still only
  directly `select`/`update`/`delete` their own row. Nearby-user discovery
  continues to go exclusively through the `SECURITY DEFINER`
  `get_nearby_users` RPC.

