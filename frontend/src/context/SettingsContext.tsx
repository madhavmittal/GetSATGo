import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicSettings, SettingItem } from '../types';
import { api } from '../services/api';

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  default_test_time_minutes: 45,
  allow_timer_toggle: true,
  time_trap_threshold_seconds: 90,
  allow_question_flagging: true,
  enable_option_strikethrough: true,
  target_score: 1500,
  enable_desmos_calculator: true,
  enable_math_reference_sheet: true,
  default_drill_question_count: 5,
};

interface SettingsContextType {
  settings: PublicSettings;
  adminSettings: SettingItem[];
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  loadAdminSettings: () => Promise<void>;
  updateAdminSettings: (updated: Record<string, any>) => Promise<void>;
  resetAdminSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [adminSettings, setAdminSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPublic = async () => {
    try {
      const data = await api.getPublicSettings();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.warn("Using fallback local settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const items = await api.getAdminSettings();
      setAdminSettings(items);
    } catch (err) {
      console.error("Failed to load admin settings:", err);
    }
  };

  const updateAdminSettings = async (updated: Record<string, any>) => {
    await api.updateAdminSettings(updated);
    // Optimistically update local public settings
    setSettings((prev) => ({ ...prev, ...updated }));
    // Refresh detailed items
    await loadAdminSettings();
  };

  const resetAdminSettings = async () => {
    await api.resetAdminSettings();
    await loadPublic();
    await loadAdminSettings();
  };

  useEffect(() => {
    loadPublic();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        adminSettings,
        isLoading,
        refreshSettings: loadPublic,
        loadAdminSettings,
        updateAdminSettings,
        resetAdminSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

