import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { COLORS } from '@/constants/theme';
import {
  MessagesNavIcon,
  ProfileNavIcon,
  RadarNavIcon,
  SettingsNavIcon,
} from '@/components/AppIcons';

const TABS: {
  label: string;
  href: '/radar' | '/messages' | '/profile' | '/settings';
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { label: 'Radar', Icon: RadarNavIcon, href: '/radar' },
  { label: 'Messages', Icon: MessagesNavIcon, href: '/messages' },
  { label: 'Profile', Icon: ProfileNavIcon, href: '/profile' },
  { label: 'Settings', Icon: SettingsNavIcon, href: '/settings' },
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
            <tab.Icon size={22} color={active ? '#833AB4' : COLORS.textSecondary} />
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
    paddingVertical: 8,
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



