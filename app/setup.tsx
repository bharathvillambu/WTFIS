import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { buildInstagramUrl, calculateAge } from '@/utils/validation';
import { uploadAvatar, upsertMyProfile, setRadarVisibility } from '@/lib/profile';
import { requestLocationPermission, getCurrentLocation } from '@/lib/location';
import { updateMyLocation } from '@/lib/nearbyUsers';
import { setCachedHasProfile } from '@/lib/settingsStorage';
import { supabase } from '@/lib/supabase';
import GradientButton from '@/components/GradientButton';
import GenderSelect from '@/components/GenderSelect';
import CitySelect from '@/components/CitySelect';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { COLORS, IG_GRADIENT } from '@/constants/theme';
import { MIN_AGE } from '@/constants/config';

type Step = 'profile' | 'radar';

export default function SetupScreen() {
  const [step, setStep] = useState<Step>('profile');
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [urlEdited, setUrlEdited] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [radarEnabled, setRadarEnabled] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (!urlEdited) {
      setProfileUrl(value.trim() ? buildInstagramUrl(value) : '');
    }
  };

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
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSubmitProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a display username.');
      return;
    }
    if (!birthDate) {
      Alert.alert('Date of birth required', 'Please select your date of birth.');
      return;
    }
    if (!city) {
      Alert.alert('City required', 'Please select your city.');
      return;
    }
    if (calculateAge(birthDate) < MIN_AGE) {
      Alert.alert('Age restriction', `You must be at least ${MIN_AGE} years old to use this app.`);
      return;
    }

    setSaving(true);
    let avatarUrl: string | null = null;

    if (avatarUri) {
      const { url, error: uploadError } = await uploadAvatar(avatarUri);
      if (uploadError) {
        setSaving(false);
        Alert.alert('Avatar upload failed', uploadError + ' You can continue without one.');
      } else {
        avatarUrl = url;
      }
    }

    const { error } = await upsertMyProfile({
      instagram_username: username.trim(),
      instagram_url: profileUrl.trim() || buildInstagramUrl(username),
      avatar_url: avatarUrl,
      gender,
      birth_date: birthDate,
      city,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Could not save profile', error);
      return;
    }

    // Cache immediately so an offline relaunch right after setup doesn't
    // misroute back into this wizard (see app/index.tsx for the fallback logic).
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user?.id) {
      await setCachedHasProfile(userData.user.id, true);
    }

    setStep('radar');
  };

  const handleFinish = async () => {
    setFinishing(true);

    if (radarEnabled) {
      const granted = await requestLocationPermission();
      if (!granted) {
        setFinishing(false);
        Alert.alert(
          'Location permission required',
          'To appear on Radar, Flick needs your location. You can enable Radar later from Settings.'
        );
        await setRadarVisibility(false);
        router.replace('/radar');
        return;
      }

      const { coords, error: locError } = await getCurrentLocation();
      if (coords) {
        await updateMyLocation(coords);
      } else if (locError) {
        Alert.alert('Location unavailable', 'We could not get your location right now. You can retry from Radar.');
      }
    }

    const { error } = await setRadarVisibility(radarEnabled);
    setFinishing(false);

    if (error) {
      Alert.alert('Could not save Radar setting', error);
      return;
    }

    router.replace('/radar');
  };

  if (step === 'radar') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Show me on Radar</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{radarEnabled ? 'ON' : 'OFF'}</Text>
          <Switch
            value={radarEnabled}
            onValueChange={setRadarEnabled}
            trackColor={{ true: '#833AB4', false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
        <Text style={styles.helperText}>
          When enabled, other Flick users nearby can discover your profile. You can
          turn this off anytime.
        </Text>

        <GradientButton label="Continue to Radar" onPress={handleFinish} loading={finishing} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set up your profile</Text>

        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarWrapper}>
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
          onChangeText={handleUsernameChange}
        />

        <Text style={styles.label}>Profile link (Open Instagram button)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://instagram.com/yourname or any URL"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={profileUrl}
          onChangeText={(v) => {
            setProfileUrl(v);
            setUrlEdited(true);
          }}
        />

        <Text style={styles.label}>Gender</Text>
        <GenderSelect value={gender} onChange={setGender} />

        <Text style={styles.label}>City</Text>
        <CitySelect value={city} onChange={setCity} placeholder="Select your city" />

        <Text style={styles.label}>Date of birth</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowCalendar(true)}>
          <Text style={birthDate ? styles.dateValue : styles.datePlaceholder}>
            {birthDate ?? 'Select your date of birth'}
          </Text>
        </TouchableOpacity>

        <GradientButton
          label="Continue"
          onPress={handleSubmitProfile}
          loading={saving}
          style={{ marginTop: 32 }}
        />
      </ScrollView>

      <CalendarDatePicker
        visible={showCalendar}
        minAge={MIN_AGE}
        onClose={() => setShowCalendar(false)}
        onConfirm={(iso) => {
          setBirthDate(iso);
          setShowCalendar(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#833AB4',
    fontWeight: '700',
    fontSize: 16,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
