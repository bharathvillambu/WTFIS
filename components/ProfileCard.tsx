import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { formatApproxDistance } from '@/utils/distance';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import { normalizeProfileLink } from '@/utils/validation';
import { toggleProfileLike, toggleFavorite, getRelationshipFlags } from '@/lib/social';
import OnlineDot from '@/components/OnlineDot';
import { HeartIcon, StarIcon, MessageIcon } from '@/components/AppIcons';
import type { NearbyUser } from '@/types/user';

interface ProfileCardProps {
  user: NearbyUser | null;
  onClose: () => void;
}

// Active colors for the toggle actions.
const LIKE_ACTIVE_COLOR = '#EF4444';    // red-500
const FAVORITE_ACTIVE_COLOR = '#F5C518'; // gold/yellow
const IDLE_ICON_COLOR = COLORS.textSecondary;

/** Full-detail popup shown when a user taps a row in the nearby-users list. */
export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState<{ like: boolean; fav: boolean }>({ like: false, fav: false });

  // Load current relationship flags whenever the popup opens for a new user.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLiked(false);
      setFavorited(false);
      return;
    }
    getRelationshipFlags(user.id).then((flags) => {
      if (cancelled) return;
      setLiked(flags.liked);
      setFavorited(flags.favorited);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    if (busy.like) return;
    // Optimistic flip so the icon reacts instantly; server call reconciles.
    const next = !liked;
    setLiked(next);
    setBusy((b) => ({ ...b, like: true }));
    const { liked: serverLiked, error } = await toggleProfileLike(user.id);
    setBusy((b) => ({ ...b, like: false }));
    if (error) {
      setLiked(!next); // rollback
      Alert.alert('Like failed', error);
    } else {
      setLiked(serverLiked);
    }
  };

  const handleFavorite = async () => {
    if (busy.fav) return;
    const next = !favorited;
    setFavorited(next);
    setBusy((b) => ({ ...b, fav: true }));
    const { favorited: serverFav, error } = await toggleFavorite(user.id);
    setBusy((b) => ({ ...b, fav: false }));
    if (error) {
      setFavorited(!next); // rollback
      Alert.alert('Favorite failed', error);
    } else {
      setFavorited(serverFav);
    }
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
            <TouchableOpacity
              onPress={handleLike}
              disabled={busy.like}
              activeOpacity={0.7}
              style={[styles.actionButton, liked && styles.actionButtonLiked]}
              accessibilityRole="button"
              accessibilityState={{ selected: liked }}
              accessibilityLabel={liked ? 'Unlike profile' : 'Like profile'}
            >
              <HeartIcon
                size={22}
                filled={liked}
                color={liked ? LIKE_ACTIVE_COLOR : IDLE_ICON_COLOR}
              />
              <Text style={[styles.actionText, liked && { color: LIKE_ACTIVE_COLOR }]}>Like</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFavorite}
              disabled={busy.fav}
              activeOpacity={0.7}
              style={[styles.actionButton, favorited && styles.actionButtonFavorited]}
              accessibilityRole="button"
              accessibilityState={{ selected: favorited }}
              accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <StarIcon
                size={22}
                filled={favorited}
                color={favorited ? FAVORITE_ACTIVE_COLOR : IDLE_ICON_COLOR}
              />
              <Text style={[styles.actionText, favorited && { color: FAVORITE_ACTIVE_COLOR }]}>
                Favorite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMessage}
              activeOpacity={0.7}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Send a message"
            >
              <MessageIcon size={22} color={IDLE_ICON_COLOR} />
              <Text style={styles.actionText}>Message</Text>
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
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  actionButtonLiked: {
    borderColor: LIKE_ACTIVE_COLOR,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionButtonFavorited: {
    borderColor: FAVORITE_ACTIVE_COLOR,
    backgroundColor: 'rgba(245, 197, 24, 0.10)',
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
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
