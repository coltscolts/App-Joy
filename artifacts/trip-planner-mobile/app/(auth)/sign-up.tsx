import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSignUp } from '@clerk/expo';
import { useSocialAuth } from '@/lib/useSocialAuth';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

const SOCIAL_MESSAGES = {
  failed: (provider: string) => `${provider} sign-up could not be completed. Please try again.`,
  extraStep: (provider: string) => `${provider} sign-up needs an additional verification step.`,
};

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const verifying = signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address') && signUp.missingFields.length === 0;
  const loading = fetchStatus === 'fetching';
  const submit = async () => {
    setMessage(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (!error) await signUp.verifications.sendEmailCode();
  };
  const verify = async () => {
    setMessage(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') await signUp.finalize({ navigate: () => router.replace('/(tabs)') });
    else setMessage('Please check the verification code and try again.');
  };
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
  const social = useSocialAuth(SOCIAL_MESSAGES);
  const socialSignUp = (strategy: 'oauth_apple' | 'oauth_google', _provider: 'Apple' | 'Google') =>
    social.start(strategy === 'oauth_apple' ? 'apple' : 'google');
  const shownMessage = social.message ?? message;
  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} bottomOffset={56}>
      <Image source={require('../../assets/images/logo-joyplann.png')} style={styles.logo} resizeMode="cover" accessibilityLabel="JoyPlann" />
      <Text style={[styles.eyebrow, { color: colors.primary }]}>JOYPLANN</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{verifying ? 'Verify your email' : 'Create your account'}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{verifying ? 'Enter the code we sent to your email.' : 'Start organising every journey in one place.'}</Text>
      {verifying ? <><TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Verification code" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" value={code} onChangeText={setCode} /><Pressable disabled={!code || loading} onPress={() => void verify()} style={[styles.primary, { backgroundColor: colors.primary }, (!code || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Verify email</Text>}</Pressable><Pressable onPress={() => void signUp.verifications.sendEmailCode()}><Text style={[styles.resend, { color: colors.primary }]}>Send a new code</Text></Pressable></> : <><View style={styles.socialButtons}><Pressable onPress={() => void socialSignUp('oauth_apple', 'Apple')} style={[styles.social, { backgroundColor: colors.foreground, borderColor: colors.foreground }]} accessibilityLabel="Continue with Apple"><Ionicons name="logo-apple" size={20} color={colors.background} /><Text style={[styles.socialText, { color: colors.background }]}>Continue with Apple</Text></Pressable><Pressable onPress={() => void socialSignUp('oauth_google', 'Google')} style={[styles.social, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="Continue with Google"><Ionicons name="logo-google" size={19} color={colors.foreground} /><Text style={[styles.socialText, { color: colors.foreground }]}>Continue with Google</Text></Pressable></View><Text style={[styles.or, { color: colors.mutedForeground }]}>or continue with email</Text><Text style={[styles.label, { color: colors.foreground }]}>Email address</Text><TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="you@example.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" value={emailAddress} onChangeText={setEmailAddress} /><Text style={[styles.label, { color: colors.foreground }]}>Password</Text><TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Create a password" placeholderTextColor={colors.mutedForeground} secureTextEntry value={password} onChangeText={setPassword} /><View nativeID="clerk-captcha" /><Pressable disabled={!emailAddress || !password || loading} onPress={() => void submit()} style={[styles.primary, { backgroundColor: colors.primary }, (!emailAddress || !password || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Create account</Text>}</Pressable></>}
      {(shownMessage || errors.fields.emailAddress?.message || errors.fields.password?.message || errors.fields.code?.message) && <Text style={[styles.error, { color: colors.destructive }]}>{shownMessage ?? errors.fields.emailAddress?.message ?? errors.fields.password?.message ?? errors.fields.code?.message}</Text>}
      <View style={styles.footer}><Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account?</Text><Link href={'/(auth)/sign-in' as Href} style={[styles.link, { color: colors.primary }]}> Sign in</Link></View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 88 }, logo: { alignSelf: 'center', borderRadius: 18, height: 72, marginBottom: 18, width: 72 }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2 }, title: { fontFamily: 'Inter_700Bold', fontSize: 33, letterSpacing: -1, marginTop: 10 }, subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23, marginBottom: 32, marginTop: 8 }, socialButtons: { gap: 12 }, social: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 }, socialText: { fontFamily: 'Inter_700Bold', fontSize: 15 }, or: { fontFamily: 'Inter_500Medium', fontSize: 12, marginVertical: 23, textAlign: 'center' }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 }, input: { borderRadius: 12, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 16, marginBottom: 18, padding: 15 }, primary: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', marginTop: 4, minHeight: 52 }, primaryText: { fontFamily: 'Inter_700Bold', fontSize: 16 }, disabled: { opacity: 0.55 }, error: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 14 }, resend: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 20, textAlign: 'center' }, footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 }, footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 }, link: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});