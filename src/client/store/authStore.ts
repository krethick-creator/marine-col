import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/api/authService';
import type { AuthUser } from '../services/api/authService';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, pass) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login(email, pass);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.register(data);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'orca-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);
