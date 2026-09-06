import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { listNotifications } from '@/lib/notifications';

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
    <TouchableOpacity style={styles.wrapper} onPress={() => router.push('/notifications')}>
      <Text style={styles.icon}>{'\u2407\uFE0E'}</Text>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
});

