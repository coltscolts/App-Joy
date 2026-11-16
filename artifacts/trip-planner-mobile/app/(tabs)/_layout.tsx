import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { type Href, Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { t } from '@/lib/i18n';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { mobileQueryClient } from '@/lib/queryClient';
import { useTripSelection } from '@/contexts/TripContext';
import { useTheme } from '@/contexts/ThemeContext';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
        <Label>{t('tab_trips')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="itinerary">
        <Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <Label>{t('tab_itinerary')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: 'clock.arrow.circlepath', selected: 'clock.arrow.circlepath' }} />
        <Label>{t('tab_history')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isDark = colors.isDark;
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_trips'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="briefcase" tintColor={color} size={24} />
            ) : (
              <Feather name="briefcase" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tab_history'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="clock.arrow.circlepath" tintColor={color} size={24} />
            ) : (
              <Feather name="clock" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: t('tab_itinerary'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="map" tintColor={color} size={24} />
            ) : (
              <Feather name="map" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn, getToken, userId, sessionId } = useAuth();
  const { mode } = useTheme();
  const { clearTrip } = useTripSelection();
  const previousAccount = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    const account = userId && sessionId ? `${userId}:${sessionId}` : null;
    if (previousAccount.current !== undefined && previousAccount.current !== account) {
      mobileQueryClient.clear();
      clearTrip();
    }
    previousAccount.current = account;
  }, [clearTrip, sessionId, userId]);

  if (!isSignedIn) return <Redirect href={'/(auth)/sign-in' as Href} />;
  if (isLiquidGlassAvailable() && mode === 'system') {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
