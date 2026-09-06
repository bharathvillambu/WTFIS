import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { pingPresence } from '@/lib/presence';
import { supabase } from '@/lib/supabase';

const HEARTBEAT_MS = 60_000; // 60s

/**
 * Keeps the current user's `profiles.last_seen_at` fresh so other clients
 * can render an "online" green dot. Pings on mount, when the app comes
 * back to foreground, and every 60 seconds while active.
 *
 * No-op when there is no signed-in session yet.
 */
export function usePresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const ping = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      pingPresence();
    };

    ping();
    interval = setInterval(ping, HEARTBEAT_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') ping();
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) ping();
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, []);
}

