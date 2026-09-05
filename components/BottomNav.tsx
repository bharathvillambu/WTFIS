import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { COLORS } from '@/constants/theme';

const TABS: { label: string; icon: string; href: '/radar' | '/profile' | '/settings' }[] = [
  { label: 'Radar', icon: '◎', href: '/radar' },
  { label: 'Profile', icon: '⌂', href: '/profile' },
  { label: 'Settings', icon: '⚙', href: '/settings' },
];

/** Minimal Instagram-style bottom navigation shared by Radar, Profile, and Settings. */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <TouchableOpacity
            key={tab.href}
            style={styles.tab}
            onPress={() => router.replace(tab.href)}
          >
            <Text style={[styles.icon, active && styles.activeIcon]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  icon: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  activeIcon: {
    color: '#833AB4',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeLabel: {
    color: '#833AB4',
    fontWeight: '700',
  },
});



