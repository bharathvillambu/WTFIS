# Flick — Backend Changes Required for the Rename

We renamed the product from **Insta Locator** to **Flick** on the client, but
deliberately kept the following technical identifiers unchanged so **no
existing backend infrastructure has to be touched**:

- URL scheme: `instalocator://`
- iOS bundle identifier: `com.instalocator.app`
- Android package: `com.instalocator.app`
- EAS slug: `insta-locator`
- Supabase project ref, DB schema, RPCs: unchanged

This document lists what you **must** change on the backend and what you can
leave alone.

---

## TL;DR

| Change needed | Where | Status |
|---|---|---|
| Nothing to do on Supabase Postgres | — | ✅ No action |
| Nothing to do on Supabase Auth redirect URLs | — | ✅ No action |
| Nothing to do on Supabase Storage | — | ✅ No action |
| Nothing to do on Google Cloud OAuth client | — | ✅ No action |
| Update **Google OAuth consent screen app name** (optional but recommended) | Google Cloud Console | ⚠️ Cosmetic |
| Update **EAS project display name** (optional) | Expo EAS dashboard | ⚠️ Cosmetic |
| Redeploy the app so users see the new branding | EAS Build | ✅ Required to ship |

Everything below expands on each row.

---

## 1. Supabase Postgres — no changes required

All migrations (`0001`, `0002`, `0003`) still apply as-is. The rename is
purely a client-side display change.

If you have already deployed all three migrations, do **nothing**. If you
have not, follow `docs/BACKEND_FULL_REFERENCE.md` end to end — the SQL is
identical, only some SQL header comments now say "Flick" instead of the
old name.

---

## 2. Supabase Auth — no changes required

Because we kept the deep-link scheme `instalocator://`, this entry in
**Supabase → Authentication → URL Configuration → Redirect URLs** stays
correct:

```
instalocator://auth-callback
```

Do not remove or change it. The Google OAuth flow will continue to work.

---

## 3. Supabase Storage — no changes required

The `avatars` bucket and its RLS policies (from `0001_init.sql`) are
unaffected by the rename.

---

## 4. Google Cloud OAuth — no code changes required

The **OAuth Client ID / Secret** entered in Supabase → Auth → Providers →
Google remain valid. Nothing on the OAuth technical side needs updating.

### Optional: update the consent-screen branding

When users tap "Continue with Google", the OAuth consent screen shows the
app name and support email you configured in Google Cloud. That still
says "Insta Locator" until you edit it.

**To update (recommended, purely cosmetic):**

1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Select your OAuth consent screen.
3. Change **App name** from `Insta Locator` to `Flick`.
4. (Optional) Upload a Flick logo where the old one is displayed.
5. Save. The change takes effect immediately for new sign-ins.

This is **not required** for the app to work — only for a consistent
brand experience during Google sign-in.

---

## 5. EAS / Expo — no changes required for functionality

The EAS project ID in `app.json → extra.eas.projectId` remains linked to
your existing project because the slug (`insta-locator`) is unchanged.
All previous builds, credentials, and internal distribution links keep
working.

### Optional: rename the EAS project display name

1. Go to https://expo.dev → your organization → the `insta-locator` project.
2. Project settings → change the display label to **Flick**.
3. Save. The slug and project ID stay the same, so nothing under the
   hood changes.

Again, purely cosmetic.

---

## 6. New build required for users to see the rename

The renamed strings and updated `app.json → name` only reach devices
after a fresh build:

```powershell
# Production / preview build
eas build --profile preview --platform all
```

Or for iterating locally:

```powershell
npx expo start --clear
```

After launching, verify on-device:

- Home-screen app icon label shows **Flick**.
- Google sign-in screen shows the new app name (only if you completed
  the optional Google consent-screen update in section 4).
- Radar header, login disclaimer, permission dialogs, setup, and settings
  all say "Flick".

---

## 7. What is NOT changing (and why that's safe)

| Kept as-is | Why |
|---|---|
| Deep-link scheme `instalocator://` | Changing it would require updating Supabase redirect URL, re-testing OAuth on both platforms, and could break any existing installs. Users never see the scheme string, so keeping it is invisible to them. |
| Bundle ID `com.instalocator.app` | Changing bundle ID means Apple/Google treat it as an entirely different app — new App Store record, new Play Console record, no upgrade path for existing installs, new EAS credentials. Not worth it for a pre-launch rename. |
| EAS slug `insta-locator` | The slug is only used internally by EAS to identify the project. Not user-facing. |
| Supabase table/column/RPC names | Renaming DB objects would break every client query. There is zero user-visible benefit. |
| `AsyncStorage` key `insta-locator:radar-radius` | Existing installs would lose their saved radius on upgrade if renamed. |

---

## 8. If you decide later to fully switch to `flick://` and `com.flick.app`

Do this only if you are prepared to treat it as a **brand-new app**:

1. Register a **new** iOS App Store record for the new bundle ID.
2. Register a **new** Google Play record for the new package.
3. Re-run `eas build:configure` — treat as a fresh EAS project.
4. Add a **new** Supabase Auth Redirect URL `flick://auth-callback`
   (keep the old one for a while for backwards compatibility).
5. Update Google OAuth Authorized redirect URIs (typically no change
   because the Supabase-hosted callback stays the same — only the app's
   internal scheme differs).
6. Publish a **final** "please update to Flick" build under the old
   bundle ID so existing users are prompted to install the new app.

This is a well-known migration pattern; it's just not needed today.

---

## 9. Verification checklist

After deploying the renamed build:

- [ ] App icon on home screen is labeled **Flick**.
- [ ] Splash / login / setup / radar / settings / notifications / chat
      screens all use the name Flick.
- [ ] Google sign-in still redirects back into the app (proves scheme
      compatibility).
- [ ] Radar refresh returns nearby users (proves Supabase RPC + auth token
      still work with the old bundle ID).
- [ ] Sending a message + receiving a notification still works (proves
      new tables and RLS unaffected).
- [ ] Deep-link `instalocator://auth-callback` in Supabase config still
      matches `app.json → scheme`.

