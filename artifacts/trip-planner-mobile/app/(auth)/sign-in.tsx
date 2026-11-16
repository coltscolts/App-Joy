import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn } from '@clerk/expo';
import { useSocialAuth } from '@/lib/useSocialAuth';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { readableWidth } from '@/constants/layout';
import { t } from '@/lib/i18n';

WebBrowser.maybeCompleteAuthSession();

const SOCIAL_MESSAGES = {
  failed: (provider: string) => t('auth_social_signin_failed', { provider }),
  extraStep: (provider: string) => t('auth_social_signin_extra', { provider }),
};

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  useWarmUpBrowser();
  const loading = fetchStatus === 'fetching';

  const submit = async () => {
    setMessage(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: () => router.replace('/(tabs)') });
    } else {
      setMessage(t('auth_extra_step'));
    }
  };
  const social = useSocialAuth(SOCIAL_MESSAGES);
  const socialSignIn = (strategy: 'oauth_apple' | 'oauth_google', _provider: 'Apple' | 'Google') =>
    social.start(strategy === 'oauth_apple' ? 'apple' : 'google');
  const shownMessage = social.message ?? message;

  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, readableWidth]} bottomOffset={56}>
      <View style={styles.brand}><Image source={require('../../assets/images/logo-joyplann.png')} style={styles.logo} resizeMode="cover" accessibilityLabel="JoyPlann" /><Text style={[styles.eyebrow, { color: colors.primary }]}>JOYPLANN</Text><Text style={[styles.title, { color: colors.foreground }]}>{t('auth_welcome')}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('auth_welcome_sub')}</Text></View>
      <View style={styles.socialButtons}>
        <Pressable style={[styles.social, { backgroundColor: colors.foreground, borderColor: colors.foreground }]} onPress={() => void socialSignIn('oauth_apple', 'Apple')} accessibilityLabel={t('auth_apple')}>
          <Ionicons name="logo-apple" size={20} color={colors.background} />
          <Text style={[styles.socialText, { color: colors.background }]}>{t('auth_apple')}</Text>
        </Pressable>
        <Pressable style={[styles.social, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void socialSignIn('oauth_google', 'Google')} accessibilityLabel={t('auth_google')}>
          <Ionicons name="logo-google" size={19} color={colors.foreground} />
          <Text style={[styles.socialText, { color: colors.foreground }]}>{t('auth_google')}</Text>
        </Pressable>
      </View>
      <Text style={[styles.or, { color: colors.mutedForeground }]}>{t('auth_or_email')}</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{t('auth_email')}</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder={t('auth_email_placeholder')} placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={emailAddress} onChangeText={setEmailAddress} />
      <Text style={[styles.label, { color: colors.foreground }]}>{t('auth_password')}</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder={t('auth_password_placeholder')} placeholderTextColor={colors.mutedForeground} secureTextEntry value={password} onChangeText={setPassword} />
      {(shownMessage || errors.fields.identifier?.message || errors.fields.password?.message) && <Text style={[styles.error, { color: colors.destructive }]}>{shownMessage ?? errors.fields.identifier?.message ?? errors.fields.password?.message}</Text>}
      <Pressable disabled={!emailAddress || !password || loading} onPress={() => void submit()} style={[styles.primary, { backgroundColor: colors.primary }, (!emailAddress || !password || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{t('auth_sign_in')}</Text>}</Pressable>
      <View style={styles.footer}><Text style={[styles.footerText, { color: colors.mutedForeground }]}>{t('auth_new')}</Text><Link href={'/(auth)/sign-up' as Href} style={[styles.link, { color: colors.primary }]}>{t('auth_create_link')}</Link></View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 88 },
  brand: { marginBottom: 34 }, logo: { alignSelf: 'center', borderRadius: 18, height: 72, marginBottom: 18, width: 72 }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2 }, title: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1, marginTop: 10 }, subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 8 },
  socialButtons: { gap: 12 }, social: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, socialText: { fontFamily: 'Inter_700Bold', fontSize: 15 }, or: { fontFamily: 'Inter_500Medium', fontSize: 12, marginVertical: 23, textAlign: 'center' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 }, input: { borderRadius: 12, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 16, marginBottom: 18, padding: 15 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 12 }, primary: { alignItems: 'center', borderRadius: 12, minHeight: 52, justifyContent: 'center', marginTop: 4 }, primaryText: { fontFamily: 'Inter_700Bold', fontSize: 16 }, disabled: { opacity: 0.55 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 }, footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 }, link: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});