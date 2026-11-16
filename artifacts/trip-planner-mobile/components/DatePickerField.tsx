import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatDateForDisplay, formatMonthLabel, t, tArray } from '@/lib/i18n';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  testID: string;
  backgroundColor?: string;
};

export function DatePickerField({ label, value, onChange, minimumDate = '', maximumDate = '', testID, backgroundColor }: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={t('trip_form_date_select_a11y', { label: label.toLowerCase() })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.input, { borderColor: colors.input, backgroundColor: backgroundColor ?? colors.card, opacity: pressed ? 0.78 : 1 }]}
      >
        <Text numberOfLines={1} style={[styles.value, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value ? formatDateForDisplay(value) : t('trip_form_date_pick')}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
      </Pressable>
      <CalendarModal
        visible={open}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        testID={testID}
        onClose={() => setOpen(false)}
        onSelectDate={(nextValue) => {
          onChange(nextValue);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CalendarModal({ visible, value, minimumDate, maximumDate, testID, onClose, onSelectDate }: Omit<Props, 'label' | 'onChange' | 'backgroundColor'> & { visible: boolean; onClose: () => void; onSelectDate: (value: string) => void }) {
  const colors = useColors();
  const [visibleMonth, setVisibleMonth] = useState(() => firstDayOfMonth(parseDate(value || minimumDate || maximumDate || '') ?? new Date()));
  const selectedDate = parseDate(value);

  useEffect(() => {
    if (visible) setVisibleMonth(firstDayOfMonth(parseDate(value || minimumDate || maximumDate || '') ?? new Date()));
  }, [maximumDate, minimumDate, value, visible]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const leadingDays = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const minimumMonth = minimumDate ? firstDayOfMonth(parseDate(minimumDate) ?? new Date()) : null;
  const maximumMonth = maximumDate ? firstDayOfMonth(parseDate(maximumDate) ?? new Date()) : null;
  const weekdays = tArray('calendar_weekdays');

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('calendar_close_a11y')} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Pressable accessibilityLabel={t('calendar_prev_month_a11y')} disabled={Boolean(minimumMonth && visibleMonth <= minimumMonth)} style={styles.monthButton} onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={20} color={!minimumMonth || visibleMonth > minimumMonth ? colors.foreground : colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonthLabel(visibleMonth)}</Text>
            <Pressable accessibilityLabel={t('calendar_next_month_a11y')} disabled={Boolean(maximumMonth && visibleMonth >= maximumMonth)} style={styles.monthButton} onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={20} color={!maximumMonth || visibleMonth < maximumMonth ? colors.foreground : colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.weekdays}>{weekdays.map((day) => <Text key={day} style={[styles.weekday, { color: colors.mutedForeground }]}>{day}</Text>)}</View>
          <View style={styles.grid}>
            {Array.from({ length: leadingDays + totalDays }, (_, index) => index < leadingDays ? null : new Date(year, month, index - leadingDays + 1)).map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.day} />;
              const key = dateKey(date);
              const disabled = Boolean((minimumDate && key < minimumDate) || (maximumDate && key > maximumDate));
               const selected = Boolean(selectedDate && key === dateKey(selectedDate));
              return <Pressable key={key} testID={`${testID}-day-${key}`} accessibilityRole="button" accessibilityLabel={t('calendar_select_day_a11y', { date: formatDateForDisplay(key) })} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={() => onSelectDate(key)} style={[styles.day, selected && { backgroundColor: colors.primary }, disabled && { opacity: .32 }]}><Text style={[styles.dayText, { color: selected ? colors.primaryForeground : disabled ? colors.mutedForeground : colors.foreground }]}>{date.getDate()}</Text></Pressable>;
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}
function firstDayOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

const styles = StyleSheet.create({
  field: { marginBottom: 16 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  input: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, height: 50, justifyContent: 'space-between', paddingHorizontal: 12 }, value: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13 },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.48)', flex: 1, justifyContent: 'center', padding: 20 }, sheet: { borderRadius: 16, borderWidth: 1, maxWidth: 420, padding: 18, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }, monthButton: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, monthLabel: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  weekdays: { flexDirection: 'row', marginBottom: 6 }, weekday: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, day: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', marginVertical: 3, width: '14.2857%' }, dayText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});