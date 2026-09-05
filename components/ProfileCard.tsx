import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image, Linking, Alert } from 'react-native';
import { formatApproxDistance } from '@/utils/distance';
import type { NearbyUser } from '@/types/user';

interface ProfileCardProps {
  user: NearbyUser | null;
  onClose: () => void;
}

/** Modal shown when a user taps a Radar blip / list row. */
export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  if (!user) return null;

  const handleOpenInstagram = async () => {
    try {
      const supported = await Linking.canOpenURL(user.instagram_url);
      if (supported) {
        await Linking.openURL(user.instagram_url);
      } else {
        Alert.alert('Unable to open link', 'This Instagram URL could not be opened.');
      }
    } catch {
      Alert.alert('Unable to open link', 'Something went wrong opening Instagram.');
    }
  };

  return (
    <Modal transparent animationType="fade" visible={!!user} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {user.instagram_username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.username}>@{user.instagram_username}</Text>
          <Text style={styles.distance}>
            {formatApproxDistance(user.distance_meters)} away
          </Text>

          <TouchableOpacity style={styles.instagramButton} onPress={handleOpenInstagram}>
            <Text style={styles.instagramButtonText}>OPEN INSTAGRAM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#0b1512',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1fffc9',
    shadowColor: '#1fffc9',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 16,
    padding: 6,
  },
  closeText: {
    color: '#7fd9c4',
    fontSize: 18,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#39ffc4',
    marginBottom: 16,
  },
  avatarFallback: {
    backgroundColor: '#132420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#39ffc4',
    fontWeight: '700',
    fontSize: 32,
  },
  username: {
    color: '#eafff7',
    fontSize: 20,
    fontWeight: '700',
  },
  distance: {
    color: '#7fd9c4',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  instagramButton: {
    backgroundColor: '#39ffc4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  instagramButtonText: {
    color: '#00120d',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
});

