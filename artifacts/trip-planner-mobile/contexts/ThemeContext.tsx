import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import colors from '@/constants/colors';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isReady: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode')
      .then((val) => {
        if (val === 'light' || val === 'dark' || val === 'system') setModeState(val);
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    void AsyncStorage.setItem('theme_mode', newMode);
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  useEffect(() => {
    if (isReady) {
      void SystemUI.setBackgroundColorAsync(isDark ? colors.dark.background : colors.light.background);
    }
  }, [isDark, isReady]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
