import { create } from 'zustand';
import { authService } from '../services/authService';

interface User {
  id: string;
  name: string;
  icalToken: string;
  orgIds: string[];
}

interface AuthState {
  user: User | null;
  isReady: boolean;
  init: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isReady: false,

  async init() {
    const auth = await authService.initFromStorage();
    set({ user: auth?.user ?? null, isReady: true });
  },

  async logout() {
    await authService.logout();
    set({ user: null });
    window.location.href = '/splash';
  },
}));
