import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { GENDER_OPTIONS } from '@/constants/config';

interface GenderSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  /** When true, includes an "All" chip used for filtering rather than editing a profile. */
  includeAllOption?: boolean;
}

/** Simple pill/chip selector for gender, reused in setup, profile, and Radar filters. */
export default function GenderSelect({ value, onChange, includeAllOption }: GenderSelectProps) {
  const options = includeAllOption ? ['All', ...GENDER_OPTIONS] : [...GENDER_OPTIONS];

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = value === option || (option === 'All' && !value);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipBackground,
  },
  chipActive: {
    backgroundColor: '#833AB4',
    borderColor: '#833AB4',
  },
  chipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.chipActiveText,
  },
});

