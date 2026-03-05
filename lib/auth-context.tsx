import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from './api';

type UserRole = 'shipper' | 'driver';

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signUpShipper: (params: { email: string; password: string }) => Promise<void>;
  signUpDriver: (params: { email: string; password: string }) => Promise<void>;
  verifyOtp: (params: { email: string; code: string }) => Promise<UserRole>;
  signIn: (email: string, password: string) => Promise<UserRole | 'otp_required'>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = 'sharporder_auth_token';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored || !isMounted) {
          setLoading(false);
          return;
        }

        // Restore token and user from backend
        setToken(stored);
        try {
          const me = await apiFetch<AuthUser>('/api/me', {
            method: 'GET',
            token: stored,
          });
          if (!isMounted) return;
          setUser(me);
        } catch {
          // If token is invalid, clear it
          if (!isMounted) return;
          setToken(null);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const signUpShipper: AuthContextValue['signUpShipper'] = async ({ email, password }) => {
    await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: 'shipper' }),
    });
  };

  const signUpDriver: AuthContextValue['signUpDriver'] = async ({ email, password }) => {
    await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: 'driver' }),
    });
  };

  const verifyOtp: AuthContextValue['verifyOtp'] = async ({ email, code }) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    setToken(res.token);
    setUser(res.user);
    await AsyncStorage.setItem(STORAGE_KEY, res.token);
    return res.user.role;
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const res = await apiFetch<
      | { status: 'otp_required' }
      | { status: 'ok'; token: string; user: AuthUser }
    >('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 'otp_required') {
      return 'otp_required';
    }

    setToken(res.token);
    setUser(res.user);
    await AsyncStorage.setItem(STORAGE_KEY, res.token);
    return res.user.role;
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    signUpShipper,
    signUpDriver,
    verifyOtp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

