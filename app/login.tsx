import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle } from '@/lib/auth';
import { APP_NAME, PRIVACY_URL, TERMS_URL, MIN_AGE } from '@/constants/config';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';
import { getAgeAccepted, setAgeAccepted } from '@/lib/settingsStorage';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    getAgeAccepted().then(setAccepted);
  }, []);

  const toggleAccepted = async () => {
    const next = !accepted;
    setAccepted(next);
    await setAgeAccepted(next);
  };

  const handleGoogleSignIn = async () => {
    if (!accepted) {
      Alert.alert(
        `You must be ${MIN_AGE}+`,
        `Please confirm you are at least ${MIN_AGE} years old and agree to our Terms and Privacy Policy before continuing.`
      );
      return;
    }
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert('Sign-in failed', error);
      return;
    }
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <LinearGradient colors={IG_GRADIENT} style={styles.logoRing}>
          <View style={styles.logoInner} />
        </LinearGradient>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Discover Instagram users nearby.</Text>
      </View>

      <TouchableOpacity onPress={toggleAccepted} activeOpacity={0.85} style={styles.acceptRow}>
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </View>
        <Text style={styles.acceptText}>
          I confirm I am {MIN_AGE}+ and agree to the{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
        </Text>
      </TouchableOpacity>

      <GradientButton
        label="Continue with Google"
        onPress={handleGoogleSignIn}
        loading={loading}
        disabled={!accepted}
        style={styles.button}
      />

      <Text style={styles.disclaimer}>
        {APP_NAME} is an independent app and is not affiliated with Instagram or Meta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hero: { alignItems: 'center', marginBottom: 48 },
  logoRing: {
    width: 84, height: 84, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoInner: {
    width: 64, height: 64, borderRadius: 16,
    borderWidth: 3, borderColor: COLORS.white,
  },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '800' },
  subtitle: {
    color: COLORS.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center',
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: '#833AB4', borderColor: '#833AB4' },
  checkmark: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  acceptText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  link: { color: '#833AB4', fontWeight: '700' },
  button: { width: '100%' },
  disclaimer: {
    position: 'absolute',
    bottom: 40,
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
