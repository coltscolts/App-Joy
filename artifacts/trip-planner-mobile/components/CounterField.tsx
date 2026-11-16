import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  testID?: string;
};

/** Selector numérico con botones − / + (sin teclado). */
export function CounterField({ label, value, onChange, min = 0, max = 20, testID }: Props) {
  const colors = useColors();
  const canDecrease = value > min;
  const canIncrease = value < max;

  const change = (next: number) => {
    if (next < min || next > max) return;
    void Haptics.selectionAsync?.();
    onChange(next);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') change(value + 1);
          if (event.nativeEvent.actionName === 'decrement') change(value - 1);
        }}
        style={[styles.box, { borderColor: colors.input, backgroundColor: colors.card }]}
      >
        <Pressable
          testID={testID ? `${testID}-decrease` : undefined}
          onPress={() => change(value - 1)}
          disabled={!canDecrease}
          hitSlop={6}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.secondary ?? colors.muted, opacity: !canDecrease ? 0.35 : pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="remove" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
        <Pressable
          testID={testID ? `${testID}-increase` : undefined}
          onPress={() => change(value + 1)}
          disabled={!canIncrease}
          hitSlop={6}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.secondary ?? colors.muted, opacity: !canIncrease ? 0.35 : pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  box: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  button: { alignItems: 'center', borderRadius: 8, height: 38, justifyContent: 'center', width: 38 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 18, minWidth: 32, textAlign: 'center' },
});
