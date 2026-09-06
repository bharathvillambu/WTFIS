import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatApproxDistance } from '@/utils/distance';
import { COLORS, IG_GRADIENT_SHORT } from '@/constants/theme';
import OnlineDot from '@/components/OnlineDot';
import type { NearbyUser } from '@/types/user';

interface UserCardProps {
  user: NearbyUser;
  onPress: () => void;
}

/** Row used in the scrollable nearby-users list below the Radar animation. */
export default function UserCard({ user, onPress }: UserCardProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarWrap}>
        <LinearGradient colors={IG_GRADIENT_SHORT} style={styles.avatarRing}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {user.instagram_username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </LinearGradient>
        <OnlineDot online={user.is_online} size={12} />
      </View>
      <View style={styles.info}>
        <Text style={styles.username}>@{user.instagram_username}</Text>
        <Text style={styles.meta}>
          {[user.gender, user.age ? `${user.age}y` : null, `${formatApproxDistance(user.distance_meters)} away`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    position: 'relative',
  },
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  avatarFallback: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#833AB4',
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: COLORS.textMuted,
    fontSize: 20,
  },
});



