import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { formatApproxDistance } from '@/utils/distance';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import { normalizeProfileLink } from '@/utils/validation';
import { toggleProfileLike, toggleFavorite } from '@/lib/social';
import OnlineDot from '@/components/OnlineDot';
import type { NearbyUser } from '@/types/user';

interface ProfileCardProps {
  user: NearbyUser | null;
  onClose: () => void;
}

/** Full-detail popup shown when a user taps a row in the nearby-users list. */
export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  if (!user) return null;

  const handleOpenInstagram = async () => {
    const url = normalizeProfileLink(user.instagram_url);
    if (!url) {
      Alert.alert('Unable to open link', 'No profile link is set for this user.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open link', 'This URL could not be opened.');
      }
    } catch {
      Alert.alert('Unable to open link', 'Something went wrong opening this link.');
    }
  };

  const handleLike = async () => {
    const { error } = await toggleProfileLike(user.id);
    if (error) Alert.alert('Like failed', error);
  };

  const handleFavorite = async () => {
    const { error } = await toggleFavorite(user.id);
    if (error) Alert.alert('Favorite failed', error);
  };

  const handleMessage = () => {
    onClose();
    router.push(`/chat/${user.id}`);
  };

  return (
    <Modal transparent animationType="fade" visible={!!user} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>

          <LinearGradient colors={IG_GRADIENT} style={styles.avatarRing}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {user.instagram_username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <OnlineDot online={user.is_online} size={18} />
          </LinearGradient>

          <Text style={styles.username}>@{user.instagram_username}</Text>

          <View style={styles.metaRow}>
            {user.gender && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{user.gender}</Text>
              </View>
            )}
            {user.age != null && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{user.age} yrs</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {formatApproxDistance(user.distance_meters)} away
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <Text style={styles.actionText}>{'\u2665\uFE0E'} Like</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorite} style={styles.actionButton}>
              <Text style={styles.actionText}>{'\u2605\uFE0E'} Favorite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMessage} style={styles.actionButton}>
              <Text style={styles.actionText}>{'\u2709\uFE0E'} Message</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleOpenInstagram} activeOpacity={0.85} style={styles.instagramWrapper}>
            <LinearGradient
              colors={IG_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.instagramButton}
            >
              <Text style={styles.instagramButtonText}>OPEN INSTAGRAM</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 16,
    padding: 6,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
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
    fontSize: 32,
  },
  username: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  metaChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  metaChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  instagramWrapper: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  instagramButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  instagramButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
});
