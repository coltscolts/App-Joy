import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, Link, router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useSSO } from '@clerk/expo';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

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
  const { startSSOFlow } = useSSO();
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
      setMessage('Your account needs an additional verification step.');
    }
  };
  const socialSignIn = useCallback(async (strategy: 'oauth_apple' | 'oauth_google', provider: 'Apple' | 'Google') => {
    setMessage(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId, navigate: () => router.replace('/(tabs)') });
      } else setMessage(`${provider} sign-in needs an additional verification step.`);
    } catch {
      setMessage(`${provider} sign-in could not be completed. Please try again.`);
    }
  }, [startSSOFlow]);

  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} bottomOffset={56}>
      <View style={styles.brand}><Image source={require('../../assets/images/logo-joyplann.png')} style={styles.logo} resizeMode="cover" accessibilityLabel="JoyPlann" /><Text style={[styles.eyebrow, { color: colors.primary }]}>JOYPLANN</Text><Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your next adventure is waiting.</Text></View>
      <View style={styles.socialButtons}>
        <Pressable style={[styles.social, { backgroundColor: colors.foreground, borderColor: colors.foreground }]} onPress={() => void socialSignIn('oauth_apple', 'Apple')} accessibilityLabel="Continue with Apple">
          <Ionicons name="logo-apple" size={20} color={colors.background} />
          <Text style={[styles.socialText, { color: colors.background }]}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={[styles.social, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void socialSignIn('oauth_google', 'Google')} accessibilityLabel="Continue with Google">
          <Ionicons name="logo-google" size={19} color={colors.foreground} />
          <Text style={[styles.socialText, { color: colors.foreground }]}>Continue with Google</Text>
        </Pressable>
      </View>
      <Text style={[styles.or, { color: colors.mutedForeground }]}>or continue with email</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>Email address</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="you@example.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={emailAddress} onChangeText={setEmailAddress} />
      <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Your password" placeholderTextColor={colors.mutedForeground} secureTextEntry value={password} onChangeText={setPassword} />
      {(message || errors.fields.identifier?.message || errors.fields.password?.message) && <Text style={[styles.error, { color: colors.destructive }]}>{message ?? errors.fields.identifier?.message ?? errors.fields.password?.message}</Text>}
      <Pressable disabled={!emailAddress || !password || loading} onPress={() => void submit()} style={[styles.primary, { backgroundColor: colors.primary }, (!emailAddress || !password || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Sign in</Text>}</Pressable>
      <View style={styles.footer}><Text style={[styles.footerText, { color: colors.mutedForeground }]}>New to JoyPlann?</Text><Link href={'/(auth)/sign-up' as Href} style={[styles.link, { color: colors.primary }]}> Create an account</Link></View>
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