import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type ReportAction =
  | "pending"
  | "reviewed"
  | "no_action"
  | "post_deleted"
  | "warning_issued"
  | "other";

export interface Report {
  id: string;
  postId: string | null;
  reason: string;
  timestamp: string;
  status: "pending" | "reviewed" | "resolved";
  action: ReportAction;
  resolutionMessage?: string | null;
  reviewedAt?: string | null;
  postWasDeleted: boolean;
  postAuthorUsername?: string | null;
  postContentPreview?: string | null;
}

interface SocialContextType {
  followingIds: Set<string>;
  toggleFollow: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  reports: Report[];
  reportedIds: Set<string>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  hasReported: (postId: string) => boolean;
  refreshReports: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

function rowToReport(row: {
  id: number;
  post_id?: number | null;
  reason: string;
  created_at: string;
  status?: Report["status"] | null;
  action?: ReportAction | null;
  resolution_message?: string | null;
  reviewed_at?: string | null;
  post_was_deleted?: number | boolean;
  post_author_username?: string | null;
  post_content_preview?: string | null;
}): Report {
  return {
    id: row.id,
    postId: row.post_id ?? null,
    reason: row.reason,
    timestamp: row.created_at,
    status: (row.status ?? "pending") as Report["status"],
    action: (row.action ?? "pending") as ReportAction,
    resolutionMessage: row.resolution_message ?? null,
    reviewedAt: row.reviewed_at ?? null,
    postWasDeleted: Boolean(row.post_was_deleted),
    postAuthorUsername: row.post_author_username ?? null,
    postContentPreview: row.post_content_preview ?? null,
  };
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);

  const refreshReports = useCallback(async () => {
    if (!user) {
      setReports([]);
      return;
    }
    const { data } = await supabase
      .from("reports")
      .select(
        "id, post_id, reason, created_at, status, action, resolution_message, reviewed_at, post_was_deleted, post_author_username, post_content_preview",
      )
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });
    setReports((data ?? []).map(rowToReport));
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setFollowingIds(new Set());
      setReports([]);
      return;
    }
    (async () => {
      try {
        const followRes = await supabase
          .from("following")
          .select("following_id")
          .eq("follower_id", user.id);
        if (followRes.data) {
          setFollowingIds(
            new Set<number>(followRes.data.map((r: { following_id: number }) => r.following_id)),
          );
        }
        await refreshReports();
      } catch {}
    })();
  }, [user?.id, refreshReports]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`reports-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `reporter_id=eq.${user.id}`,
        },
        () => {
          refreshReports();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshReports]);

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!user) return;
      const isNowFollowing = followingIds.has(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isNowFollowing) next.delete(userId);
        else next.add(userId);
        return next;
      });
      if (isNowFollowing) {
        await supabase.rpc("unfollow_user", {
          p_follower_id: user.id,
          p_following_id: userId,
        });
      } else {
        await supabase.rpc("follow_user", {
          p_follower_id: user.id,
          p_following_id: userId,
        });
      }
    },
    [user, followingIds],
  );

  const isFollowing = useCallback(
    (userId: string) => followingIds.has(userId),
    [followingIds],
  );

  const reportPost = useCallback(
    async (postId: string, reason: string) => {
      if (!user) return;
      const optimisticReport: Report = {
        id: `local_${Date.now()}`,
        postId,
        reason,
        timestamp: new Date().toISOString(),
        status: "pending",
        action: "pending",
        resolutionMessage: null,
        reviewedAt: null,
        postWasDeleted: false,
      };
      setReports((prev) => [
        optimisticReport,
        ...prev.filter((r) => r.postId !== postId),
      ]);

      const { error } = await supabase.rpc("submit_post_report", {
        p_post_id: postId,
        p_reason: reason,
      });
      if (error) {
        setReports((prev) => prev.filter((r) => r.id !== optimisticReport.id));
        throw error;
      }
      await refreshReports();
    },
    [user, refreshReports],
  );

  const hasReported = useCallback(
    (postId: string) => reports.some((r) => r.postId === postId),
    [reports],
  );
  const reportedIds = new Set(
    reports.map((r) => r.postId).filter(Boolean) as string[],
  );

  return (
    <SocialContext.Provider
      value={{
        followingIds,
        toggleFollow,
        isFollowing,
        reports,
        reportedIds,
        reportPost,
        hasReported,
        refreshReports,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be within SocialProvider");
  return ctx;
}
