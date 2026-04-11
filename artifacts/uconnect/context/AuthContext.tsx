import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  college: string;
  branch: string;
  year: string;
  bio: string;
  avatar: string | null;
  interests: string[];
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUserData: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "@uconnect_user";

const DEMO_USER: User = {
  id: "demo_user_001",
  email: "student@iitd.ac.in",
  username: "shadow_coder",
  displayName: "Shadow Coder",
  college: "IIT Delhi",
  branch: "Computer Science",
  year: "3rd Year",
  bio: "Building cool stuff. Coffee-fueled. Always learning. 🚀",
  avatar: null,
  interests: ["Coding", "Machine Learning", "Startups", "Gaming", "Open Source"],
  followers: 128,
  following: 64,
  postsCount: 12,
  isVerified: true,
  joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setUser(JSON.parse(data));
      } else {
        // Seed demo user for first-time visitors so the app is explorable
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
        setUser(DEMO_USER);
      }
    } catch {
      setUser(DEMO_USER);
    }
    setIsLoading(false);
  };

  const login = async (_email: string) => {
    // OTP flow handled in auth screens
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const setUserData = async (newUser: User) => {
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
        setUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
