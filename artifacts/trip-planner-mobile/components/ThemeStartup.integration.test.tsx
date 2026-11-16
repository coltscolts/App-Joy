// @vitest-environment jsdom

import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider as MobileThemeProvider } from '@/contexts/ThemeContext';
import MyTripsScreen from '@/app/(tabs)/index';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

vi.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-linear-gradient', async () => {
  const ReactModule = await import('react');
  return {
    LinearGradient: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
      ReactModule.createElement('LinearGradient', props, children),
  };
});

vi.mock('expo-router', () => ({
  router: { navigate: vi.fn() },
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
}));

vi.mock('@clerk/expo', () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ user: { fullName: 'Theme Tester', primaryEmailAddress: { emailAddress: 'theme@example.com' } } }),
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetTripsQueryKey: () => ['trips'],
  useGetTrips: () => ({ data: [], isError: false, isLoading: false, isRefetching: false, refetch: vi.fn() }),
}));

vi.mock('@/contexts/TripContext', () => ({
  useTripSelection: () => ({ clearTrip: vi.fn(), selectTrip: vi.fn() }),
}));

vi.mock('@/lib/queryClient', () => ({
  mobileQueryClient: { clear: vi.fn() },
}));

vi.mock('@/components/TripFormModal', () => ({
  TripFormModal: () => null,
}));

function press(renderer: ReactTestRenderer, testID: string) {
  const target = renderer.root.findAllByProps({ testID }).find((node) => typeof node.props.onPress === 'function');
  if (!target) throw new Error(`No pressable found for ${testID}`);
  act(() => target.props.onPress());
}

async function renderMobile() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <MobileThemeProvider>
        <MyTripsScreen />
      </MobileThemeProvider>,
    );
  });
  return renderer;
}

describe('theme startup regression', () => {
  beforeEach(() => {
    storage.clear();
  });

  it.each([
    ['system', 'home-light-cover'],
    ['light', 'home-light-cover'],
    ['dark', 'home-dark-compact'],
  ] as const)('keeps the mobile %s selection after reload and renders its expected home', async (mode, expectedHome) => {
    let renderer = await renderMobile();
    expect(renderer.root.findAllByProps({ testID: 'button-account-settings' })).not.toHaveLength(0);

    press(renderer, 'button-account-settings');
    press(renderer, `button-theme-${mode}`);
    expect(storage.get('theme_mode')).toBe(mode);

    act(() => renderer.unmount());
    renderer = await renderMobile();

    press(renderer, 'button-account-settings');
    expect(renderer.root.findByProps({ testID: `button-theme-${mode}` }).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findAllByProps({ testID: expectedHome }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({
      testID: expectedHome === 'home-light-cover' ? 'home-dark-compact' : 'home-light-cover',
    })).toHaveLength(0);
  });

});