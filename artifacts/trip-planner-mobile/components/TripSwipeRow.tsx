import { type ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

type Props = {
  children: ReactNode;
  onDelete: () => void;
  onEdit?: () => void;
  radius: number;
  spacing: number;
  enabled?: boolean;
};

/** Tarjeta de viaje que, al deslizar a la izquierda, muestra Editar / Eliminar. */
export function TripSwipeRow({ children, onDelete, onEdit, radius, spacing, enabled = true }: Props) {
  const colors = useColors();
  const ref = useRef<SwipeableMethods>(null);
  const act = (action: () => void) => () => {
    ref.current?.close();
    action();
  };
  return (
    <View style={{ marginBottom: spacing }}>
      <ReanimatedSwipeable
        ref={ref}
        enabled={enabled}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => (
          <View style={styles.actions}>
            {onEdit ? (
              <Pressable onPress={act(onEdit)} accessibilityRole="button" style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius }]}>
                <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                <Text style={styles.text}>{t('trip_action_edit')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={act(onDelete)} accessibilityRole="button" style={[styles.button, { backgroundColor: colors.destructive, borderRadius: radius }]}>
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              <Text style={styles.text}>{t('trip_action_delete')}</Text>
            </Pressable>
          </View>
        )}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, paddingLeft: 8 },
  button: { alignItems: 'center', gap: 4, justifyContent: 'center', width: 84 },
  text: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
