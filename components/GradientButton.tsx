import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IG_GRADIENT } from '@/constants/theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  outline?: boolean;
}

/** Instagram-gradient action button used across auth/setup/profile screens. */
export default function GradientButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  outline,
}: GradientButtonProps) {
  if (outline) {
    return (
      <TouchableOpacity
        style={[styles.outline, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#833AB4" />
        ) : (
          <Text style={styles.outlineText}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.wrapper, (disabled || loading) && styles.disabled, style]}
    >
      <LinearGradient
        colors={IG_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: '#833AB4',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: '#833AB4',
    fontWeight: '700',
    fontSize: 15,
  },
});

