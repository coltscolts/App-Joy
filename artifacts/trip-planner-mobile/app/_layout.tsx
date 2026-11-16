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
import { Platform } from 'react-native';
import { setBaseUrl } from '@workspace/api-client-react';
import { TripProvider } from '@/contexts/TripContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { mobileQueryClient } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { useTripSelection } from '@/contexts/TripContext';
import { NotificationPermissionGate } from '@/components/NotificationPermissionGate';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

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

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
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
