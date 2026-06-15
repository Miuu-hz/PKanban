import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { authService } from '../../services/authService';

const MOCK_AUTH_RESPONSE = {
  data: {
    accessToken: 'access-abc',
    refreshToken: 'refresh-xyz',
    user: {
      id: 'member-1',
      name: 'สมชาย',
      icalToken: 'ical-token',
      orgIds: ['org-1'],
    },
  },
};

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('calls /auth/line and stores result in localStorage', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce(MOCK_AUTH_RESPONSE);

      const result = await authService.login('test-id-token');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/line'),
        { idToken: 'test-id-token' },
      );
      expect(result.user.name).toBe('สมชาย');

      const stored = JSON.parse(localStorage.getItem('app_auth')!);
      expect(stored.accessToken).toBe('access-abc');
    });

    it('stores full auth object in localStorage', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce(MOCK_AUTH_RESPONSE);
      await authService.login('token');

      const stored = JSON.parse(localStorage.getItem('app_auth')!);
      expect(stored.refreshToken).toBe('refresh-xyz');
      expect(stored.user.orgIds).toEqual(['org-1']);
    });
  });

  describe('getAuth', () => {
    it('returns null when localStorage is empty', () => {
      expect(authService.getAuth()).toBeNull();
    });

    it('returns parsed auth when localStorage has data', () => {
      localStorage.setItem('app_auth', JSON.stringify(MOCK_AUTH_RESPONSE.data));
      const auth = authService.getAuth();
      expect(auth?.accessToken).toBe('access-abc');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns true when token exists', () => {
      localStorage.setItem('app_auth', JSON.stringify({ accessToken: 'token', refreshToken: 'r', user: {} }));
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('initFromStorage', () => {
    it('returns null when localStorage is empty', async () => {
      const result = await authService.initFromStorage();
      expect(result).toBeNull();
    });

    it('returns stored auth object', async () => {
      localStorage.setItem('app_auth', JSON.stringify(MOCK_AUTH_RESPONSE.data));
      const result = await authService.initFromStorage();
      expect(result?.user.name).toBe('สมชาย');
    });
  });

  describe('logout', () => {
    it('clears localStorage', async () => {
      localStorage.setItem('app_auth', JSON.stringify(MOCK_AUTH_RESPONSE.data));
      vi.mocked(axios.delete).mockResolvedValueOnce({});

      await authService.logout();

      expect(localStorage.getItem('app_auth')).toBeNull();
    });

    it('calls DELETE /auth/logout with Bearer token', async () => {
      localStorage.setItem('app_auth', JSON.stringify(MOCK_AUTH_RESPONSE.data));
      vi.mocked(axios.delete).mockResolvedValueOnce({});

      await authService.logout();

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        { headers: { Authorization: 'Bearer access-abc' } },
      );
    });

    it('clears localStorage even if API call fails', async () => {
      localStorage.setItem('app_auth', JSON.stringify(MOCK_AUTH_RESPONSE.data));
      vi.mocked(axios.delete).mockRejectedValueOnce(new Error('network error'));

      await authService.logout();

      expect(localStorage.getItem('app_auth')).toBeNull();
    });
  });
});
