import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'teacher' | 'collab' | 'admin';
  level: number;
  xp: number;
  streak: number;
  maxStreak?: number;
  lastCheckInDate?: string;
  rankId?: number;
  tier?: number;
  stars?: number;
  bio?: string;
  username?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {}, updateUser: () => {} });

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_BACKEND;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      // Fetch session and user profile from backend
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }

      const backendUser = await res.json();
      setUser(backendUser as UserProfile);

    } catch (error) {
      console.error("Error setting up auth:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      window.location.href = '/auth';
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
