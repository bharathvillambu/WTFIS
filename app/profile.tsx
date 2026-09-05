import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomNav from '@/components/BottomNav';
import { getMyProfile, upsertMyProfile, uploadAvatar } from '@/lib/profile';
import {
  buildInstagramUrl,
  isValidInstagramUsername,
  normalizeInstagramUsername,
} from '@/utils/validation';
import type { Profile } from '@/types/user';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (data) {
        setProfile(data);
        setUsername(data.instagram_username ?? '');
        setAvatarUri(data.avatar_url);
      }
      setLoading(false);
    });
  }, []);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSaving(true);
      const { url, error } = await uploadAvatar(result.assets[0].uri);
      setSaving(false);
      if (error) {
        Alert.alert('Avatar upload failed', error);
        return;
      }
      setAvatarUri(url);
    }
  };

  const handleSave = async () => {
    const cleanUsername = normalizeInstagramUsername(username);
    if (!isValidInstagramUsername(cleanUsername)) {
      Alert.alert(
        'Invalid Instagram username',
        'Please enter a valid Instagram username, e.g. @sneha'
      );
      return;
    }

    setSaving(true);
    const { error } = await upsertMyProfile({
      instagram_username: cleanUsername,
      instagram_url: buildInstagramUrl(cleanUsername),
      avatar_url: avatarUri,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save profile', error);
      return;
    }

    Alert.alert('Saved', 'Your profile has been updated.');
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>PROFILE</Text>

          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} disabled={saving}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholder}>+ Add photo</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Instagram Username</Text>
          <TextInput
            style={styles.input}
            placeholder="@sneha"
            placeholderTextColor="#3f6156"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          {username.length > 0 && (
            <Text style={styles.previewUrl}>
              {buildInstagramUrl(normalizeInstagramUsername(username))}
            </Text>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#00120d" />
            ) : (
              <Text style={styles.buttonText}>Save changes</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.radarStatus}>
            Radar visibility: {profile?.visible_on_radar ? 'ON' : 'OFF'} — manage this in
            Settings.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#04100c',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04100c',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
  },
  title: {
    color: '#39ffc4',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 32,
  },
  avatarPicker: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0e1512',
    borderWidth: 1,
    borderColor: '#1c3630',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    color: '#7fd9c4',
    fontSize: 12,
  },
  label: {
    color: '#7fd9c4',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0e1512',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1c3630',
    color: '#eafff7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  previewUrl: {
    color: '#3f6156',
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#39ffc4',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#00120d',
    fontWeight: '800',
    fontSize: 15,
  },
  radarStatus: {
    color: '#5f8f80',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});

