import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface ConfessionComment {
  id: string;
  authorId: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  createdAt: string;
}

export interface Confession {
  id: string;
  content: string;
  upvotes: number;
  commentCount: number;
  userVote: "up" | "down" | null;
  hasSensitiveContent: boolean;
  createdAt: string;
  comments: ConfessionComment[];
}

interface ConfessionsContextType {
  confessions: Confession[];
  addConfession: (content: string, sensitive?: boolean) => Promise<void>;
  voteConfession: (id: string, vote: "up" | "down") => void;
  addConfessionComment: (confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes">) => Promise<boolean>;
}

const ConfessionsContext = createContext<ConfessionsContextType | undefined>(undefined);

export function ConfessionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [confessions, setConfessions] = useState<Confession[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("confessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (data && data.length > 0) {
          let voteMap = new Map<string, "up" | "down">();
          if (user) {
            const { data: votes } = await supabase
              .from("confession_votes")
              .select("confession_id, vote")
              .eq("user_id", user.id);
            (votes ?? []).forEach((v: any) => voteMap.set(v.confession_id, v.vote));
          }

          const mapped: Confession[] = data.map((row: any) => ({
            id: row.id,
            content: row.content,
            upvotes: row.upvotes,
            commentCount: row.comment_count,
            userVote: voteMap.get(row.id) ?? null,
            hasSensitiveContent: row.has_sensitive_content,
            createdAt: row.created_at,
            comments: [],
          }));
          setConfessions(mapped);
        }
      } catch {
        setConfessions([]);
      }
    })();
  }, [user?.id]);

  const addConfession = useCallback(async (content: string, sensitive = false) => {
    if (!user) {
      const newC: Confession = { id: "local_" + Date.now(), content, upvotes: 0, commentCount: 0, userVote: null, hasSensitiveContent: sensitive, createdAt: new Date().toISOString(), comments: [] };
      setConfessions((prev) => [newC, ...prev]);
      return;
    }
    const { data } = await supabase.from("confessions").insert({
      college: user.college || "All",
      content,
      has_sensitive_content: sensitive,
    }).select().single();
    if (data) {
      const newC: Confession = { id: data.id, content: data.content, upvotes: 0, commentCount: 0, userVote: null, hasSensitiveContent: data.has_sensitive_content, createdAt: data.created_at, comments: [] };
      setConfessions((prev) => [newC, ...prev]);
    }
  }, [user]);

  const voteConfession = useCallback((id: string, vote: "up" | "down") => {
    setConfessions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        const wasVoted = c.userVote === vote;
        return { ...c, upvotes: vote === "up" ? (wasVoted ? c.upvotes - 1 : c.upvotes + 1) : c.upvotes, userVote: wasVoted ? null : vote };
      });
      return updated;
    });
    if (user) {
      supabase.rpc("vote_confession", { p_confession_id: id, p_user_id: user.id, p_vote: vote }).then(() => {});
    }
  }, [user]);

  const addConfessionComment = useCallback(async (confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes">) => {
    const newComment: ConfessionComment = { ...comment, id: "local_" + Date.now(), upvotes: 0, createdAt: new Date().toISOString() };
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== confessionId) return c;
      return { ...c, commentCount: c.commentCount + 1, comments: [...c.comments, newComment] };
    }));
    if (!user) return false;

    const { data, error } = await supabase.from("confession_comments").insert({
      confession_id: confessionId,
      author_id: user.id,
      is_anonymous: comment.isAnonymous,
      content: comment.content,
    }).select("*").single();

    if (error || !data) {
      setConfessions((prev) => prev.map((c) => {
        if (c.id !== confessionId) return c;
        return {
          ...c,
          commentCount: Math.max(0, c.commentCount - 1),
          comments: c.comments.filter((cm) => cm.id !== newComment.id),
        };
      }));
      return false;
    }

    const persistedComment: ConfessionComment = {
      id: data.id,
      authorId: data.is_anonymous ? "anon" : data.author_id,
      isAnonymous: data.is_anonymous,
      content: data.content,
      upvotes: data.upvotes ?? 0,
      createdAt: data.created_at,
    };
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== confessionId) return c;
      return {
        ...c,
        comments: c.comments.map((cm) => (cm.id === newComment.id ? persistedComment : cm)),
      };
    }));

    supabase.rpc("increment_confession_comment_count", { p_confession_id: confessionId }).then(() => {});
    return true;
  }, [user]);

  return (
    <ConfessionsContext.Provider value={{ confessions, addConfession, voteConfession, addConfessionComment }}>
      {children}
    </ConfessionsContext.Provider>
  );
}

export function useConfessions() {
  const ctx = useContext(ConfessionsContext);
  if (!ctx) throw new Error("useConfessions must be within ConfessionsProvider");
  return ctx;
}
