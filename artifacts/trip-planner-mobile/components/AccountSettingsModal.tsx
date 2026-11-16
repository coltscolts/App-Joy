import React, { useContext } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemeContext, type ThemeMode } from '@/contexts/ThemeContext';
import { t } from '@/lib/i18n';
import { useClerk, useUser } from '@clerk/expo';
import { mobileQueryClient } from '@/lib/queryClient';
import { useTripSelection } from '@/contexts/TripContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AccountSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const themeCtx = useContext(ThemeContext);
  const mode = themeCtx?.mode ?? 'system';
  const setMode = themeCtx?.setMode ?? (() => {});
  
  const { user } = useUser();
  const { signOut } = useClerk();
  const { clearTrip } = useTripSelection();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    onClose();
    mobileQueryClient.clear();
    clearTrip();
    await signOut();
  };

  const email = user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('settings_title')}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={t('settings_close')} testID="button-close-settings">
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings_theme')}</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((m, i) => (
              <Pressable
                key={m}
                style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                onPress={() => setMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === m }}
                testID={`button-theme-${m}`}
              >
                <Text style={[styles.rowText, { color: colors.foreground }]}>{t(`settings_theme_${m}` as any)}</Text>
                {mode === m && <Ionicons name="checkmark" size={22} color={colors.primary} />}
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 42 }}>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{email}</Text>
            <Pressable onPress={handleSignOut} accessibilityRole="button" testID="button-sign-out" style={[styles.signOutBtn, { backgroundColor: colors.destructive }]}>
              <Text style={[styles.signOutText, { color: colors.destructiveForeground }]}>{t('trips_sign_out')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  closeBtn: { position: 'absolute', right: 16, padding: 4 },
  content: { padding: 24, paddingTop: 32 },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 18 },
  rowText: { fontFamily: 'Inter_500Medium', fontSize: 16 },
  email: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  signOutBtn: { alignItems: 'center', padding: 16, borderRadius: 14 },
  signOutText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});