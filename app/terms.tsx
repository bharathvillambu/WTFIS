import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { APP_NAME } from '@/constants/config';
import { COLORS } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <Section title="Independent app">
          {`${APP_NAME} is an independent application and is not affiliated with, endorsed ` +
            'by, or connected to Instagram or Meta Platforms, Inc. Profile links are ' +
            'provided voluntarily by users as plain external hyperlinks and are not validated.'}
        </Section>

        <Section title="Your responsibilities">
          {'- You must only submit your own profile link.\n' +
            '- You must not impersonate another person.\n' +
            '- You must not use Radar to harass, stalk, or harm other users.\n' +
            '- You must provide an accurate date of birth; this app is restricted to adults.\n' +
            '- You are responsible for the content of your own profile link.'}
        </Section>

        <Section title="Radar visibility is opt-in">
          {'Appearing on Radar is entirely voluntary and can be disabled at any time. Insta ' +
            'Locator never discovers or displays a user who has not explicitly enabled Radar ' +
            'visibility and granted location permission.'}
        </Section>

        <Section title="No warranty">
          {`${APP_NAME} is provided "as is" during this MVP phase without warranty of any kind. ` +
            'Distances shown are approximate and should not be relied upon for precise location ' +
            'information.'}
        </Section>

        <Section title="Account termination">
          {'We may suspend or remove accounts that violate these terms. You may delete your ' +
            'account at any time from Settings.'}
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  backButton: { marginBottom: 24 },
  backText: { color: '#833AB4', fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  updated: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#833AB4', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
});
