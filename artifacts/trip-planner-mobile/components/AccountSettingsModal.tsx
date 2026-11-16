import React, { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { customFetch } from '@workspace/api-client-react';
import { getApiBaseUrl } from '@/lib/config';
import { usePlan } from '@/contexts/PlanContext';
import { MANAGE_SUBSCRIPTIONS_URL, resetPurchasesUser } from '@/lib/purchases';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemeContext, type ThemeMode } from '@/contexts/ThemeContext';
import { t } from '@/lib/i18n';
import { useClerk, useUser } from '@clerk/expo';
import { mobileQueryClient } from '@/lib/queryClient';
import { useTripSelection } from '@/contexts/TripContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readableWidth } from '@/constants/layout';

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
    await resetPurchasesUser();
    await signOut();
  };

  const [deleting, setDeleting] = useState(false);
  const planCtx = usePlan();
  const plan = planCtx?.plan;

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await customFetch('/api/account', { method: 'DELETE', responseType: 'text' });
    } catch {
      setDeleting(false);
      Alert.alert(t('settings_delete_title'), t('settings_delete_error'));
      return;
    }
    // La cuenta ya no existe: cerrar sesión localmente aunque Clerk ya haya
    // invalidado la sesión y signOut() falle.
    try {
      await handleSignOut();
    } catch {
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(t('settings_delete_title'), t('settings_delete_body'), [
      { text: t('settings_delete_cancel'), style: 'cancel' },
      { text: t('settings_delete_confirm'), style: 'destructive', onPress: () => void deleteAccount() },
    ]);
  };

  const openTerms = () => {
    const base = getApiBaseUrl();
    if (base) void WebBrowser.openBrowserAsync(`${base}/terms`);
  };

  const openPrivacyPolicy = () => {
    const base = getApiBaseUrl();
    if (base) void WebBrowser.openBrowserAsync(`${base}/privacy`);
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

        <View style={[styles.content, readableWidth]}>
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

          {plan?.billingEnabled ? (
            <View style={{ marginTop: 28 }} testID="settings-plan">
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings_plan')}</Text>
              <View style={[styles.card, styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.planRow}>
                  <Ionicons name={plan.isPro ? 'diamond' : 'diamond-outline'} size={20} color={colors.primary} />
                  <Text style={[styles.rowText, { color: colors.foreground }]}>{plan.isPro ? t('settings_plan_pro') : t('settings_plan_free')}</Text>
                </View>
                {!plan.isPro ? (
                  <Text style={[styles.planUsage, { color: colors.mutedForeground }]}>
                    {t('settings_plan_usage', { scans: plan.usage.scans, scansLimit: plan.limits.scans, ideas: plan.usage.ideas, ideasLimit: plan.limits.ideas })}
                  </Text>
                ) : null}
                <Pressable
                  testID={plan.isPro ? 'button-manage-subscription' : 'button-upgrade'}
                  accessibilityRole="button"
                  onPress={() => {
                    if (plan.isPro) void Linking.openURL(MANAGE_SUBSCRIPTIONS_URL);
                    else {
                      onClose();
                      // Esperar a que se cierre esta hoja antes de abrir el paywall (iOS).
                      setTimeout(() => planCtx?.openPaywall('settings'), 450);
                    }
                  }}
                  style={[styles.planButton, { backgroundColor: plan.isPro ? colors.muted : colors.primary }]}
                >
                  <Text style={[styles.planButtonText, { color: plan.isPro ? colors.foreground : colors.primaryForeground }]}>
                    {plan.isPro ? t('settings_manage_subscription') : t('settings_upgrade')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 42 }}>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{email}</Text>
            <Pressable onPress={handleSignOut} accessibilityRole="button" testID="button-sign-out" style={[styles.signOutBtn, { backgroundColor: colors.destructive }]}>
              <Text style={[styles.signOutText, { color: colors.destructiveForeground }]}>{t('trips_sign_out')}</Text>
            </Pressable>

            <Pressable onPress={openPrivacyPolicy} accessibilityRole="link" testID="button-privacy-policy" style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('settings_privacy')}</Text>
            </Pressable>
            <Pressable onPress={openTerms} accessibilityRole="link" testID="button-terms" style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('settings_terms')}</Text>
            </Pressable>

            <Pressable
              onPress={confirmDeleteAccount}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityState={{ disabled: deleting, busy: deleting }}
              testID="button-delete-account"
              style={styles.linkBtn}
            >
              {deleting
                ? <ActivityIndicator color={colors.destructive} />
                : <Text style={[styles.linkText, { color: colors.destructive }]}>{t('settings_delete_account')}</Text>}
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
  planCard: { padding: 16 },
  planRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  planUsage: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 8 },
  planButton: { alignItems: 'center', borderRadius: 12, height: 46, justifyContent: 'center', marginTop: 14 },
  planButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8, minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});