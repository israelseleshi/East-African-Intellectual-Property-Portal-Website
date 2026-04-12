import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Role = 'SUPER_ADMIN' | 'ADMIN';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone?: string;
  firm_name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  email: string | null;
  setSignupEmail: (email: string) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const selectUser = (state: AuthState) => state.user;
export const isSuperAdmin = (user: User | null) => user?.role === 'SUPER_ADMIN';
export const canAccessFinance = (user: User | null) => user?.role === 'SUPER_ADMIN';

const readCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      email: null,
      setSignupEmail: (email: string) => set({ email }),
      login: (user) => {
        set({ user, isAuthenticated: true, email: null });
      },
      logout: () => {
        const csrf = readCookie('csrf_token');
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: csrf ? { 'x-csrf-token': csrf } : {}
        }).catch(() => {});
        set({ user: null, isAuthenticated: false, email: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
