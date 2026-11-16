import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refreshMyPlan, type PlanStatus } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { getApiBaseUrl } from '@/lib/config';
import { t } from '@/lib/i18n';
import { buyPackage, getPackages, isPurchasesAvailable, restorePurchases, type PurchasesPackage } from '@/lib/purchases';
import type { PaywallReason } from '@/contexts/PlanContext';
import { readableWidth } from '@/constants/layout';

type Props = {
  visible: boolean;
  reason: PaywallReason;
  plan: PlanStatus | undefined;
  onClose: () => void;
  onUpgraded: () => void;
};

const FREE = { activeTrips: 1, scans: 2, ideas: 3, stops: 2 };

function trialDays(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit;
  const n = intro.periodNumberOfUnits;
  return unit === 'DAY' ? n : unit === 'WEEK' ? n * 7 : unit === 'MONTH' ? n * 30 : null;
}

export function PaywallModal({ visible, reason, plan, onClose, onUpgraded }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const limits = plan?.limits ?? FREE;

  useEffect(() => {
    if (!visible) return;
    setPackages(null);
    if (!isPurchasesAvailable()) {
      setPackages([]);
      return;
    }
    getPackages()
      .then((list) => {
        // Anual primero: suele ser la mejor oferta.
        const sorted = [...list].sort((a, b) => Number(b.packageType === 'ANNUAL') - Number(a.packageType === 'ANNUAL'));
        setPackages(sorted);
        setSelected(sorted[0]?.identifier ?? null);
      })
      .catch(() => setPackages([]));
  }, [visible]);

  const finishUpgrade = async () => {
    try {
      await refreshMyPlan();
    } catch {
      // El servidor lo verá en su próxima consulta.
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('paywall_welcome'));
    onUpgraded();
  };

  const buy = async () => {
    const pkg = packages?.find((item) => item.identifier === selected);
    if (!pkg) return;
    setBusy('buy');
    try {
      const result = await buyPackage(pkg);
      if (result === 'purchased') await finishUpgrade();
    } catch {
      Alert.alert(t('paywall_title'), t('paywall_error'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      if (await restorePurchases()) await finishUpgrade();
      else Alert.alert(t('paywall_restore'), t('paywall_restore_none'));
    } catch {
      Alert.alert(t('paywall_restore'), t('paywall_error'));
    } finally {
      setBusy(null);
    }
  };

  const openLegal = (path: '/terms' | '/privacy') => {
    const base = getApiBaseUrl();
    if (base) void WebBrowser.openBrowserAsync(`${base}${path}`);
  };

  const reasonText = {
    trips: t('paywall_reason_trips'),
    stops: t('paywall_reason_stops', { n: limits.stops }),
    scans: t('paywall_reason_scans', { n: limits.scans }),
    ideas: t('paywall_reason_ideas', { n: limits.ideas }),
    settings: null,
  }[reason];

  const benefits: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'briefcase-outline', text: t('paywall_benefit_trips') },
    { icon: 'git-branch-outline', text: t('paywall_benefit_stops') },
    { icon: 'scan-outline', text: t('paywall_benefit_scans') },
    { icon: 'sparkles-outline', text: t('paywall_benefit_ideas') },
    { icon: 'heart-outline', text: t('paywall_benefit_support') },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <ScrollView contentContainerStyle={[styles.content, readableWidth, { paddingBottom: insets.bottom + 24 }]}>
          <LinearGradient colors={['#1E6FD9', '#0B3D91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel={t('paywall_not_now')} testID="paywall-close">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <Ionicons name="diamond-outline" size={34} color="#FFFFFF" />
            <Text style={styles.heroTitle}>{t('paywall_title')}</Text>
            <Text style={styles.heroSubtitle}>{t('paywall_subtitle')}</Text>
            {reasonText ? (
              <View style={styles.reason}>
                <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.reasonText}>{reasonText}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {benefits.map((benefit) => (
            <View key={benefit.text} style={styles.benefit}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name={benefit.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit.text}</Text>
            </View>
          ))}

          {packages === null ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : packages.length === 0 ? (
            <Text style={[styles.unavailable, { color: colors.mutedForeground }]} testID="paywall-unavailable">{t('paywall_unavailable')}</Text>
          ) : (
            <View style={styles.packages}>
              {packages.map((pkg) => {
                const annual = pkg.packageType === 'ANNUAL';
                const active = selected === pkg.identifier;
                const trial = trialDays(pkg);
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg.identifier)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.package, { borderColor: active ? colors.primary : colors.border, backgroundColor: colors.card }]}
                  >
                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.mutedForeground} />
                    <View style={styles.packageText}>
                      <Text style={[styles.packageTitle, { color: colors.foreground }]}>{annual ? t('paywall_yearly') : t('paywall_monthly')}</Text>
                      <Text style={[styles.packagePrice, { color: colors.mutedForeground }]}>
                        {annual ? t('paywall_per_year', { price: pkg.product.priceString }) : t('paywall_per_month', { price: pkg.product.priceString })}
                        {trial ? ` · ${t('paywall_trial', { n: trial })}` : ''}
                      </Text>
                    </View>
                    {annual ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{t('paywall_best_value')}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                testID="paywall-buy"
                onPress={() => void buy()}
                disabled={!selected || busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [styles.buy, { backgroundColor: colors.primary, opacity: pressed || busy ? 0.85 : 1 }]}
              >
                {busy === 'buy' ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buyText, { color: colors.primaryForeground }]}>{t('paywall_continue')}</Text>}
              </Pressable>
            </View>
          )}

          <Pressable onPress={() => void restore()} disabled={busy !== null || !isPurchasesAvailable()} style={styles.linkButton} accessibilityRole="button" testID="paywall-restore">
            {busy === 'restore' ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.link, { color: colors.primary }]}>{t('paywall_restore')}</Text>}
          </Pressable>
          <Text style={[styles.legal, { color: colors.mutedForeground }]}>{t('paywall_legal')}</Text>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => openLegal('/terms')} accessibilityRole="link" hitSlop={8}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>{t('settings_terms')}</Text>
            </Pressable>
            <Text style={{ color: colors.mutedForeground }}>·</Text>
            <Pressable onPress={() => openLegal('/privacy')} accessibilityRole="link" hitSlop={8}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>{t('settings_privacy')}</Text>
            </Pressable>
          </View>
          <Pressable onPress={onClose} style={styles.linkButton} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.mutedForeground }]}>{t('paywall_not_now')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Abre la gestión de suscripciones de la tienda. */
export function openManageSubscriptions(url: string) {
  void Linking.openURL(url);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  hero: { alignItems: 'center', borderRadius: 24, gap: 6, marginBottom: 20, padding: 24, paddingTop: 30 },
  close: { padding: 6, position: 'absolute', right: 12, top: 12 },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.5, marginTop: 4 },
  heroSubtitle: { color: '#DBEAFE', fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  reason: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, flexDirection: 'row', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  reasonText: { color: '#FFFFFF', flexShrink: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 12 },
  benefitIcon: { alignItems: 'center', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  benefitText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  loading: { marginVertical: 24 },
  unavailable: { fontFamily: 'Inter_500Medium', fontSize: 15, marginVertical: 24, textAlign: 'center' },
  packages: { gap: 10, marginTop: 10 },
  package: { alignItems: 'center', borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', gap: 12, minHeight: 68, padding: 14 },
  packageText: { flex: 1 },
  packageTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  packagePrice: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  buy: { alignItems: 'center', borderRadius: 14, height: 54, justifyContent: 'center', marginTop: 8 },
  buyText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  linkButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  legal: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  legalLinks: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 },
  legalLink: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
