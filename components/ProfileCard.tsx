import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatApproxDistance } from '@/utils/distance';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import type { NearbyUser } from '@/types/user';

interface ProfileCardProps {
  user: NearbyUser | null;
  onClose: () => void;
}

/** Full-detail popup shown when a user taps a row in the nearby-users list. */
export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  if (!user) return null;

  // The button simply opens whatever URL is stored for this user - no
  // format validation is applied, per product decision to allow any link.
  const handleOpenInstagram = async () => {
    try {
      const supported = await Linking.canOpenURL(user.instagram_url);
      if (supported) {
        await Linking.openURL(user.instagram_url);
      } else {
        Alert.alert('Unable to open link', 'This URL could not be opened.');
      }
    } catch {
      Alert.alert('Unable to open link', 'Something went wrong opening this link.');
    }
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
