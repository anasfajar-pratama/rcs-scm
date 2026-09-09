import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  expiresAt: number | null;
  setAuth: (token: string, user: User, expiresAt?: number | null) => void;
  setUser: (user: User) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null,
      setAuth: (token, user, expiresAt = null) => set({ token, user, expiresAt }),
      setUser: (user) => set({ user }),
      hasPermission: (permission) => {
        const user = get().user;
        if (!user?.permissions) return false;
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(permission);
      },
      hasRole: (role) => {
        const user = get().user;
        if (!user?.roles) return false;
        if (user.roles.includes('super-admin')) return true;
        return user.roles.includes(role);
      },
      clear: () => set({ token: null, user: null, expiresAt: null }),
    }),
    {
      name: 'rcs-auth',
      partialize: (state) => ({ token: state.token, user: state.user, expiresAt: state.expiresAt }),
    },
  ),
);
