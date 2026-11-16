import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { setBaseUrl } from '@workspace/api-client-react';
import { TripProvider } from '@/contexts/TripContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { mobileQueryClient } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { useTripSelection } from '@/contexts/TripContext';
import { NotificationPermissionGate } from '@/components/NotificationPermissionGate';
import { clerkProxyUrl, clerkPublishableKey, getApiBaseUrl } from '@/lib/config';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const apiBaseUrl = getApiBaseUrl();
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
} else if (Platform.OS !== 'web') {
  console.warn('[JoyPlann] Falta EXPO_PUBLIC_API_URL: la app no podrá conectar con la API.');
}

function MissingConfigScreen() {
  return (
    <View style={configStyles.container}>
      <Text style={configStyles.title}>Configuración incompleta</Text>
      <Text style={configStyles.body}>
        Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Añádela al archivo .env o al perfil de eas.json y vuelve a compilar.
      </Text>
    </View>
  );
}

const configStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fafafa' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1e2a5a' },
  body: { fontSize: 15, textAlign: 'center', color: '#444' },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: t('nav_back') }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AccountCacheBoundary() {
  const { userId, sessionId } = useAuth();
  const { clearTrip } = useTripSelection();
  const previousAccount = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const account = userId && sessionId ? `${userId}:${sessionId}` : null;
    if (previousAccount.current !== undefined && previousAccount.current !== account) {
      mobileQueryClient.clear();
      clearTrip();
    }
    previousAccount.current = account;
  }, [clearTrip, sessionId, userId]);

  return <RootLayoutNav />;
}

function AppProviders({ assetsReady }: { assetsReady: boolean }) {
  const { isReady: themeReady } = useTheme();
  useEffect(() => {
    if (Platform.OS === 'web' || (assetsReady && themeReady)) void SplashScreen.hideAsync();
  }, [assetsReady, themeReady]);

  if (!clerkPublishableKey) {
    return <MissingConfigScreen />;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
      __experimental_disableNativeClientSync
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={mobileQueryClient}>
              <TripProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <AccountCacheBoundary />
                    <NotificationPermissionGate />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </TripProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <ThemeProvider>
      <AppProviders assetsReady={fontsLoaded || Boolean(fontError)} />
    </ThemeProvider>
  );
}
