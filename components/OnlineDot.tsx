import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/theme';

interface OnlineDotProps {
  /** Show the dot only when true. Returns null otherwise. */
  online?: boolean;
  /** Outer diameter in px. Default 12. */
  size?: number;
  /** Absolute-position the dot at the bottom-right of the parent. Default true. */
  anchor?: boolean;
}

/**
 * Small green "online" indicator. Anchored to the bottom-right of a
 * positioned parent (e.g. an avatar wrapper) by default. Renders nothing
 * when `online` is false/undefined, so it's safe to always mount.
 */
export default function OnlineDot({ online, size = 12, anchor = true }: OnlineDotProps) {
  if (!online) return null;
  const border = Math.max(1.5, size * 0.18);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#22c55e', // green-500
          borderWidth: border,
          borderColor: COLORS.background,
        },
        anchor && styles.anchor,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: -1,
    bottom: -1,
  },
});

