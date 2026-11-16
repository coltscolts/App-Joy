import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

/** Etiqueta «Destacado» para lugares recomendados por JoyPlann. */
export function FeaturedBadge() {
  const colors = useColors();
  return (
    <View testID="featured-badge" style={[styles.badge, { backgroundColor: colors.primary }]}>
      <Ionicons name="star" size={11} color={colors.primaryForeground} />
      <Text style={[styles.text, { color: colors.primaryForeground }]}>{t('featured_badge')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 4, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.3 },
});
