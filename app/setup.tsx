import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import {
  buildInstagramUrl,
  isValidInstagramUsername,
  normalizeInstagramUsername,
} from '@/utils/validation';
import { uploadAvatar, upsertMyProfile, setRadarVisibility } from '@/lib/profile';
import { requestLocationPermission, getCurrentLocation } from '@/lib/location';
import { updateMyLocation } from '@/lib/nearbyUsers';

type Step = 'profile' | 'radar';

export default function SetupScreen() {
  const [step, setStep] = useState<Step>('profile');
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [radarEnabled, setRadarEnabled] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
    const cleanUsername = normalizeInstagramUsername(username);
    if (!isValidInstagramUsername(cleanUsername)) {
      Alert.alert(
        'Invalid Instagram username',
        'Please enter a valid Instagram username, e.g. @sneha'
      );
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

    const instagramUrl = buildInstagramUrl(cleanUsername);
    const { error } = await upsertMyProfile({
      instagram_username: cleanUsername,
      instagram_url: instagramUrl,
      avatar_url: avatarUrl,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Could not save profile', error);
      return;
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
          'To appear on Radar, Insta Locator needs your location. You can enable Radar later from Settings.'
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
            trackColor={{ true: '#1fffc9', false: '#233a34' }}
            thumbColor="#04100c"
          />
        </View>
        <Text style={styles.helperText}>
          When enabled, other Insta Locator users nearby can discover your profile. You can
          turn this off anytime.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleFinish} disabled={finishing}>
          {finishing ? (
            <ActivityIndicator color="#00120d" />
          ) : (
            <Text style={styles.buttonText}>Continue to Radar</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set up your profile</Text>

        <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
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

        <TouchableOpacity style={styles.button} onPress={handleSubmitProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#00120d" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#04100c',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#eafff7',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#39ffc4',
    fontWeight: '700',
    fontSize: 16,
  },
  helperText: {
    color: '#7fd9c4',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});

