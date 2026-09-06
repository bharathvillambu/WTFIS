import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/theme';
import { reportUser } from '@/lib/moderation';
import { REPORT_REASONS, type ReportReason } from '@/types/moderation';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername?: string | null;
  context?: string;
  onDone?: () => void;
}

/** Modal that lets a user submit a moderation report on someone. */
export default function ReportUserModal({
  visible,
  onClose,
  targetUserId,
  targetUsername,
  context,
  onDone,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setBusy(false);
  };

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Choose a reason', 'Please select a reason to continue.');
      return;
    }
    setBusy(true);
    const { error } = await reportUser(targetUserId, reason, details.trim() || undefined, context);
    setBusy(false);
    if (error) {
      Alert.alert('Report failed', error);
      return;
    }
    Alert.alert('Thank you', 'Your report was submitted. Our team will review it.');
    reset();
    onDone?.();
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            Report {targetUsername ? `@${targetUsername}` : 'user'}
          </Text>
          <Text style={styles.subtitle}>
            Choose the option that best describes the problem. Your report is
            confidential.
          </Text>

          {REPORT_REASONS.map((r) => {
            const active = reason === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setReason(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}

          <TextInput
            style={styles.input}
            placeholder="Add any extra detail (optional)"
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={details}
            onChangeText={setDetails}
            maxLength={500}
          />

          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, (!reason || busy) && { opacity: 0.5 }]}
              disabled={!reason || busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
  },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 16,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionActive: { backgroundColor: '#833AB4', borderColor: '#833AB4' },
  optionText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  optionTextActive: { color: COLORS.white },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  row: { flexDirection: 'row', marginTop: 16, gap: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#833AB4',
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: { color: COLORS.white, fontWeight: '800' },
});

