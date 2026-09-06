import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';

/**
 * Expo Router looks up an `ErrorBoundary` export in `app/_layout.tsx` and
 * automatically renders it when a screen throws. This is the fallback.
 * Users can retry (which remounts the failing screen) without a full reload.
 */
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong.</Text>
      <Text numberOfLines={4} style={styles.subtitle}>
        {error?.message ?? 'Unknown error'}
      </Text>
      <TouchableOpacity onPress={retry} style={styles.button} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        If this keeps happening, sign out and back in, or contact support.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#833AB4',
  },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  hint: { color: COLORS.textMuted, fontSize: 12, marginTop: 24, textAlign: 'center' },
});

