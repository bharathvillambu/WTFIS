import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { usePresenceHeartbeat } from '@/hooks/usePresence';
import { usePushRegistration } from '@/hooks/usePushRegistration';

// Expo Router picks up `ErrorBoundary` as the fallback UI when any screen throws.
export { default as ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  // Keep our own last_seen_at fresh so peers see us with a green dot.
  usePresenceHeartbeat();
  // Register the device for Expo push notifications on every launch / sign-in.
  usePushRegistration();
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'fade',
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

