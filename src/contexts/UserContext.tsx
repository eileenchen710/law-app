import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { fetchCurrentUser } from '../services/api';

interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const token = Taro.getStorageSync("auth_token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchCurrentUser();
      setUser(response.user);
    } catch (err: any) {
      console.error('Failed to load user:', err);
      setError(err.message || 'Failed to load user');
      setUser(null);

      // Clear invalid token
      if (err.statusCode === 401) {
        Taro.removeStorageSync("auth_token");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    Taro.removeStorageSync("auth_token");
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
