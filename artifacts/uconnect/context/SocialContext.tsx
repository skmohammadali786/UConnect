import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Report {
  postId: string;
  reason: string;
  timestamp: string;
  status: "pending" | "reviewed" | "resolved";
}

interface SocialContextType {
  followingIds: Set<string>;
  toggleFollow: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  reports: Report[];
  reportedIds: Set<string>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  hasReported: (postId: string) => boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
const FOLLOWING_KEY = "@uconnect_following";
const REPORTS_KEY = "@uconnect_reports";

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [f, r] = await Promise.all([
          AsyncStorage.getItem(FOLLOWING_KEY),
          AsyncStorage.getItem(REPORTS_KEY),
        ]);
        if (f) setFollowingIds(new Set(JSON.parse(f)));
        if (r) {
          const parsed = JSON.parse(r);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "postId" in parsed[0]) {
            setReports(parsed as Report[]);
          } else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
            setReports((parsed as string[]).map((id) => ({ postId: id, reason: "Reported", timestamp: new Date().toISOString(), status: "pending" })));
          }
        }
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

  const reportPost = useCallback(async (postId: string, reason: string) => {
    const newReport: Report = { postId, reason, timestamp: new Date().toISOString(), status: "pending" };
    setReports((prev) => {
      if (prev.some((r) => r.postId === postId)) return prev;
      const next = [...prev, newReport];
      AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reportedIds = new Set(reports.map((r) => r.postId));
  const hasReported = useCallback((postId: string) => reportedIds.has(postId), [reports]);

  return (
    <SocialContext.Provider value={{ followingIds, toggleFollow, isFollowing, reports, reportedIds, reportPost, hasReported }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be within SocialProvider");
  return ctx;
}
