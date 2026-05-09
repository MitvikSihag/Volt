import { create } from 'zustand';
import { User } from '../types';
import { MOCK_USER } from '../lib/mock-data';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (_email, _password) => {
    // TODO: POST /api/auth/login
    await new Promise((r) => setTimeout(r, 600));
    set({ user: MOCK_USER, token: 'mock-jwt-token', isAuthenticated: true });
  },

  register: async (username, _email, _password) => {
    // TODO: POST /api/auth/register
    await new Promise((r) => setTimeout(r, 600));
    set({ user: { ...MOCK_USER, username, displayName: username }, token: 'mock-jwt-token', isAuthenticated: true });
  },

  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
