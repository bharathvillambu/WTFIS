import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import BottomNav from '@/components/BottomNav';
import { getMyProfile, setRadarVisibility, deleteMyAccount } from '@/lib/profile';
import { signOut } from '@/lib/auth';
import { getStoredRadius, setStoredRadius } from '@/lib/settingsStorage';
import { RADIUS_OPTIONS_METERS, DEFAULT_RADIUS_METERS } from '@/constants/config';

export default function SettingsScreen() {
  const [visible, setVisible] = useState(false);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (data) setVisible(data.visible_on_radar);
      setLoading(false);
    });
    getStoredRadius().then(setRadius);
  }, []);

  const handleToggleRadar = async (value: boolean) => {
    setVisible(value);
    setBusy(true);
    const { error } = await setRadarVisibility(value);
    setBusy(false);
    if (error) {
      setVisible(!value);
      Alert.alert('Could not update Radar visibility', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your profile, avatar, and account. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await deleteMyAccount();
            setBusy(false);
            if (error) {
              Alert.alert('Could not delete account', error);
              return;
            }
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#39ffc4" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>SETTINGS</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Show me on Radar</Text>
            <Switch
              value={visible}
              onValueChange={handleToggleRadar}
              disabled={busy}
              trackColor={{ true: '#1fffc9', false: '#233a34' }}
              thumbColor="#04100c"
            />
          </View>
          <Text style={styles.helperText}>
            When enabled, your approximate location is used to help nearby Insta Locator
            users discover your profile. You can turn this off anytime.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.rowLabel}>Radar radius</Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS_METERS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
                onPress={() => {
                  setRadius(r);
                  setStoredRadius(r);
                }}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    radius === r && styles.radiusChipTextActive,
                  ]}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>Terms</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={busy}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04100c' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04100c',
  },
  container: { flexGrow: 1, padding: 24, paddingTop: 56 },
  title: {
    color: '#39ffc4',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    backgroundColor: '#0e1512',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c3630',
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#eafff7',
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    color: '#7fd9c4',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  radiusChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1c3630',
  },
  radiusChipActive: {
    backgroundColor: '#39ffc4',
    borderColor: '#39ffc4',
  },
  radiusChipText: {
    color: '#7fd9c4',
    fontSize: 12,
    fontWeight: '600',
  },
  radiusChipTextActive: {
    color: '#00120d',
  },
  linkRow: {
    paddingVertical: 12,
  },
  linkText: {
    color: '#eafff7',
    fontSize: 14,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#39ffc4',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    color: '#39ffc4',
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
  },
  deleteText: {
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: 13,
  },
});

