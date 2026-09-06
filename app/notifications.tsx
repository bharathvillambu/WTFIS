import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { NOTIFICATION_TTL_BANNER } from '@/constants/config';
import { listNotifications, markAllNotificationsRead } from '@/lib/notifications';
import type { AppNotification } from '@/types/notification';
import BottomNav from '@/components/BottomNav';

/** Grouped in-app inbox. Rows older than 1 hour are excluded server-side. */
export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await listNotifications();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().then(() => markAllNotificationsRead());
    }, [refresh])
  );

  // Local timer so already-expired items disappear without a refetch.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  const visible = items.filter((n) => new Date(n.expires_at).getTime() > now);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{NOTIFICATION_TTL_BANNER}</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#833AB4" />}
        renderItem={({ item }) => <NotificationRow n={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>You're all caught up.</Text>
            <Text style={styles.emptySub}>New alerts show up here and disappear after 1 hour.</Text>
          </View>
        }
      />
      <BottomNav />
    </View>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const goTarget = () => {
    if (n.kind === 'message' && n.actor_id) router.push(`/chat/${n.actor_id}`);
  };
  return (
    <TouchableOpacity style={styles.row} onPress={goTarget} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{iconFor(n.kind)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{n.body ?? `${n.actor_username ?? 'Someone'} interacted with you`}</Text>
        <Text style={styles.meta}>{timeAgo(n.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function iconFor(kind: string) {
  if (kind === 'message') return '✉';
  if (kind === 'like') return '♥';
  return '★';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
  },
  back: { color: '#833AB4', fontWeight: '700', width: 60 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 18 },
  banner: {
    backgroundColor: '#FEF3F8', borderColor: '#F7C6DA', borderWidth: 1,
    marginHorizontal: 16, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  bannerText: { color: '#833AB4', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  row: {
    flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.card,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { color: '#833AB4', fontSize: 16 },
  body: { color: COLORS.text, fontWeight: '600' },
  meta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 48, gap: 4 },
  emptyTitle: { color: COLORS.text, fontWeight: '700' },
  emptySub: { color: COLORS.textSecondary, fontSize: 12 },
});

