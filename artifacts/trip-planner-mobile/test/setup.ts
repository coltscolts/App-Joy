import { vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-native', async () => {
  const React = await import('react');
  const host = (name: string) => ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(name, props, children);
  return {
    ActivityIndicator: host('ActivityIndicator'),
    Image: host('Image'),
    Alert: { alert: vi.fn() },
    Linking: { openSettings: vi.fn() },
    Modal: ({ children, visible }: { children?: React.ReactNode; visible: boolean }) =>
      visible ? React.createElement('Modal', null, children) : null,
    Platform: { OS: 'web' },
    Pressable: host('Pressable'),
    RefreshControl: host('RefreshControl'),
    ScrollView: host('ScrollView'),
    StyleSheet: {
      absoluteFill: {},
      absoluteFillObject: {},
      create: <T>(styles: T) => styles,
      hairlineWidth: 1,
    },
    Switch: host('Switch'),
    Text: host('Text'),
    TextInput: host('TextInput'),
    useColorScheme: () => 'light',
    View: host('View'),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
}));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(({ children }: { children?: React.ReactNode }, _ref) => React.createElement('Swipeable', null, children)),
  };
});

vi.mock('expo-web-browser', () => ({
  openBrowserAsync: vi.fn(),
}));

vi.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@/components/KeyboardAwareScrollViewCompat', async () => {
  const { View } = await import('react-native');
  return { KeyboardAwareScrollViewCompat: View };
});

vi.mock('@/lib/reminders', () => ({
  REMINDER_TIMING_OPTIONS: [{ minutes: 60, label: '1 hour before' }],
  cancelActivityReminder: vi.fn(),
  getReminderLeadMinutes: vi.fn().mockResolvedValue(60),
  isActivityReminderScheduled: vi.fn().mockResolvedValue(false),
  requestReminderPermission: vi.fn().mockResolvedValue({ granted: true }),
  scheduleActivityReminder: vi.fn(),
}));