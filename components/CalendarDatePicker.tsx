import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { toIsoDate } from '@/utils/validation';

interface CalendarDatePickerProps {
  visible: boolean;
  initialDate?: Date;
  minAge?: number;
  onClose: () => void;
  onConfirm: (isoDate: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Lightweight, dependency-free calendar/date picker used for birth date
 * selection. Pure React Native + JS Date math — no native module required,
 * so it works out of the box in Expo Go.
 */
export default function CalendarDatePicker({
  visible,
  initialDate,
  minAge = 18,
  onClose,
  onConfirm,
}: CalendarDatePickerProps) {
  const maxSelectableDate = new Date();
  maxSelectableDate.setFullYear(maxSelectableDate.getFullYear() - minAge);

  const [viewDate, setViewDate] = useState(initialDate ?? maxSelectableDate);
  const [selected, setSelected] = useState<Date | null>(initialDate ?? null);

  if (!visible) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goPrevYear = () => setViewDate(new Date(year - 1, month, 1));
  const goNextYear = () => setViewDate(new Date(year + 1, month, 1));

  const isDisabled = (day: number) => new Date(year, month, day) > maxSelectableDate;

  const isSelected = (day: number) =>
    !!selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(toIsoDate(selected));
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Date of birth</Text>
          <Text style={styles.subtitle}>You must be {minAge}+ to use this app.</Text>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={goPrevYear} style={styles.navBtn}>
              <Text style={styles.navText}>«</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNextYear} style={styles.navBtn}>
              <Text style={styles.navText}>»</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={idx} style={styles.dayCell} />;
              const disabled = isDisabled(day);
              const active = isSelected(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                  disabled={disabled}
                  onPress={() => setSelected(new Date(year, month, day))}
                >
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextDisabled,
                      active && styles.dayTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selected}
              style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  navText: { color: COLORS.primary, fontSize: 18, fontWeight: '700' },
  monthLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row', marginTop: 8 },
  weekday: {
    width: CELL_SIZE,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  dayCellActive: {
    backgroundColor: COLORS.primary,
  },
  dayText: { color: COLORS.text, fontSize: 13 },
  dayTextDisabled: { color: COLORS.textMuted },
  dayTextActive: { color: COLORS.white, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: COLORS.white, fontWeight: '700' },
});

