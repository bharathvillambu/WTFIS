import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { formatApproxDistance } from '@/utils/distance';
import type { NearbyUser } from '@/types/user';

interface UserCardProps {
  user: NearbyUser;
  onPress: () => void;
}

/** Compact row used in list-style fallbacks (e.g. below the radar dial). */
export default function UserCard({ user, onPress }: UserCardProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>
            {user.instagram_username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username}>@{user.instagram_username}</Text>
        <Text style={styles.distance}>{formatApproxDistance(user.distance_meters)} away</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0e1512',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1c3630',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: '#132420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#39ffc4',
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    marginLeft: 12,
  },
  username: {
    color: '#eafff7',
    fontSize: 15,
    fontWeight: '600',
  },
  distance: {
    color: '#7fd9c4',
    fontSize: 12,
    marginTop: 2,
  },
});

