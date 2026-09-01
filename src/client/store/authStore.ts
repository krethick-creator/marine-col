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
  hydrateSession: () => Promise<void>;
  clearError: () => void;
}

async function syncAppUser(user: AuthUser | null) {
  const { useAppStore } = await import('./index');
  if (user) {
    useAppStore.getState().setUser({
      id: user.id,
      role: user.role as any,
      name: user.name,
    });
  } else {
    useAppStore.getState().setUser({ role: 'fisherman' });
  }
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
          set({ user, token, isAuthenticated: true, isLoading: false, error: null });
          await syncAppUser(user);
        } catch (err: any) {
          set({ error: err.message, isLoading: false, isAuthenticated: false, user: null, token: null });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.register(data);
          set({ user, token, isAuthenticated: true, isLoading: false, error: null });
          await syncAppUser(user);
        } catch (err: any) {
          set({ error: err.message, isLoading: false, isAuthenticated: false, user: null, token: null });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          await syncAppUser(null);
        }
      },

      hydrateSession: async () => {
        const token = get().token;
        if (!token) {
          if (get().isAuthenticated && !get().user) {
            set({ isAuthenticated: false });
          }
          return;
        }

        try {
          const user = await authService.getCurrentUser(token);
          set({ user, token, isAuthenticated: true, error: null });
          await syncAppUser(user);
        } catch (err: any) {
          const message = String(err?.message || '');
          if (message.includes('Not authenticated') || message.includes('Invalid') || message.includes('expired') || message.includes('Authentication required')) {
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'orca-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          void useAuthStore.getState().hydrateSession();
        }
      },
    }
  )
);
