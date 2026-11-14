import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  activateSubscription: () => Promise<void>;
  expireSubscription: () => Promise<void>;
  showSubModal: boolean;
  setShowSubModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('getsatgo_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSubModal, setShowSubModal] = useState<boolean>(false);

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
    localStorage.setItem('getsatgo_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, role = 'student') => {
    const data = await api.register(email, password, name, role);
    localStorage.setItem('getsatgo_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('getsatgo_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const updated = await api.getMe();
      setUser(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const activateSubscription = async () => {
    try {
      const updated = await api.subscribe('Pro SAT Pass', 1);
      setUser(updated);
      setShowSubModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const expireSubscription = async () => {
    try {
      const updated = await api.simulateExpireSubscription();
      setUser(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const isSubscriptionActive = 
    user?.role === 'teacher' || 
    user?.role === 'admin' || 
    user?.subscription_status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSubscriptionActive,
        login,
        register,
        logout,
        refreshUser,
        activateSubscription,
        expireSubscription,
        showSubModal,
        setShowSubModal,
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

