import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [followRes, reportRes] = await Promise.all([
          supabase.from("following").select("following_id").eq("follower_id", user.id),
          supabase.from("reports").select("post_id, reason, created_at, status").eq("reporter_id", user.id),
        ]);
        if (followRes.data) {
          setFollowingIds(new Set(followRes.data.map((r: any) => r.following_id)));
        }
        if (reportRes.data) {
          setReports(reportRes.data.map((r: any) => ({
            postId: r.post_id,
            reason: r.reason,
            timestamp: r.created_at,
            status: r.status as Report["status"],
          })));
        }
      } catch {}
    })();
  }, [user?.id]);

  const toggleFollow = useCallback(async (userId: string) => {
    if (!user) return;
    const isNowFollowing = followingIds.has(userId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isNowFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });
    if (isNowFollowing) {
      await supabase.rpc("unfollow_user", { p_follower_id: user.id, p_following_id: userId });
    } else {
      await supabase.rpc("follow_user", { p_follower_id: user.id, p_following_id: userId });
    }
  }, [user, followingIds]);

  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const reportPost = useCallback(async (postId: string, reason: string) => {
    if (!user) return;
    const newReport: Report = { postId, reason, timestamp: new Date().toISOString(), status: "pending" };
    setReports((prev) => [...prev, newReport]);
    await supabase.from("reports").insert({ reporter_id: user.id, post_id: postId, reason });
  }, [user]);

  const hasReported = useCallback((postId: string) => reports.some((r) => r.postId === postId), [reports]);
  const reportedIds = new Set(reports.map((r) => r.postId));

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
