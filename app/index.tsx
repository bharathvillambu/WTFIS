import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getMyProfile } from '@/lib/profile';
import { COLORS } from '@/constants/theme';

/**
 * Entry route. Decides where to send the user based on auth + profile
 * state, per the spec:
 *   not signed in       -> /login
 *   signed in, no profile -> /setup
 *   signed in, has profile -> /radar
 */
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfileChecked(true);
      return;
    }

    let mounted = true;
    getMyProfile().then(({ data }) => {
      if (!mounted) return;
      setHasProfile(!!data?.instagram_url);
      setProfileChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  if (authLoading || !profileChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#833AB4" size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!hasProfile) return <Redirect href="/setup" />;
  return <Redirect href="/radar" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

