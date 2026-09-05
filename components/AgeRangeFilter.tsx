import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { MAX_AGE, MIN_AGE } from '@/constants/config';

interface AgeRangeFilterProps {
  range: [number, number];
  onChange: (range: [number, number]) => void;
}

/** Compact stepper-based age-range filter (no external slider dependency). */
export default function AgeRangeFilter({ range, onChange }: AgeRangeFilterProps) {
  const [min, max] = range;

  const setMin = (next: number) => {
    const clamped = Math.max(MIN_AGE, Math.min(next, max));
    onChange([clamped, max]);
  };
  const setMax = (next: number) => {
    const clamped = Math.min(MAX_AGE, Math.max(next, min));
    onChange([min, clamped]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Age range</Text>
      <View style={styles.row}>
        <Stepper label="Min" value={min} onDecrement={() => setMin(min - 1)} onIncrement={() => setMin(min + 1)} />
        <Text style={styles.separator}>—</Text>
        <Stepper label="Max" value={max} onDecrement={() => setMax(max - 1)} onIncrement={() => setMax(max + 1)} />
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperBtn} onPress={onDecrement}>
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={onIncrement}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  separator: { color: COLORS.textSecondary, fontSize: 16 },
  stepper: { alignItems: 'center' },
  stepperLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#833AB4', fontSize: 16, fontWeight: '700' },
  stepperValue: { color: COLORS.text, fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
});

