import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { upsertPushToken } from '@/lib/notifications';

/**
 * Registers push token with Supabase on auth state changes.
 * Works with native push services (FCM for Android, APNs for iOS).
 */
export function usePushRegistration() {
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let authSub: any = null;

    const registerToken = async () => {
      try {
        // Skip on simulators/emulators
        if (!Device.isDevice) {
          console.log('Push registration: Skipping on simulator/emulator');
          return;
        }

        // Verify user is authenticated
        try {
          const { data } = await supabase.auth.getSession();
          if (!data?.session) {
            console.log('Push registration: No active session');
            return;
          }
        } catch (authError) {
          console.error('Push registration: Failed to get session:', authError);
          return;
        }

        // Get device-specific push token from native platform
        let token: string | null = null;

        if (Platform.OS === 'android') {
          token = await getPushTokenAndroid();
        } else if (Platform.OS === 'ios') {
          token = await getPushTokenIOS();
        }

        if (cancelledRef.current) return;

        // Skip registration if no token available
        if (!token) {
          console.log('Push registration: No token available for', Platform.OS);
          return;
        }

        // Register token with backend
        try {
          const result = await upsertPushToken(token, Platform.OS);
          if (result.error) {
            console.error('Push registration: Backend error:', result.error);
          } else {
            console.log('Push registration: Token registered successfully');
          }
        } catch (rpcError) {
          console.error('Push registration: Failed to register token:', rpcError);
        }
      } catch (e) {
        console.error('Push registration: Unexpected error:', e);
        // Don't re-throw - this hook should not crash the app
      }
    };

    // Register on mount
    registerToken();

    // Register on auth state changes
    try {
      const { data: subscription } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session && !cancelledRef.current) {
            registerToken();
          }
        }
      );
      authSub = subscription;
    } catch (e) {
      console.error('Push registration: Failed to set up auth listener:', e);
    }

    return () => {
      cancelledRef.current = true;
      try {
        authSub?.unsubscribe?.();
      } catch (e) {
        console.error('Push registration: Error during cleanup:', e);
      }
    };
  }, []);
}

// Placeholder functions - implement with your native push service
async function getPushTokenAndroid(): Promise<string | null> {
  // TODO: Implement Firebase Cloud Messaging integration
  // Example: return await messaging().getToken();
  return null;
}

async function getPushTokenIOS(): Promise<string | null> {
  // TODO: Implement Apple Push Notification integration
  return null;
}

