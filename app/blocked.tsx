import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { listMyBlocks, unblockUser } from '@/lib/moderation';
import type { BlockedUser } from '@/types/moderation';

export default function BlockedUsersScreen() {
  const [rows, setRows] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await listMyBlocks();
    setRows(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleUnblock = (u: BlockedUser) => {
    Alert.alert(
      'Unblock user',
      `Unblock @${u.instagram_username ?? 'user'}? They will be able to see and message you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            const { error } = await unblockUser(u.blocked_id);
            if (error) {
              Alert.alert('Could not unblock', error);
              return;
            }
            refresh();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{'\u2039'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Blocked users</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.blocked_id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#833AB4" />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(item.instagram_username ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>@{item.instagram_username ?? 'user'}</Text>
              <Text style={styles.meta}>
                Blocked {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleUnblock(item)} style={styles.unblockBtn}>
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>You haven't blocked anyone.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: { color: '#833AB4', fontWeight: '700', width: 60 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#833AB4', fontWeight: '800' },
  name: { color: COLORS.text, fontWeight: '700' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  unblockBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#833AB4',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unblockText: { color: '#833AB4', fontWeight: '700', fontSize: 12 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 32 },
});

