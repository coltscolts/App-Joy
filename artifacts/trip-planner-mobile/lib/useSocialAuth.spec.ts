import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/expo', () => ({ useSSO: () => ({}) }));
vi.mock('@clerk/expo/apple', () => ({ useSignInWithApple: () => ({}) }));
vi.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'joyplann://' }));
vi.mock('expo-router', () => ({ router: { replace: vi.fn() } }));

import { missingFieldsMessage } from './useSocialAuth';

describe('missingFieldsMessage', () => {
  it('lists the fields Clerk still needs after Apple/Google sign-in', () => {
    expect(missingFieldsMessage({ status: 'missing_requirements', missingFields: ['username', 'phone_number'] })).toBe('username, phone_number');
    expect(missingFieldsMessage({ status: 'missing_requirements' })).toBe('missing_requirements');
  });
  it('returns null when nothing is missing (e.g. the user cancelled)', () => {
    expect(missingFieldsMessage({ status: 'complete' })).toBeNull();
    expect(missingFieldsMessage(null)).toBeNull();
  });
});
