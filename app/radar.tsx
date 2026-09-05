import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import RadarView from '@/components/Radar';
import ProfileCard from '@/components/ProfileCard';
import BottomNav from '@/components/BottomNav';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import { getStoredRadius } from '@/lib/settingsStorage';
import type { NearbyUser } from '@/types/user';

export default function RadarScreen() {
  const { users, loading, error, refresh } = useNearbyUsers();
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);

  useFocusEffect(
    useCallback(() => {
      getStoredRadius().then((r) => {
        setRadius(r);
        refresh(r);
      });
    }, [refresh])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>INSTA LOCATOR</Text>
        <Text style={styles.subtitle}>RADAR</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => refresh(radius)}
            tintColor="#39ffc4"
          />
        }
      >
        <RadarView users={users} radiusMeters={radius} onSelectUser={setSelectedUser} />

        {loading && users.length === 0 && (
          <ActivityIndicator color="#39ffc4" style={{ marginTop: 24 }} />
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => refresh(radius)}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && users.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No one nearby yet.</Text>
            <Text style={styles.emptySubtitle}>Invite people to join Insta Locator.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refresh(radius)}
        >
          <Text style={styles.refreshButtonText}>REFRESH RADAR</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProfileCard user={selectedUser} onClose={() => setSelectedUser(null)} />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04100c',
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: {
    color: '#5f8f80',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
  },
  subtitle: {
    color: '#39ffc4',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 4,
    textShadowColor: '#1fffc9',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
  },
  errorBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryText: {
    color: '#39ffc4',
    marginTop: 8,
    fontWeight: '600',
  },
  emptyBox: {
    marginTop: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#eafff7',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#7fd9c4',
    fontSize: 13,
    marginTop: 6,
  },
  refreshButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#39ffc4',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  refreshButtonText: {
    color: '#39ffc4',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
});

