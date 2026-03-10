import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'LAWYER' | 'PARTNER';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  email: string | null;
  setSignupEmail: (email: string) => void;
  login: (user: User) => void;
  logout: () => void;
}

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
