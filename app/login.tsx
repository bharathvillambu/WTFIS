import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle } from '@/lib/auth';
import { APP_NAME } from '@/constants/config';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert('Sign-in failed', error);
      return;
    }

    // Let the index route decide setup vs radar based on profile state.
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

      <GradientButton label="Continue with Google" onPress={handleGoogleSignIn} loading={loading} style={styles.button} />

      <Text style={styles.disclaimer}>
        Flick is an independent app and is not affiliated with Instagram or Meta.
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
  hero: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
  disclaimer: {
    position: 'absolute',
    bottom: 40,
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
