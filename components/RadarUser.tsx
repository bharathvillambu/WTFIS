import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { formatApproxDistance } from '@/utils/distance';
import type { NearbyUser } from '@/types/user';

interface RadarUserPointProps {
  user: NearbyUser;
  x: number;
  y: number;
  onPress: () => void;
}

/** A single blip on the Radar screen, positioned absolutely by x/y. */
export default function RadarUserPoint({ user, x, y, onPress }: RadarUserPointProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { left: x - 22, top: y - 22 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.dotWrapper}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>
              {user.instagram_username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.username} numberOfLines={1}>
        @{user.instagram_username}
      </Text>
      <Text style={styles.distance}>{formatApproxDistance(user.distance_meters)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  dotWrapper: {
    shadowColor: '#39ffc4',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#39ffc4',
  },
  avatarFallback: {
    backgroundColor: '#0d2b28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#39ffc4',
    fontWeight: '700',
    fontSize: 14,
  },
  username: {
    marginTop: 2,
    color: '#c9fff0',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },
  distance: {
    color: '#39ffc4',
    fontSize: 10,
    opacity: 0.85,
  },
});

