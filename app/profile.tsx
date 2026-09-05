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
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '@/components/BottomNav';
import GradientButton from '@/components/GradientButton';
import GenderSelect from '@/components/GenderSelect';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { getMyProfile, upsertMyProfile, uploadAvatar } from '@/lib/profile';
import { buildInstagramUrl, calculateAge } from '@/utils/validation';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import { MIN_AGE } from '@/constants/config';
import type { Profile } from '@/types/user';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (data) {
        setProfile(data);
        setUsername(data.instagram_username ?? '');
        setProfileUrl(data.instagram_url ?? '');
        setGender(data.gender ?? null);
        setBirthDate(data.birth_date ?? null);
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
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a display username.');
      return;
    }
    if (birthDate && calculateAge(birthDate) < MIN_AGE) {
      Alert.alert('Age restriction', `You must be at least ${MIN_AGE} years old to use this app.`);
      return;
    }

    setSaving(true);
    const { error } = await upsertMyProfile({
      instagram_username: username.trim(),
      instagram_url: profileUrl.trim() || buildInstagramUrl(username),
      avatar_url: avatarUri,
      gender,
      birth_date: birthDate,
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
        <ActivityIndicator color="#833AB4" size="large" />
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
          <Text style={styles.title}>Profile</Text>

          <TouchableOpacity onPress={pickAvatar} disabled={saving} activeOpacity={0.85} style={styles.avatarWrapper}>
            <LinearGradient colors={IG_GRADIENT} style={styles.avatarRing}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholderInner}>
                  <Text style={styles.avatarPlaceholder}>+ Add photo</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter any username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Profile link (Open Instagram button)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/yourname or any URL"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={profileUrl}
            onChangeText={setProfileUrl}
          />

          <Text style={styles.label}>Gender</Text>
          <GenderSelect value={gender} onChange={setGender} />

          <Text style={styles.label}>Date of birth</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowCalendar(true)}>
            <Text style={birthDate ? styles.dateValue : styles.datePlaceholder}>
              {birthDate ?? 'Select your date of birth'}
            </Text>
          </TouchableOpacity>

          <GradientButton label="Save changes" onPress={handleSave} loading={saving} style={{ marginTop: 32 }} />

          <Text style={styles.radarStatus}>
            Radar visibility: {profile?.visible_on_radar ? 'ON' : 'OFF'} — manage this in Settings.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <CalendarDatePicker
        visible={showCalendar}
        minAge={MIN_AGE}
        initialDate={birthDate ? new Date(birthDate) : undefined}
        onClose={() => setShowCalendar(false)}
        onConfirm={(iso) => {
          setBirthDate(iso);
          setShowCalendar(false);
        }}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  avatarPlaceholderInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  dateValue: {
    color: COLORS.text,
    fontSize: 15,
  },
  datePlaceholder: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  radarStatus: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
