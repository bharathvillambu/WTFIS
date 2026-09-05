import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithGoogle } from '@/lib/auth';
import { APP_NAME } from '@/constants/config';

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
        <Text style={styles.title}>{APP_NAME.toUpperCase()}</Text>
        <Text style={styles.subtitle}>Discover Instagram users nearby.</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#00120d" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Insta Locator is an independent app and is not affiliated with Instagram or Meta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04100c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 64,
  },
  title: {
    color: '#39ffc4',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
    textShadowColor: '#1fffc9',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: '#7fd9c4',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#39ffc4',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#00120d',
    fontWeight: '800',
    fontSize: 15,
  },
  disclaimer: {
    position: 'absolute',
    bottom: 40,
    color: '#3f6156',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

