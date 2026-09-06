import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { upsertPushToken } from '@/lib/notifications';

// Show OS-level banners even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

/**
 * Requests permission, obtains an Expo push token, registers it with Supabase,
 * and routes on notification tap. Mount at the root layout.
 */
export function usePushRegistration() {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      if (!Device.isDevice) return; // simulators can't receive pushes
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: '#833AB4',
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const perm = await Notifications.getPermissionsAsync();
      let status = perm.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
      if (!projectId) return;

      try {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (cancelled || !token) return;
        await upsertPushToken(token, Platform.OS);
      } catch (e) {
        // Silently swallow — will retry next launch / auth event.
      }
    };

    register();

    receivedSub.current = Notifications.addNotificationReceivedListener(() => {});
    responseSub.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      const route = (resp.notification.request.content.data as any)?.route as string | undefined;
      if (route) router.push(route as any);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) register();
    });

    return () => {
      cancelled = true;
      receivedSub.current?.remove();
      responseSub.current?.remove();
      authSub.subscription.unsubscribe();
    };
  }, []);
}

