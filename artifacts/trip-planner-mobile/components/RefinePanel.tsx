import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { t, type TranslationKey } from '@/lib/i18n';
import { refinementPayload, type RefinementGroup } from '@/lib/refinements';

type Props = {
  groups: RefinementGroup[];
  /** Filtros aplicados ahora (para mostrar el estado y saber si hay cambios). */
  applied: string[];
  pending: boolean;
  onApply: (refinements: string[]) => void;
  testIDPrefix?: string;
};

/** «Afinar resultados»: chips por grupo + texto libre; vuelve a pedir ideas con esos filtros. */
export function RefinePanel({ groups, applied, pending, onApply, testIDPrefix = 'refine' }: Props) {
  const colors = useColors();
  const [selected, setSelected] = useState<TranslationKey[]>([]);
  const [extra, setExtra] = useState('');
  const payload = refinementPayload(selected, extra, t);
  const changed = payload.join('|') !== applied.join('|');

  const toggle = (key: TranslationKey) => {
    void Haptics.selectionAsync?.();
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };
  const clear = () => {
    setSelected([]);
    setExtra('');
    if (applied.length) onApply([]);
  };

  return (
    <View testID={`${testIDPrefix}-panel`} style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="options-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>{t('refine_title')}</Text>
        {selected.length || extra || applied.length ? (
          <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" testID={`${testIDPrefix}-clear`} style={styles.clear}>
            <Text style={[styles.clearText, { color: colors.primary }]}>{t('refine_clear')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('refine_hint')}</Text>

      {groups.map((group) => (
        <View key={group.key}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{t(group.title)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {group.options.map((key) => {
              const on = selected.includes(key);
              return (
                <Pressable
                  key={key}
                  testID={`${testIDPrefix}-${key}`}
                  onPress={() => toggle(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.background }]}
                >
                  {on ? <Ionicons name="checkmark" size={14} color={colors.primaryForeground} /> : null}
                  <Text style={[styles.chipText, { color: on ? colors.primaryForeground : colors.foreground }]}>{t(key)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}

      <TextInput
        testID={`${testIDPrefix}-extra`}
        value={extra}
        onChangeText={setExtra}
        placeholder={t('refine_extra_ph')}
        placeholderTextColor={colors.mutedForeground}
        maxLength={60}
        returnKeyType="search"
        onSubmitEditing={() => { if (changed && !pending) onApply(payload); }}
        style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
      />
      <Pressable
        testID={`${testIDPrefix}-apply`}
        disabled={!changed || pending}
        onPress={() => onApply(payload)}
        accessibilityRole="button"
        style={[styles.apply, { backgroundColor: colors.primary, opacity: !changed || pending ? 0.5 : 1 }]}
      >
        {pending ? <ActivityIndicator color={colors.primaryForeground} /> : (
          <>
            <Ionicons name="sparkles" size={16} color={colors.primaryForeground} />
            <Text style={[styles.applyText, { color: colors.primaryForeground }]}>
              {payload.length ? t('refine_apply_count', { count: payload.length }) : t('refine_apply')}
            </Text>
          </>
        )}
      </Pressable>
      {applied.length ? (
        <Text style={[styles.active, { color: colors.mutedForeground }]}>{t('refine_active', { list: applied.join(', ') })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 14 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15 },
  clear: { minHeight: 32, justifyContent: 'center' },
  clearText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 },
  groupTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.6, marginTop: 12, textTransform: 'uppercase' },
  chips: { gap: 8, paddingRight: 8, paddingTop: 8 },
  chip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 4, minHeight: 36, paddingHorizontal: 12 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  input: { borderRadius: 10, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 14, height: 44, marginTop: 14, paddingHorizontal: 12 },
  apply: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, height: 46, justifyContent: 'center', marginTop: 12 },
  applyText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  active: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 8 },
});
