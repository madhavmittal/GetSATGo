import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { analytics } from '../services/analytics';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (
    credential: string,
    mode: 'login' | 'register',
    role: 'student' | 'teacher',
    teacherInviteCode?: string
  ) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('getsatgo_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setAuthenticatedSession = (data: { access_token: string; user: User }) => {
    localStorage.setItem('getsatgo_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('getsatgo_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch (err: any) {
          console.error("Failed to load user profile:", err);
          localStorage.removeItem('getsatgo_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setAuthenticatedSession(data);
    analytics.track('login_success', { role: data.user.role });
  };

  const googleLogin = async (
    credential: string,
    mode: 'login' | 'register',
    role: 'student' | 'teacher',
    teacherInviteCode?: string
  ) => {
    const data = await api.googleAuth(
      credential,
      mode,
      role,
      teacherInviteCode
    );
    if ('status' in data) {
      analytics.track('registration_request_submitted', {
        role,
        provider: 'google',
      });
      return false;
    }

    setAuthenticatedSession(data);
    analytics.track('login_success', {
      role: data.user.role,
      provider: 'google',
    });
    return true;
  };

  const logout = () => {
    analytics.track('logout');
    localStorage.removeItem('getsatgo_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const updated = await api.getMe();
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        googleLogin,
        logout,
        refreshUser,
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

