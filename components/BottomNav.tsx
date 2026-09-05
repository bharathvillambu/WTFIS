import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';

const TABS: { label: string; href: '/radar' | '/profile' | '/settings' }[] = [
  { label: 'RADAR', href: '/radar' },
  { label: 'PROFILE', href: '/profile' },
  { label: 'SETTINGS', href: '/settings' },
];

/** Minimal bottom navigation shared by the Radar, Profile, and Settings screens. */
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
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            {active && <View style={styles.activeDot} />}
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
    borderTopColor: '#132420',
    backgroundColor: '#04100c',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    color: '#5f8f80',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeLabel: {
    color: '#39ffc4',
  },
  activeDot: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#39ffc4',
  },
});

