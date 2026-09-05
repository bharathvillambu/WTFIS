import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { APP_NAME } from '@/constants/config';

export default function PrivacyScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <Section title="What we collect">
          {`${APP_NAME} collects only what is required to run Radar:\n\n` +
            '• Your Google account email (for authentication)\n' +
            '• The Instagram username/URL you choose to add\n' +
            '• An optional profile photo you upload\n' +
            '• Your approximate location, only while Radar is open and only if you have enabled "Show me on Radar"'}
        </Section>

        <Section title="What we do NOT collect">
          {'• Instagram passwords or account access\n' +
            '• Your contacts\n' +
            '• Background location (we never track you when the app is closed)\n' +
            '• Any data from Instagram\'s systems — we are not affiliated with Instagram or Meta'}
        </Section>

        <Section title="How location is used">
          {'Your location is stored as a single point and is only used to compute an ' +
            'approximate distance to other consenting nearby users. Other users never see ' +
            'your exact coordinates — only a rounded distance (e.g. "~250m"). Locations older ' +
            'than a configurable freshness window are automatically excluded from Radar results.'}
        </Section>

        <Section title="Your controls">
          {'You can turn off Radar visibility at any time from Settings, which immediately ' +
            'removes you from other users\' Radar results. You can also permanently delete your ' +
            'account and all associated data from Settings → Delete Account.'}
        </Section>

        <Section title="Data sharing">
          {'We do not sell or share your data with third parties. Data is stored securely in ' +
            'our Supabase-hosted PostgreSQL database, protected by row-level security so that ' +
            'no other user can directly query your raw location.'}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04100c' },
  container: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  backButton: { marginBottom: 24 },
  backText: { color: '#39ffc4', fontSize: 14, fontWeight: '600' },
  title: { color: '#eafff7', fontSize: 24, fontWeight: '800' },
  updated: { color: '#5f8f80', fontSize: 12, marginTop: 6, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#39ffc4', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody: { color: '#c9e9df', fontSize: 13, lineHeight: 20 },
});

