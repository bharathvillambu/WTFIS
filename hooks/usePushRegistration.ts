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

    const registerToken = async () => {
      // Skip on simulators/emulators
      if (!Device.isDevice) return;

      // Verify user is authenticated
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      try {
        // Get device-specific push token from native platform
        let token: string | null = null;

        if (Platform.OS === 'android') {
          // For Android, you'll need to use Firebase Cloud Messaging
          // This is a placeholder - implement with your FCM integration
          token = await getPushTokenAndroid();
        } else if (Platform.OS === 'ios') {
          // For iOS, you'll need to use Apple Push Notification service
          // This is a placeholder - implement with your APNs integration
          token = await getPushTokenIOS();
        }

        if (cancelledRef.current || !token) return;

        await upsertPushToken(token, Platform.OS);
      } catch (e) {
        console.error('Push token registration failed:', e);
        // Silently swallow — will retry on next auth change or app launch
      }
    };

    // Register on mount and when auth state changes
    registerToken();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        registerToken();
      }
    });

    return () => {
      cancelledRef.current = true;
      authSub?.subscription.unsubscribe();
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

