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
  token: string | null;
  isAuthenticated: boolean;
  email: string | null;
  setSignupEmail: (email: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      email: null,
      setSignupEmail: (email: string) => set({ email }),
      login: (user, token) => {
        set({ user, token, isAuthenticated: true, email: null });
        localStorage.setItem('token', token);
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, email: null });
        localStorage.removeItem('token');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
