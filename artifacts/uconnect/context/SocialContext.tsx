import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SocialContextType {
  followingIds: Set<string>;
  toggleFollow: (userId: string, displayName?: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  reportedIds: Set<string>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  hasReported: (postId: string) => boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
const FOLLOWING_KEY = "@uconnect_following";
const REPORTS_KEY = "@uconnect_reports";

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [f, r] = await Promise.all([
          AsyncStorage.getItem(FOLLOWING_KEY),
          AsyncStorage.getItem(REPORTS_KEY),
        ]);
        if (f) setFollowingIds(new Set(JSON.parse(f)));
        if (r) setReportedIds(new Set(JSON.parse(r)));
      } catch {}
    })();
  }, []);

  const toggleFollow = useCallback(async (userId: string) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
      AsyncStorage.setItem(FOLLOWING_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const reportPost = useCallback(async (postId: string, _reason: string) => {
    setReportedIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      AsyncStorage.setItem(REPORTS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const hasReported = useCallback((postId: string) => reportedIds.has(postId), [reportedIds]);

  return (
    <SocialContext.Provider value={{ followingIds, toggleFollow, isFollowing, reportedIds, reportPost, hasReported }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be within SocialProvider");
  return ctx;
}
