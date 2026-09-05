# Insta Locator (MVP)

A location-based discovery app: users who opt in to **Radar** can see other
consenting nearby Insta Locator users and open their Instagram profile with a
tap. Insta Locator does **not** integrate with Instagram's API — the
Instagram URL is just a plain external link each user adds to their own
profile.

Built with Expo SDK 57, Expo Router, TypeScript, Supabase (Auth + Postgres +
PostGIS + Storage), and `expo-location`.

The UI follows an Instagram-inspired visual theme (see `constants/theme.ts`),
profiles now include **gender** and **date of birth** (picked via a
dependency-free calendar component), and the Radar screen shows nearby
people as a filterable, scrollable list below the radar animation instead
of clustered blips on the dial. Username and profile-link fields are
intentionally free-text with no format validation.

> **Updating an existing backend?** See
> [`docs/BACKEND_UPDATE_GUIDE.md`](docs/BACKEND_UPDATE_GUIDE.md) for the
> exact steps to apply the `0002_gender_age_and_relaxed_validation.sql`
> migration to an already-deployed Supabase project.

---

## Quick start checklist

Do these **in order**. Nothing after step 1 will work until the earlier
steps are done.

- [ ] **1. Install dependencies** — `npm install`
- [ ] **2. Create `.env`** — `copy .env.example .env`, fill in the 3 values
      (see [§4](#4-environment-variables))
- [ ] **3. Run the SQL migration** in your Supabase project
      (see [§5, step 2](#5-supabase-project-setup))
- [ ] **4. Create a Google OAuth Web Client ID** in Google Cloud Console
      (see [§6](#6-google-oauth-setup))
- [ ] **5. Enable the Google provider in Supabase** with that Client ID +
      Secret (see [§6](#6-google-oauth-setup))
- [ ] **6. Add the redirect URL** `instalocator://auth-callback` in
      Supabase → Authentication → URL Configuration
      (see [§5, step 4](#5-supabase-project-setup))
- [ ] **7. Start the app** — `npx expo start` → open in Expo Go
- [ ] **8. Walk through the full flow once** — Google sign-in → profile
      setup → enable Radar → see yourself land on the Radar screen
- [ ] **9. (Optional) Test with 2 devices** — see [§10](#10-testing-with-two-physical-devices)

If anything fails, jump to the matching numbered section below for details,
or check [§11 Known limitations](#11-known-limitations-mvp) /
troubleshooting notes inline in each section.

---

## 1. Project structure

```
app/            Expo Router screens (file-based routing)
  index.tsx     Entry redirect (login / setup / radar)
  login.tsx     Google sign-in
  setup.tsx     Profile creation + Radar opt-in
  radar.tsx     Main Radar screen
  profile.tsx   Edit your own profile
  settings.tsx  Radar visibility, radius, delete account
  privacy.tsx   Privacy Policy
  terms.tsx     Terms of Service
components/     Radar (decorative), UserCard, ProfileCard, BottomNav,
                GenderSelect, AgeRangeFilter, CalendarDatePicker, GradientButton
lib/            supabase.ts, auth.ts, location.ts, nearbyUsers.ts, profile.ts
hooks/          useAuth, useLocation, useNearbyUsers
types/          Shared TypeScript types
utils/          distance formatting, validation/age helpers
constants/      config.ts (env vars, tunables), theme.ts (Instagram theme)
supabase/migrations/0001_init.sql   Full DB schema, RLS, RPCs
supabase/migrations/0002_gender_age_and_relaxed_validation.sql
                Gender/age columns + relaxed validation + updated RPC
docs/BACKEND_UPDATE_GUIDE.md  Step-by-step backend migration guide
```

---

## 2. Prerequisites

* Node.js 18+
* A [Supabase](https://supabase.com) project
* A [Google Cloud](https://console.cloud.google.com) OAuth client
* Expo Go app (for quick device testing) or EAS CLI (for dev/prod builds)

---

## 3. Install & run

This covers checklist steps 1, 2, and 7. Steps 3–6 (Supabase migration +
Google OAuth) must be done first for sign-in to actually work — see
[§5](#5-supabase-project-setup) and [§6](#6-google-oauth-setup).

```powershell
npm install
copy .env.example .env
# then edit .env with your real Supabase URL/anon key (see section 4)

npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press
`a` / `i` in the terminal to open an Android/iOS simulator.

### First run walkthrough (checklist step 8)

Once the app loads, confirm the full flow works end-to-end:

1. **Login screen** appears → tap **Continue with Google** → pick your
   Google account → browser sheet closes automatically.
2. You land on **Profile Setup** → enter an Instagram username (e.g.
   `sneha`) → optionally add a photo → tap **Continue**.
3. **Location permission** prompt appears → allow it.
4. **"Show me on Radar"** toggle appears, default OFF → turn it ON → tap
   **Continue to Radar**.
5. You land on the **Radar** screen and see the animated dial. With only
   one account set up you'll see the **"No one nearby yet."** empty state
   — that's expected and confirms the whole pipeline (auth → profile →
   location → RPC query) is working.

If you get stuck at any step, check the troubleshooting notes in
[§6](#6-google-oauth-setup) (Google OAuth) or [§5](#5-supabase-project-setup)
(migration/RLS errors typically show up as an Alert with the raw Postgres
error message on screen).

---

## 4. Environment variables

Create `.env` (already gitignored) from `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Only the **anon/public** Supabase key ever goes in the client. The service
role key is never used in this app.

---

## 5. Supabase project setup

1. Create a new project at https://supabase.com/dashboard.
2. **Run the migration:** Go to **SQL Editor** → **New query** → paste the
   entire contents of `supabase/migrations/0001_init.sql` → click **Run**.
   You should see "Success. No rows returned." This single migration:
   * Enables the `postgis` extension
   * Creates the `profiles` table (with a `geography(point,4326)` location
     column, spatial index, and `updated_at` trigger)
   * Enables Row Level Security with "select/insert/update/delete own row
     only" policies (no policy ever exposes another user's raw location)
   * Creates `update_my_location(lat, lng)` — lets a user push their own
     location
   * Creates `get_nearby_users(lat, lng, radius_meters, freshness_minutes)`
     — a `SECURITY DEFINER` RPC with a pinned `search_path` that performs the
     PostGIS `ST_DWithin`/`ST_Distance` search and returns **only**
     `id, instagram_username, instagram_url, avatar_url, distance_meters`
     (never raw lat/lng)
   * Creates `delete_my_account()` — deletes the caller's profile + auth
     user, scoped strictly to `auth.uid()`
   * Creates the public `avatars` Storage bucket with per-user folder
     policies (`avatars/<user_id>/avatar.jpg`) so nobody can overwrite
     another user's photo
3. **Copy your API credentials:** Go to **Settings → API** → copy the
   **Project URL** into `EXPO_PUBLIC_SUPABASE_URL` and the **anon / public
   key** into `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
4. **Enable Google sign-in:** Go to **Authentication → Providers → Google**
   → toggle it ON → paste the Client ID + Client Secret from
   [§6](#6-google-oauth-setup).
5. **Add the redirect URL:** Go to **Authentication → URL Configuration →
   Redirect URLs** → add:
   ```
   instalocator://auth-callback
   ```
   This must exactly match the `scheme` in `app.json` (`instalocator`).
   Without this, the sign-in screen will open but never redirect back into
   the app.

---

## 6. Google OAuth setup

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   click **Create Credentials → OAuth client ID**.
   * If this is your first OAuth client in the project, you'll be asked to
     configure the **OAuth consent screen** first — choose **External**,
     fill in an app name/support email, and add your own Google account
     under **Test users** if the app is still in "Testing" publishing
     status.
2. **Application type: Web application.**
3. Under **Authorized redirect URIs**, add your Supabase callback URL:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your actual project ref (visible in
   your Supabase project URL, e.g. `bwntqfadjixfkqdnwghq`).
4. Click **Create**. Copy the **Client ID** and **Client Secret**.
5. Paste both into Supabase → **Authentication → Providers → Google**
   (this is the step that actually makes sign-in work — the
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` value in `.env` is not used by the
   current sign-in flow and is safe to leave as a placeholder).
6. Save. Sign-in should now work end-to-end.

**Troubleshooting:**
* *"redirect_uri_mismatch" error from Google* → the URI in step 3 doesn't
  exactly match your Supabase project's callback URL (check for a trailing
  slash or wrong project ref).
* *Google screen opens, then the app just hangs / never navigates forward*
  → the `instalocator://auth-callback` redirect URL is missing from
  Supabase's **Authentication → URL Configuration** ([§5, step 5](#5-supabase-project-setup)).
* *"Access blocked: this app's request is invalid"* → your OAuth consent
  screen is still in Testing mode and your Google account isn't listed
  under **Test users**.

The app uses Supabase's hosted OAuth flow (`supabase.auth.signInWithOAuth`)
opened in an in-app browser (`expo-web-browser`), so no native Google SDK
is required for the MVP.

---

## 7. Expo configuration highlights (`app.json`)

* `scheme: "instalocator"` — required for the OAuth redirect
  (`instalocator://auth-callback`) and deep linking.
* `plugins`: `expo-router`, `expo-status-bar`, `expo-web-browser`,
  `expo-location` (with a custom permission string), `expo-image-picker`
  (with a custom permission string).
* `android.permissions`: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`
  (foreground only — no background location permission is requested).
* `ios.infoPlist`: `NSLocationWhenInUseUsageDescription`,
  `NSPhotoLibraryUsageDescription`.

---

## 8. Android — development & build

**Development (Expo Go or dev client):**

```powershell
npx expo start --android
```

**Native prebuild + local run** (needed once you add more native modules or
want a real dev client):

```powershell
npx expo prebuild --platform android
npx expo run:android
```

**Production build via EAS:**

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

---

## 9. iOS — development & build

**Development (Expo Go or dev client, requires macOS for `run:ios` or use
EAS Build from any OS):**

```powershell
npx expo start --ios   # only works from macOS with Xcode installed
```

**Production/dev-client build via EAS (works from Windows too):**

```powershell
eas build --platform ios --profile preview
```

You'll need an Apple Developer account for device builds/TestFlight.

---

## 10. Testing with two physical devices

1. Install the app (Expo Go, or your EAS dev/preview build) on **Device A**
   and **Device B**.
2. **Device A:** Sign in with Google → complete profile setup with a real
   Instagram username → enable **Show me on Radar** → grant location
   permission.
3. **Device B:** Repeat the same steps with a different Google account.
4. Make sure both devices report a location within the configured radius
   (default 1km) of each other — e.g. connect to the same Wi-Fi/location,
   or use a simulated GPS location in range.
5. Open **Radar** on both devices (pull to refresh or tap "Refresh Radar").
   * Device A should see Device B's username + approximate distance.
   * Device B should see Device A's username + approximate distance.
6. Tap the other user's blip → **Profile Card** → **Open Instagram** →
   confirm it opens their Instagram profile in the browser/app.
7. On Device A, go to **Settings** → turn **Show me on Radar** OFF →
   refresh Radar on Device B → Device A should disappear from Device B's
   results.
8. Leave Device A's Radar closed beyond the freshness window (default 15
   minutes, configurable via `LOCATION_FRESHNESS_MINUTES` in
   `constants/config.ts` and the `freshness_minutes` param of
   `get_nearby_users`) → Device A should no longer appear for Device B even
   if visibility is back ON, until its location is refreshed again.

---

## 11. Known limitations (MVP)

* Radar position on-screen is a stylized placement (angle derived from user
  id, radius scaled by distance) — it is **not** a true compass bearing,
  since we deliberately never expose exact coordinates or bearing to the
  client, only rounded distance.
* No push notifications, chat, or real-time presence — Radar is
  pull-to-refresh only, by design (see spec).
* Google Sign-In uses Supabase's hosted web OAuth flow via an in-app
  browser rather than the native Google Sign-In SDK; this is simpler for an
  MVP but shows a browser sheet instead of a fully native picker.
* No automated test suite yet — testing steps above are manual.
* Avatar upload always writes to a fixed `avatar.jpg` path per user, so
  only one avatar per user is supported at a time.
* Account deletion via `delete_my_account()` requires the function's owner
  role (default `postgres` in the SQL editor) to have privileges on
  `auth.users`; if you run migrations under a restricted role, verify this
  RPC actually removes the auth user in your project.

## 12. Recommended next features (P2+)

* Native Google Sign-In (expo-auth-session Google provider / native module)
  for a fully native consent screen.
* Configurable radius picker synced to the RPC (`radius_meters` param is
  already wired end-to-end; UI in Settings persists it locally).
* Block/report user.
* Rate limiting on `update_my_location` / `get_nearby_users` at the DB or
  edge-function level.
* Push notifications (opt-in) for "someone new is nearby."
* Multi-photo profile support.
* Localized/multi-language UI.

