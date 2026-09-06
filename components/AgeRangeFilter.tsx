import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AGE_BUCKETS } from '@/constants/config';

interface AgeRangeFilterProps {
  /** `null` means "All ages" (no age filtering). */
  range: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
}

/**
 * Clean age-range picker: shows the currently selected bucket as a pill
 * that opens a dropdown sheet of preset buckets (18-25, 25-30, ..., 50+).
 * No stepper, no numeric fiddling.
 */
export default function AgeRangeFilter({ range, onChange }: AgeRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const currentLabel =
    AGE_BUCKETS.find((b) => {
      if (b.range === null) return range === null;
      return range !== null && b.range[0] === range[0] && b.range[1] === range[1];
    })?.label ?? 'Custom';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Age range</Text>

      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.triggerText}>{currentLabel}</Text>
        <Text style={styles.triggerChevron}>v</Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choose age range</Text>
            {AGE_BUCKETS.map((bucket) => {
              const selected =
                bucket.range === null
                  ? range === null
                  : range !== null && bucket.range[0] === range[0] && bucket.range[1] === range[1];
              return (
                <TouchableOpacity
                  key={bucket.label}
                  style={[styles.option, selected && styles.optionActive]}
                  onPress={() => {
                    onChange(bucket.range);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {bucket.label}
                  </Text>
                  {selected && <Text style={styles.optionCheck}>OK</Text>}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.chipBackground,
  },
  triggerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  triggerChevron: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionActive: {
    backgroundColor: COLORS.surface,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#833AB4',
    fontWeight: '700',
  },
  optionCheck: {
    color: '#833AB4',
    fontSize: 14,
    fontWeight: '700',
  },
});
