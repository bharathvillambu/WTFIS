# Backend SQL Steps — Age Buckets & Instagram URL Fix release

This release includes two changes:

1. Cleaner **age filter** on Radar (dropdown with preset buckets like `18–25`, `25–30`, `50+`).
2. **Instagram URL open fix**: bare usernames and unscheme-d URLs are now normalized to full `https://...` links, and the OPEN button opens them in the user's actual browser (Chrome Custom Tabs / SFSafariViewController).

The **client** changes work with the same backend as the previous release. **No new schema changes are strictly required**, but there are a few SQL steps you should verify (and one optional cleanup you may want to run).

---

## Prerequisites

Make sure these are already applied to your Supabase project (from previous releases):

- `supabase/migrations/0001_init.sql` — full initial schema, RLS, RPCs, Storage bucket.
- `supabase/migrations/0002_gender_age_and_relaxed_validation.sql` — `gender` / `birth_date` columns and updated `get_nearby_users(...)` with gender + age filter params.

If either is not applied yet, apply them first (see `docs/BACKEND_UPDATE_GUIDE.md`). The steps below assume `0001` and `0002` are both live.

---

## Step 1 — Verify the schema is what the client expects

Run this in **Supabase → SQL Editor** to confirm both the `profiles` shape and the `get_nearby_users` RPC signature:

```sql
-- 1a. Confirm profiles has gender + birth_date, and the strict Instagram
--     format checks are gone (relaxed as of 0002).
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by column_name;

select conname
from pg_constraint
where conrelid = 'public.profiles'::regclass;

-- 1b. Confirm the current get_nearby_users signature includes gender_filter,
--     min_age, and max_age (added by 0002).
select
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid)     as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_nearby_users';
```

You should see:

- `profiles` with `gender text` and `birth_date date` columns.
- **No** `instagram_username_format` or `instagram_url_format` constraint (they were dropped in `0002`).
- `get_nearby_users` args include `lat, lng, radius_meters, freshness_minutes, gender_filter, min_age, max_age`.

If any of those look wrong, re-apply `0002_gender_age_and_relaxed_validation.sql`.

---

## Step 2 — Quick smoke test of `get_nearby_users`

Confirm the RPC still runs with the new age-bucket parameters that the client will send.

```sql
-- 18-25 bucket, women only, ~5 km around a Bangalore point.
select * from public.get_nearby_users(
  lat => 12.9716,
  lng => 77.5946,
  radius_meters => 5000,
  freshness_minutes => 15,
  gender_filter => 'Female',
  min_age => 18,
  max_age => 25
);

-- "All ages" case (client sends min_age = null and max_age = null).
select * from public.get_nearby_users(
  lat => 12.9716,
  lng => 77.5946,
  radius_meters => 5000,
  freshness_minutes => 15,
  gender_filter => null,
  min_age => null,
  max_age => null
);
```

Both queries should return without errors. Empty result sets are fine — that just means no seeded/opted-in users match the filter yet.

---

## Step 3 (optional) — Backfill / repair stored `instagram_url` values

The client now normalizes bare usernames into full `https://www.instagram.com/<user>/` URLs **before saving**, so all newly-saved profiles will always be openable. Older rows written by earlier releases might still contain a bare username or a URL without a scheme.

Run this **one-time cleanup** to fix any stored links so the OPEN button works for every existing user, not just new ones:

```sql
-- 3a. Prefix a scheme onto rows that look like a URL but forgot https://
update public.profiles
set instagram_url = 'https://' || instagram_url
where instagram_url is not null
  and instagram_url !~* '^https?://'
  and (
    instagram_url ~* '^www\.'
    or instagram_url ~* '\.[a-z]{2,}(/|$)'
  );

-- 3b. Expand bare handles like "0rion_pax_99" or "@0rion_pax_99" into full
--     Instagram profile URLs.
update public.profiles
set instagram_url =
  'https://www.instagram.com/'
  || regexp_replace(instagram_url, '^@', '')
  || '/'
where instagram_url is not null
  and instagram_url !~* '^https?://'
  and instagram_url !~* '\.[a-z]{2,}(/|$)';

-- 3c. Sanity check that no rows are left in a non-openable state.
select id, instagram_username, instagram_url
from public.profiles
where instagram_url is not null
  and instagram_url !~* '^https?://';
-- Expected: 0 rows.
```

You can safely skip Step 3 if this is a fresh project with no user data yet.

---

## Step 4 — Client-side sanity checklist

After the SQL is verified, do a quick end-to-end check in the app:

- [ ] Open Radar → tap the age-range pill → sheet appears with `All ages`, `18 - 25`, `25 - 30`, `30 - 35`, `35 - 40`, `40 - 50`, `50+`.
- [ ] Pick `25 - 30` → list re-filters immediately.
- [ ] Pick `All ages` → filter clears, list shows everyone.
- [ ] Tap any user → **OPEN INSTAGRAM** opens the link in Chrome Custom Tabs / Safari (not the Instagram app hijack, not a "Unable to open link" alert).
- [ ] In Profile / Setup, enter just `0rion_pax_99` in the profile-link field and save → tapping OPEN INSTAGRAM later opens `https://www.instagram.com/0rion_pax_99/`.

No app rebuild is required beyond a normal reload — this release does not add any new native modules.

---

## Rollback

If you need to undo Step 3's URL cleanup (Steps 1 and 2 are read-only, no undo needed):

Take a backup **before** running Step 3:

```sql
create table if not exists public.profiles_url_backup as
select id, instagram_url from public.profiles;
```

To restore later:

```sql
update public.profiles p
set instagram_url = b.instagram_url
from public.profiles_url_backup b
where p.id = b.id;
```

