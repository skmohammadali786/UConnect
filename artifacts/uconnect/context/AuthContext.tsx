import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  deleteAccount: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUserData: (user: User) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USER: User = {
  id: "demo_user_001",
  email: "student@iitd.ac.in",
  username: "shadow_coder",
  displayName: "Shadow Coder",
  college: "IIT Delhi",
  branch: "Computer Science",
  year: "3rd Year",
  bio: "Building cool stuff. Coffee-fueled. Always learning.",
  avatar: null,
  interests: ["Coding", "Machine Learning", "Startups", "Gaming", "Open Source"],
  followers: 128,
  following: 64,
  postsCount: 12,
  isVerified: true,
  joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    college: row.college,
    branch: row.branch,
    year: row.year,
    bio: row.bio,
    avatar: row.avatar,
    interests: row.interests ?? [],
    followers: row.followers ?? 0,
    following: row.following ?? 0,
    postsCount: row.posts_count ?? 0,
    isVerified: row.is_verified ?? false,
    joinedAt: row.joined_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check existing Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        // Fallback: check demo user in AsyncStorage
        try {
          const raw = await AsyncStorage.getItem("@uconnect_demo_user");
          if (raw) setUser(JSON.parse(raw));
        } catch {}
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data && !error) {
        setUser(rowToUser(data));
      }
    } catch {}
  };

  const sendOtp = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "uconnect://auth/callback",
      },
    });
    return { error: error ? error.message : null };
  };

  const verifyOtp = async (email: string, token: string): Promise<{ error: string | null; isNewUser: boolean }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    if (error) return { error: error.message, isNewUser: false };

    const userId = data.user?.id;
    if (!userId) return { error: "Authentication failed", isNewUser: false };

    // Check if profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    return { error: null, isNewUser: !profile };
  };

  const login = async (_email: string) => {};

  const loginAsDemo = async () => {
    await AsyncStorage.setItem("@uconnect_demo_user", JSON.stringify(DEMO_USER));
    setUser(DEMO_USER);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("@uconnect_demo_user");
    await supabase.auth.signOut();
    setUser(null);
  };

  const deleteAccount = async () => {
    if (user && user.id !== "demo_user_001") {
      try {
        // RPC deletes profile (cascades all 24 tables) + removes auth.users record
        await supabase.rpc("delete_account");
      } catch {
        // Fallback: delete profile directly (cascades all data, auth record stays)
        await supabase.from("profiles").delete().eq("id", user.id);
      }
    }
    // Clear all local storage
    await AsyncStorage.multiRemove([
      "@uconnect_demo_user",
      "@uconnect_theme",
      "@uconnect_settings",
    ]).catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (user.id === "demo_user_001") {
      await AsyncStorage.setItem("@uconnect_demo_user", JSON.stringify(updated));
      return;
    }

    await supabase.from("profiles").update({
      display_name: updated.displayName,
      username: updated.username,
      college: updated.college,
      branch: updated.branch,
      year: updated.year,
      bio: updated.bio,
      avatar: updated.avatar,
      interests: updated.interests,
    }).eq("id", user.id);
  };

  const setUserData = async (newUser: User) => {
    setUser(newUser);
    if (newUser.id === "demo_user_001") {
      await AsyncStorage.setItem("@uconnect_demo_user", JSON.stringify(newUser));
      return;
    }
    // Upsert profile
    await supabase.from("profiles").upsert({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      display_name: newUser.displayName,
      college: newUser.college,
      branch: newUser.branch,
      year: newUser.year,
      bio: newUser.bio,
      avatar: newUser.avatar,
      interests: newUser.interests,
      followers: newUser.followers,
      following: newUser.following,
      posts_count: newUser.postsCount,
      is_verified: newUser.isVerified,
      joined_at: newUser.joinedAt,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        deleteAccount,
        updateUser,
        setUserData,
        loginAsDemo,
        sendOtp,
        verifyOtp,
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
