import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import RadarView from '@/components/Radar';
import ProfileCard from '@/components/ProfileCard';
import BottomNav from '@/components/BottomNav';
import UserCard from '@/components/UserCard';
import GenderSelect from '@/components/GenderSelect';
import AgeRangeFilter from '@/components/AgeRangeFilter';
import NotificationBell from '@/components/NotificationBell';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { APP_NAME, DEFAULT_AGE_RANGE, DEFAULT_RADIUS_METERS, USERS_PAGE_SIZE } from '@/constants/config';
import { COLORS } from '@/constants/theme';
import { getStoredRadius } from '@/lib/settingsStorage';
import type { NearbyUser } from '@/types/user';

export default function RadarScreen() {
  const { users, loading, error, refresh } = useNearbyUsers();
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);
  const [genderFilter, setGenderFilter] = useState('All');
  const [ageRange, setAgeRange] = useState<[number, number] | null>(DEFAULT_AGE_RANGE);
  const [visibleCount, setVisibleCount] = useState(USERS_PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      getStoredRadius().then((r) => {
        setRadius(r);
        refresh(r);
      });
    }, [refresh])
  );

  // Client-side filtering keeps the list snappy while typing/tapping filters,
  // and gracefully falls back to "include" when a field isn't set yet.
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const genderOk = genderFilter === 'All' || !u.gender || u.gender === genderFilter;
      const ageOk =
        ageRange === null || u.age == null || (u.age >= ageRange[0] && u.age <= ageRange[1]);
      return genderOk && ageOk;
    });
  }, [users, genderFilter, ageRange]);

  const bufferedUsers = filteredUsers.slice(0, visibleCount);

  const handleEndReached = () => {
    if (visibleCount < filteredUsers.length) {
      setVisibleCount((c) => Math.min(c + USERS_PAGE_SIZE, filteredUsers.length));
    }
  };

  const handleRefresh = () => {
    setVisibleCount(USERS_PAGE_SIZE);
    refresh(radius);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Flick</Text>
          <Text style={styles.subtitle}>Radar</Text>
        </View>
        <NotificationBell />
      </View>

      <FlatList<NearbyUser>
        data={bufferedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserCard user={item} onPress={() => setSelectedUser(item)} />}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={handleEndReached}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor="#833AB4" />
        }
        ListHeaderComponent={
          <View>
            <RadarView userCount={filteredUsers.length} />

            <View style={styles.filterBar}>
              <Text style={styles.filterLabel}>Gender</Text>
              <GenderSelect value={genderFilter} onChange={setGenderFilter} includeAllOption />
              <AgeRangeFilter range={ageRange} onChange={setAgeRange} />
            </View>

            {loading && users.length === 0 && (
              <ActivityIndicator color="#833AB4" style={{ marginTop: 24 }} />
            )}

            {!loading && error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={handleRefresh}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && filteredUsers.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No one nearby yet.</Text>
                <Text style={styles.emptySubtitle}>
                  Try widening your filters or invite people to join {APP_NAME}.
                </Text>
              </View>
            )}

            {filteredUsers.length > 0 && <Text style={styles.listTitle}>Nearby</Text>}
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>REFRESH RADAR</Text>
          </TouchableOpacity>
        }
      />

      <ProfileCard user={selectedUser} onClose={() => setSelectedUser(null)} />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  filterBar: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  filterLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  errorBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryText: {
    color: '#833AB4',
    marginTop: 8,
    fontWeight: '600',
  },
  emptyBox: {
    marginTop: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  refreshButton: {
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#833AB4',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#833AB4',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
});
