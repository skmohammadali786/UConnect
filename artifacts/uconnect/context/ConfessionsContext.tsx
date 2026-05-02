import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface ConfessionComment {
  id: string;
  authorId: string;
  ownerId?: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  createdAt: string;
}

export interface Confession {
  id: string;
  authorId: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  userVote: "up" | "down" | null;
  hasSensitiveContent: boolean;
  createdAt: string;
  comments: ConfessionComment[];
}

interface ConfessionsContextType {
  confessions: Confession[];
  addConfession: (content: string, sensitive?: boolean) => Promise<void>;
  deleteConfession: (id: string) => Promise<boolean>;
  voteConfession: (id: string, vote: "up" | "down") => void;
  addConfessionComment: (confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote">) => Promise<boolean>;
  voteConfessionComment: (confessionId: string, commentId: string, vote: "up" | "down") => void;
  deleteConfessionComment: (confessionId: string, commentId: string) => Promise<boolean>;
}

const ConfessionsContext = createContext<ConfessionsContextType | undefined>(undefined);

function getSensitiveValue(row: any) {
  return Boolean(
    row.has_sensitive_content
    ?? row.hasSensitiveContent
    ?? row.is_sensitive_content
    ?? row.is_sensitive
    ?? row.sensitive_content
    ?? row.sensitive
  );
}

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
          const ids = data.map((row: any) => row.id);
          const { data: voteRows } = await supabase
            .from("confession_votes")
            .select("confession_id, user_id, vote")
            .in("confession_id", ids);
          const voteCounts = new Map<string, { up: number; down: number }>();
          const userVotes = new Map<string, "up" | "down">();
          (voteRows ?? []).forEach((v: any) => {
            const current = voteCounts.get(v.confession_id) ?? { up: 0, down: 0 };
            if (v.vote === "up") current.up += 1;
            if (v.vote === "down") current.down += 1;
            voteCounts.set(v.confession_id, current);
            if (user && v.user_id === user.id) userVotes.set(v.confession_id, v.vote);
          });

          const mapped: Confession[] = data.map((row: any) => ({
            id: row.id,
            authorId: row.author_id ?? null,
            content: row.content,
            upvotes: voteCounts.get(row.id)?.up ?? row.upvotes ?? 0,
            downvotes: voteCounts.get(row.id)?.down ?? row.downvotes ?? 0,
            commentCount: row.comment_count,
            userVote: userVotes.get(row.id) ?? null,
            hasSensitiveContent: getSensitiveValue(row),
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
      const newC: Confession = { id: "local_" + Date.now(), authorId: null, content, upvotes: 0, downvotes: 0, commentCount: 0, userVote: null, hasSensitiveContent: sensitive, createdAt: new Date().toISOString(), comments: [] };
      setConfessions((prev) => [newC, ...prev]);
      return;
    }
    const { data } = await supabase.from("confessions").insert({
      college: user.college || "All",
      content,
      has_sensitive_content: sensitive,
    }).select().single();
    if (data) {
      const newC: Confession = {
        id: data.id,
        authorId: data.author_id,
        content: data.content,
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        userVote: null,
        hasSensitiveContent: getSensitiveValue(data),
        createdAt: data.created_at,
        comments: [],
      };
      setConfessions((prev) => [newC, ...prev]);
    }
  }, [user]);

  const deleteConfession = useCallback(async (id: string) => {
    if (!user) return false;
    let previous: Confession[] = [];
    let canDelete = false;
    setConfessions((prev) => {
      previous = prev;
      const target = prev.find((c) => c.id === id);
      canDelete = !!target && target.authorId === user.id;
      if (!canDelete) return prev;
      return prev.filter((c) => c.id !== id);
    });
    if (!canDelete) return false;
    const { error } = await supabase
      .from("confessions")
      .delete()
      .eq("id", id);
    if (error) {
      setConfessions(previous);
      return false;
    }
    return true;
  }, [user]);

  const voteConfession = useCallback((id: string, vote: "up" | "down") => {
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const prevVote = c.userVote;
      let upvotes = c.upvotes;
      let downvotes = c.downvotes;
      if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
      if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
      const nextVote: "up" | "down" | null = prevVote === vote ? null : vote;
      if (nextVote === "up") upvotes += 1;
      if (nextVote === "down") downvotes += 1;
      return { ...c, upvotes, downvotes, userVote: nextVote };
    }));
    if (!user) return;
    supabase
      .rpc("vote_confession", { p_confession_id: id, p_user_id: user.id, p_vote: vote })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to persist confession vote:", error.message);
        }
      });
  }, [user]);

  const addConfessionComment = useCallback(async (confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote">) => {
    if (!user) return false;

    const newComment: ConfessionComment = { ...comment, id: "local_" + Date.now(), upvotes: 0, downvotes: 0, userVote: null, createdAt: new Date().toISOString() };
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== confessionId) return c;
      return { ...c, commentCount: c.commentCount + 1, comments: [...c.comments, newComment] };
    }));

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
      ownerId: data.is_anonymous ? data.author_id : undefined,
      isAnonymous: data.is_anonymous,
      content: data.content,
      upvotes: data.upvotes ?? 0,
      downvotes: data.downvotes ?? 0,
      userVote: null,
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

  const voteConfessionComment = useCallback((confessionId: string, commentId: string, vote: "up" | "down") => {
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== confessionId) return c;
      return {
        ...c,
        comments: c.comments.map((cm) => {
          if (cm.id !== commentId) return cm;
          const prevVote = cm.userVote;
          let upvotes = cm.upvotes;
          let downvotes = cm.downvotes;
          if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
          if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
          const nextVote: "up" | "down" | null = prevVote === vote ? null : vote;
          if (nextVote === "up") upvotes += 1;
          if (nextVote === "down") downvotes += 1;
          return { ...cm, upvotes, downvotes, userVote: nextVote };
        }),
      };
    }));

    if (!user) return;
    supabase
      .rpc("vote_confession_comment", { p_comment_id: commentId, p_user_id: user.id, p_vote: vote })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to persist confession comment vote:", error.message);
        }
      });
  }, [user]);

  const deleteConfessionComment = useCallback(async (confessionId: string, commentId: string) => {
    if (!user) return false;
    let previous: Confession[] = [];
    let didOptimisticUpdate = false;
    setConfessions((prev) => {
      previous = prev;
      return prev.map((c) => {
        if (c.id !== confessionId) return c;
        const filtered = c.comments.filter((cm) => cm.id !== commentId);
        const nextCount = Math.max(0, c.commentCount - 1);
        const commentsChanged = filtered.length !== c.comments.length;
        if (!commentsChanged && nextCount === c.commentCount) return c;
        didOptimisticUpdate = true;
        return {
          ...c,
          commentCount: nextCount,
          comments: commentsChanged ? filtered : c.comments,
        };
      });
    });
    if (commentId.startsWith("local_")) return didOptimisticUpdate;
    const { error } = await supabase
      .from("confession_comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id);
    if (error) {
      if (didOptimisticUpdate) {
        setConfessions(previous);
      }
      return false;
    }
    await supabase.rpc("decrement_confession_comment_count", { p_confession_id: confessionId });
    return true;
  }, [user]);

  return (
    <ConfessionsContext.Provider value={{ confessions, addConfession, deleteConfession, voteConfession, addConfessionComment, voteConfessionComment, deleteConfessionComment }}>
      {children}
    </ConfessionsContext.Provider>
  );
}

export function useConfessions() {
  const ctx = useContext(ConfessionsContext);
  if (!ctx) throw new Error("useConfessions must be within ConfessionsProvider");
  return ctx;
}
