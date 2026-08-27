import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
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
      setAuth: (token, user) => set({ token, user }),
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
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: 'rcs-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
