import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL as string;

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    icalToken: string;
    orgIds: string[];
  };
}

export const authService = {
  async login(idToken: string): Promise<StoredAuth> {
    const res = await axios.post<StoredAuth>(`${BASE}/auth/line`, { idToken });
    localStorage.setItem('app_auth', JSON.stringify(res.data));
    return res.data;
  },

  async initFromStorage(): Promise<StoredAuth | null> {
    const raw = localStorage.getItem('app_auth');
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  },

  getAuth(): StoredAuth | null {
    const raw = localStorage.getItem('app_auth');
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getAuth()?.accessToken;
  },

  async logout(): Promise<void> {
    try {
      const raw = localStorage.getItem('app_auth');
      if (raw) {
        const { accessToken } = JSON.parse(raw) as StoredAuth;
        await axios.delete(`${BASE}/auth/logout`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch {
      // API call failed — local auth state is still cleared below
    } finally {
      localStorage.removeItem('app_auth');
    }
  },
};
