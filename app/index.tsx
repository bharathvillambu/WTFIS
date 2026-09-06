import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getMyProfile } from '@/lib/profile';
import { getCachedHasProfile, setCachedHasProfile } from '@/lib/settingsStorage';
import { COLORS } from '@/constants/theme';

/**
 * Entry route. Decides where to send the user based on auth + profile
 * state, per the spec:
 *   not signed in         -> /login
 *   signed in, no profile -> /setup
 *   signed in, has profile -> /radar
 *
 * Auth state is read from a locally persisted session, so it works offline.
 * The profile check, however, requires a network round-trip. If that call
 * fails (e.g. no internet), we fall back to the last *confirmed* result
 * cached on-device instead of assuming "no profile" — otherwise a returning
 * user who opens the app offline would get bounced back into the Setup
 * wizard every time, which is exactly the bug this fixes.
 */
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [offlineNoCache, setOfflineNoCache] = useState(false);

  const runCheck = useCallback(async () => {
    setOfflineNoCache(false);
    if (!user) {
      setProfileChecked(true);
      return;
    }

    const { data, error } = await getMyProfile();

    if (!error) {
      // Authoritative result — cache it for future offline launches.
      const confirmed = !!data?.instagram_url;
      setHasProfile(confirmed);
      await setCachedHasProfile(user.id, confirmed);
      setProfileChecked(true);
      return;
    }

    // Network/query failed — fall back to the last known-good result
    // instead of guessing "no profile".
    const cached = await getCachedHasProfile(user.id);
    if (cached !== null) {
      setHasProfile(cached);
      setProfileChecked(true);
    } else {
      // First-ever launch with no connectivity and nothing cached yet —
      // we genuinely don't know. Show a retry screen rather than forcing
      // either route.
      setOfflineNoCache(true);
      setProfileChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    setProfileChecked(false);
    runCheck().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [authLoading, runCheck]);

  if (authLoading || !profileChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#833AB4" size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  if (offlineNoCache) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineTitle}>You're offline</Text>
        <Text style={styles.offlineSubtitle}>
          Connect to the internet to continue — we need to check your profile
          the first time.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setProfileChecked(false);
            runCheck();
          }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasProfile) return <Redirect href="/setup" />;
  return <Redirect href="/radar" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  offlineSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#833AB4',
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
