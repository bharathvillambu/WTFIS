import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Signs the user in with Google via Supabase Auth's OAuth flow.
 *
 * Flow:
 * 1. Ask Supabase for a Google authorization URL (redirects back to our
 *    app's custom scheme, e.g. `instalocator://auth-callback`).
 * 2. Open that URL in an in-app browser session.
 * 3. When Google redirects back, extract the access/refresh tokens from
 *    the callback URL and hand them to Supabase to establish a session.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const redirectTo = Linking.createURL('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return { error: error?.message ?? 'Could not start Google sign-in.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: null }; // user cancelled, not a real error
    }
    return { error: 'Google sign-in was interrupted. Please try again.' };
  }

  return await applySessionFromUrl(result.url);
}

async function applySessionFromUrl(url: string): Promise<{ error: string | null }> {
  try {
    const parsed = new URL(url.replace('#', '?'));
    const accessToken = parsed.searchParams.get('access_token');
    const refreshToken = parsed.searchParams.get('refresh_token');
    const errorDescription = parsed.searchParams.get('error_description');

    if (errorDescription) {
      return { error: errorDescription };
    }

    if (!accessToken || !refreshToken) {
      return { error: 'Sign-in did not return a valid session. Please try again.' };
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: 'Failed to complete sign-in. Please try again.' };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

