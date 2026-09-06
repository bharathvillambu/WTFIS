import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { listNotifications } from '@/lib/notifications';
import { NotificationBellIcon } from '@/components/AppIcons';

/** Top-right bell that shows an unread notification count and opens the inbox. */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const { data } = await listNotifications();
    setUnread(data.filter((n) => !n.read_at).length);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <TouchableOpacity style={styles.wrapper} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
      <NotificationBellIcon color={unread > 0 ? '#833AB4' : COLORS.textSecondary} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
});

