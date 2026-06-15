import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/useAuthStore';

const MOCK_AUTH = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  user: {
    id: 'member-1',
    name: 'สมชาย ใจดี',
    icalToken: 'ical-abc',
    orgIds: ['org-1'],
  },
};

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    initFromStorage: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn(),
    login: vi.fn(),
    getAuth: vi.fn(),
  },
}));

import { authService } from '../../services/authService';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isReady: false });
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('sets user and isReady=true when auth is in storage', async () => {
      vi.mocked(authService.initFromStorage).mockResolvedValueOnce(MOCK_AUTH);

      await useAuthStore.getState().init();

      const state = useAuthStore.getState();
      expect(state.isReady).toBe(true);
      expect(state.user?.name).toBe('สมชาย ใจดี');
      expect(state.user?.orgIds).toEqual(['org-1']);
    });

    it('sets user=null and isReady=true when no auth in storage', async () => {
      vi.mocked(authService.initFromStorage).mockResolvedValueOnce(null);

      await useAuthStore.getState().init();

      const state = useAuthStore.getState();
      expect(state.isReady).toBe(true);
      expect(state.user).toBeNull();
    });

    it('calls initFromStorage exactly once', async () => {
      vi.mocked(authService.initFromStorage).mockResolvedValueOnce(null);
      await useAuthStore.getState().init();
      expect(authService.initFromStorage).toHaveBeenCalledOnce();
    });
  });

  describe('logout', () => {
    it('calls authService.logout and clears user', async () => {
      useAuthStore.setState({ user: MOCK_AUTH.user, isReady: true });

      // Mock window.location since jsdom doesn't support navigation
      const locationMock = { href: '' };
      Object.defineProperty(window, 'location', { value: locationMock, writable: true });

      await useAuthStore.getState().logout();

      expect(authService.logout).toHaveBeenCalledOnce();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
