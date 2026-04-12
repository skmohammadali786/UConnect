import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Settings {
  pushNotifications: boolean;
  defaultAnonymous: boolean;
  showSensitiveContent: boolean;
  compactMode: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  pushNotifications: true,
  defaultAnonymous: false,
  showSensitiveContent: false,
  compactMode: false,
};

const STORAGE_KEY = "@uconnect_settings";
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        if (user) {
          const { data } = await supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", user.id)
            .single();
          if (data) {
            setSettings({
              pushNotifications: data.push_notifications,
              defaultAnonymous: data.default_anonymous,
              showSensitiveContent: data.show_sensitive_content,
              compactMode: data.compact_mode,
            });
            setIsLoading(false);
            return;
          }
        }
        // Fallback to local
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {}
      setIsLoading(false);
    })();
  }, [user?.id]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    // Always persist locally as backup
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    if (user) {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        push_notifications: updated.pushNotifications,
        default_anonymous: updated.defaultAnonymous,
        show_sensitive_content: updated.showSensitiveContent,
        compact_mode: updated.compactMode,
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be within SettingsProvider");
  return ctx;
}
