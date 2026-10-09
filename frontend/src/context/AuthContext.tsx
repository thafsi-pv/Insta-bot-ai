import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse } from '../types';
import { apiClient } from '../api/client';


interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('insta_sales_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('insta_sales_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res: any = await apiClient.get('/auth/profile');
          const userData = res.data || res;
          setUser(userData);
          localStorage.setItem('insta_sales_user', JSON.stringify(userData));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res: any = await apiClient.post('/auth/login', { email, password });
    const authData: AuthResponse = res.data || res;
    setUser(authData.user);
    setToken(authData.accessToken);
    localStorage.setItem('insta_sales_token', authData.accessToken);
    localStorage.setItem('insta_sales_user', JSON.stringify(authData.user));
  };

  const register = async (name: string, email: string, password: string) => {
    const res: any = await apiClient.post('/auth/register', { name, email, password });
    const authData: AuthResponse = res.data || res;
    setUser(authData.user);
    setToken(authData.accessToken);
    localStorage.setItem('insta_sales_token', authData.accessToken);
    localStorage.setItem('insta_sales_user', JSON.stringify(authData.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('insta_sales_token');
    localStorage.removeItem('insta_sales_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
