import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';
import { formatTime12, time24ToParts, timePartsTo24 } from '@/lib/dateTime';

export function TimePickerField({ label, value, placeholder, onChange, testID = 'input-time' }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; testID?: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState(time24ToParts(value));
  const openPicker = () => { setParts(time24ToParts(value)); setOpen(true); };
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={t('activity_form_select_time_a11y')} onPress={openPicker} style={({ pressed }) => [styles.input, { borderColor: colors.input, backgroundColor: colors.card, opacity: pressed ? .8 : 1 }]}>
      <Text style={[styles.value, { color: value ? colors.foreground : colors.mutedForeground }]}>{value ? formatTime12(value) : placeholder}</Text><Ionicons name="time-outline" size={20} color={colors.primary} />
    </Pressable>
    <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}><View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('activity_form_time_picker_title')}</Text>
        <View style={styles.controls}>
          <Stepper label={t('activity_form_time_picker_hour')} value={String(parts.hour)} colors={colors} onDown={() => setParts(p => ({ ...p, hour: p.hour === 1 ? 12 : p.hour - 1 }))} onUp={() => setParts(p => ({ ...p, hour: p.hour === 12 ? 1 : p.hour + 1 }))} />
          <Stepper label={t('activity_form_time_picker_minute')} value={String(parts.minute).padStart(2, '0')} colors={colors} onDown={() => setParts(p => ({ ...p, minute: (p.minute + 55) % 60 }))} onUp={() => setParts(p => ({ ...p, minute: (p.minute + 5) % 60 }))} />
          <View style={styles.stepper}><Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{t('activity_form_time_picker_period')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('activity_form_time_picker_am')} onPress={() => setParts(p => ({ ...p, period: 'AM' }))} style={[styles.period, { borderColor: colors.input, backgroundColor: parts.period === 'AM' ? colors.primary : colors.card }]}><Text style={{ color: parts.period === 'AM' ? colors.primaryForeground : colors.foreground }}>AM</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('activity_form_time_picker_pm')} onPress={() => setParts(p => ({ ...p, period: 'PM' }))} style={[styles.period, { borderColor: colors.input, backgroundColor: parts.period === 'PM' ? colors.primary : colors.card }]}><Text style={{ color: parts.period === 'PM' ? colors.primaryForeground : colors.foreground }}>PM</Text></Pressable></View>
        </View>
        {value ? <Pressable testID="button-clear-time" accessibilityRole="button" accessibilityLabel={t('activity_form_time_picker_clear')} onPress={() => { onChange(''); setOpen(false); }} style={styles.clearAction}><Text style={{ color: colors.destructive }}>{t('activity_form_time_picker_clear')}</Text></Pressable> : null}
        <View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={[styles.action, { borderColor: colors.border }]}><Text style={{ color: colors.foreground }}>{t('activity_form_time_picker_cancel')}</Text></Pressable><Pressable testID="button-confirm-time" onPress={() => { onChange(timePartsTo24(parts.hour, parts.minute, parts.period)); setOpen(false); }} style={[styles.action, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: colors.primaryForeground }}>{t('activity_form_time_picker_save')}</Text></Pressable></View>
      </View></View>
    </Modal>
  </View>;
}

function Stepper({ label, value, colors, onDown, onUp }: { label: string; value: string; colors: ReturnType<typeof useColors>; onDown: () => void; onUp: () => void }) { return <View style={styles.stepper}><Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{label}</Text><Pressable accessibilityLabel={t('activity_form_increase_a11y', { label })} onPress={onUp}><Ionicons name="chevron-up" size={24} color={colors.primary} /></Pressable><Text style={[styles.stepperValue, { color: colors.foreground }]}>{value}</Text><Pressable accessibilityLabel={t('activity_form_decrease_a11y', { label })} onPress={onDown}><Ionicons name="chevron-down" size={24} color={colors.primary} /></Pressable></View>; }
const styles = StyleSheet.create({
  field: { marginBottom: 16 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 }, input: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 14 }, value: { fontFamily: 'Inter_400Regular', fontSize: 16 },
  backdrop: { backgroundColor: 'rgba(3, 13, 30, .56)', flex: 1, justifyContent: 'flex-end', padding: 16 }, sheet: { borderRadius: 18, borderWidth: 1, padding: 20 }, title: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 20 }, controls: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }, stepper: { alignItems: 'center', minWidth: 70 }, stepperLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 5 }, stepperValue: { fontFamily: 'Inter_700Bold', fontSize: 28 }, period: { alignItems: 'center', borderRadius: 6, borderWidth: 1, marginVertical: 2, paddingHorizontal: 11, paddingVertical: 4 }, clearAction: { alignItems: 'center', marginBottom: 14, paddingVertical: 8 }, actions: { flexDirection: 'row', gap: 10 }, action: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center' },
});