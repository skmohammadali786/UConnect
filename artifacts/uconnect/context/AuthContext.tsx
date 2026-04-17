import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  email: string;
  phone: string;
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
  signIn: (email: string, password: string) => Promise<{ error: string | null; isNewUser: boolean }>;
  signUp: (email: string, password: string, phone?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUserData: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email ?? "",
    phone: row.phone ?? "",
    username: row.username ?? "",
    displayName: row.display_name ?? "",
    college: row.college ?? "",
    branch: row.branch ?? "",
    year: row.year ?? "",
    bio: row.bio ?? "",
    avatar: row.avatar ?? null,
    interests: row.interests ?? [],
    followers: row.followers ?? 0,
    following: row.following ?? 0,
    postsCount: row.posts_count ?? 0,
    isVerified: row.is_verified ?? false,
    joinedAt: row.joined_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id);
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
        .maybeSingle();
      if (data && !error) {
        setUser(rowToUser(data));
      }
    } catch {}
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null; isNewUser: boolean }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message, isNewUser: false };

    const userId = data.user?.id;
    if (!userId) return { error: "Sign in failed. Please try again.", isNewUser: false };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    return { error: null, isNewUser: !profile };
  };

  const signUp = async (email: string, password: string, phone?: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { phone: phone ?? "" },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      console.warn("Local sign-out failed, retrying global sign-out");
      try {
        await supabase.auth.signOut();
      } catch {
        console.error("Global sign-out failed");
      }
    }
    setUser(null);
  };

  const deleteAccount = async () => {
    if (user) {
      try {
        await supabase.rpc("delete_account");
      } catch {
        await supabase.from("profiles").delete().eq("id", user.id);
      }
    }
    await AsyncStorage.multiRemove(["@uconnect_settings"]).catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await supabase.from("profiles").update({
      display_name: updated.displayName,
      username: updated.username,
      college: updated.college,
      branch: updated.branch,
      year: updated.year,
      bio: updated.bio,
      avatar: updated.avatar,
      interests: updated.interests,
      phone: updated.phone,
    }).eq("id", user.id);
  };

  const setUserData = async (newUser: User) => {
    setUser(newUser);
    await supabase.from("profiles").upsert({
      id: newUser.id,
      email: newUser.email,
      phone: newUser.phone ?? "",
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
        signIn,
        signUp,
        logout,
        deleteAccount,
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
