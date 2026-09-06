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
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data?.session) {
          console.log('Presence: No active session');
          return;
        }

        try {
          const result = await pingPresence();
          if (result.error) {
            console.error('Presence ping error:', result.error);
          }
        } catch (err) {
          console.error('Presence ping failed:', err);
        }
      } catch (err) {
        console.error('Presence heartbeat error:', err);
        // Don't re-throw - let the app continue
      }
    };

    // Initial ping
    ping();

    // Heartbeat interval
    interval = setInterval(() => {
      try {
        ping();
      } catch (err) {
        console.error('Presence interval ping error:', err);
      }
    }, HEARTBEAT_MS);

    // Listener for app state changes
    let appStateSubscription: any = null;
    try {
      appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active') {
          try {
            ping();
          } catch (err) {
            console.error('Presence app state ping error:', err);
          }
        }
      });
    } catch (err) {
      console.error('Failed to add app state listener:', err);
    }

    // Auth state listener
    let authSubscription: any = null;
    try {
      const { data: subscription } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session) {
            try {
              ping();
            } catch (err) {
              console.error('Presence auth change ping error:', err);
            }
          }
        }
      );
      authSubscription = subscription;
    } catch (err) {
      console.error('Failed to set up auth listener:', err);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      try {
        appStateSubscription?.remove?.();
      } catch (err) {
        console.error('Error removing app state listener:', err);
      }
      try {
        authSubscription?.unsubscribe?.();
      } catch (err) {
        console.error('Error unsubscribing from auth:', err);
      }
    };
  }, []);
}

