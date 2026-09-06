import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AVAILABLE_CITIES } from '@/constants/config';

interface CitySelectProps {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Compact dropdown that lets the user pick their city from the allow-list
 * defined in `constants/config.ts`. Rendered as a tappable field that opens
 * a modal sheet with the options, matching the visual language of the
 * other pill-style inputs (GenderSelect, AgeRangeFilter).
 */
export default function CitySelect({ value, onChange, placeholder }: CitySelectProps) {
  const [open, setOpen] = useState(false);

  const handlePick = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select city"
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ?? placeholder ?? 'Select city'}
        </Text>
        <Text style={styles.chevron}>{'\u25BE'}</Text>
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choose your city</Text>
            {AVAILABLE_CITIES.map((city) => {
              const selected = value === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[styles.option, selected && styles.optionActive]}
                  onPress={() => handlePick(city)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>{city}</Text>
                  {selected && <Text style={styles.check}>{'\u2713'}</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  value: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  placeholder: { color: COLORS.textMuted, fontSize: 15 },
  chevron: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: '#833AB4',
    borderColor: '#833AB4',
  },
  optionText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  optionTextActive: { color: COLORS.white },
  check: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  cancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});

