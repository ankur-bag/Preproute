// hooks/useAuth.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (userId: string, password: string) => {
    try {
      const { data } = await axios.post('/api/auth/login', { userId, password });
      if (data.success && data.user) {
        setUser(data.user);
        return data;
      }
      throw new Error(data.message || 'Login failed');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
