import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type PostTag =
  | "General" | "Academic" | "Campus Life" | "Rant" | "Advice"
  | "Meme" | "Question" | "Achievement" | "Event" | "Confession";

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  createdAt: string;
  replies: Comment[];
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string | null;
  authorAuraRingColor?: string;
  authorIsVerified?: boolean;
  college: string;
  isAnonymous: boolean;
  tag: PostTag;
  content: string;
  mediaUrls: string[];
  videoUrl: string | null;
  videoProvider?: "r2" | "gumlet";
  videoAssetId?: string | null;
  upvotes: number;
  downvotes: number;
  repostCount: number;
  userVote: "up" | "down" | null;
  commentCount: number;
  isBookmarked: boolean;
  createdAt: string;
  comments: Comment[];
  autoDeleteAt?: string;
  repostedByUsername?: string;
  repostedByUserId?: string;
  repostedAt?: string;
  feedItemKey?: string;
}

export interface Draft {
  id: string;
  content: string;
  tag: PostTag;
  isAnonymous: boolean;
  savedAt: string;
}

interface PostsContextType {
  posts: Post[];
  savedPosts: Post[];
  drafts: Draft[];
  isLoading: boolean;
  createPost: (post: Omit<Post, "id" | "upvotes" | "downvotes" | "repostCount" | "userVote" | "commentCount" | "isBookmarked" | "createdAt" | "comments" | "repostedByUsername" | "repostedAt">) => Promise<void>;
  votePost: (postId: string, vote: "up" | "down") => void;
  bookmarkPost: (postId: string) => void;
  deletePost: (postId: string) => void;
  addComment: (postId: string, comment: Omit<Comment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote" | "replies">) => Promise<boolean>;
  voteComment: (postId: string, commentId: string, vote: "up" | "down") => void;
  reportPost: (postId: string, reason: string) => void;
  saveDraft: (draft: Omit<Draft, "id" | "savedAt">) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  refreshPosts: () => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  hasReposted: (postId: string) => boolean;
  adjustCommentCount: (postId: string, delta: number) => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

type GumletPlaybackResponse = {
  playbackUrl: 
  string | null;
};


function rowToPost(row: any, userVote: "up" | "down" | null = null, isBookmarked = false, comments: Comment[] = []): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorUsername: row.is_anonymous ? "anonymous" : row.author_username,
    authorAvatar: row.is_anonymous ? null : row.author_avatar,
    authorAuraRingColor: row.is_anonymous ? undefined : (row.author_aura_ring_color ?? row.author_avatar_ring_color ?? "#6366F1"),
    authorIsVerified: row.is_anonymous ? false : (row.author_is_verified ?? false),
    college: row.college,
    isAnonymous: row.is_anonymous,
    tag: row.tag as PostTag,
    content: row.content,
    mediaUrls: row.media_urls ?? [],
    videoUrl: row.video_url ?? null,
    videoProvider: row.video_provider ?? undefined,
    videoAssetId: row.video_asset_id ?? null,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    repostCount: row.repost_count ?? 0,
    userVote,
    commentCount: row.comment_count ?? 0,
    isBookmarked,
    createdAt: row.created_at,
    comments,
    autoDeleteAt: row.auto_delete_at ?? undefined,
  };
}

function rowToComment(row: any, userVote: "up" | "down" | null = null, replies: Comment[] = []): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id ?? null,
    authorId: row.author_id,
    authorUsername: row.is_anonymous ? "anonymous" : row.author_username,
    authorAvatar: row.is_anonymous ? null : row.author_avatar,
    isAnonymous: row.is_anonymous,
    content: row.content,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    userVote,
    createdAt: row.created_at,
    replies,
  };
}

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set());
  const postsRef = useRef<Post[]>([]);

  const applyPosts = useCallback((list: Post[]) => {
    postsRef.current = list;
    setPosts(list);
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const [postsRes, votesRes, bookmarksRes, repostsRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .or(`auto_delete_at.is.null,auto_delete_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false })
          .limit(100),
        user
          ? supabase.from("post_votes").select("post_id, vote").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabase.from("bookmarks").select("post_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabase.from("reposts").select("post_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (postsRes.data && postsRes.data.length > 0) {
        const voteMap = new Map<string, "up" | "down">();
        (votesRes.data ?? []).forEach((v: any) => voteMap.set(v.post_id, v.vote));
        const bookmarkSet = new Set<string>((bookmarksRes.data ?? []).map((b: any) => b.post_id));
        setRepostedPostIds(new Set<string>((repostsRes.data ?? []).map((r: any) => r.post_id)));
        const authorIds = Array.from(new Set(postsRes.data.filter((row: any) => !row.is_anonymous).map((row: any) => row.author_id)));
        const { data: authorProfiles } = authorIds.length > 0
          ? await supabase.from("profiles").select("id,username,avatar,avatar_ring_color,is_verified").in("id", authorIds)
          : { data: [] as any[] };
        const authorMap = new Map((authorProfiles ?? []).map((p: any) => [p.id, p]));

        const now = Date.now();
        const mapped = postsRes.data.map((row: any) => {
          const profile = authorMap.get(row.author_id);
          return rowToPost(
            {
              ...row,
              author_username: row.is_anonymous ? row.author_username : (profile?.username ?? row.author_username),
              author_avatar: row.is_anonymous ? null : (profile?.avatar ?? row.author_avatar),
              author_aura_ring_color: row.is_anonymous ? null : (profile?.avatar_ring_color ?? "#6366F1"),
              author_is_verified: row.is_anonymous ? false : Boolean(profile?.is_verified),
            },
            voteMap.get(row.id) ?? null,
            bookmarkSet.has(row.id),
          );
        }).filter((p) => !p.autoDeleteAt || new Date(p.autoDeleteAt).getTime() > now);
        applyPosts(mapped);
      } else {
        applyPosts([]);
        setRepostedPostIds(new Set());
      }

      // Fetch drafts
      if (user) {
        const { data: draftRows } = await supabase
          .from("drafts")
          .select("*")
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false });
        if (draftRows) {
          setDrafts(draftRows.map((d: any) => ({
            id: d.id,
            content: d.content,
            tag: d.tag as PostTag,
            isAnonymous: d.is_anonymous,
            savedAt: d.saved_at,
          })));
        }
      }
    } catch {
      applyPosts([]);
    }
    setIsLoading(false);
  }, [user, applyPosts]);

  useEffect(() => {
    fetchPosts();
  }, [user?.id]);

  const resolveGumletPlaybackUrl = useCallback(async (postId: string, assetId: string) => {
    const maxPolls = 20;
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const status = await supabase.functions.invoke<GumletPlaybackResponse>("gumlet-video-upload", {
        body: { action: "getPlayback", assetId },
      });
      if (status.error) continue;
      if (!status.data?.playbackUrl) continue;

      const playbackUrl = status.data.playbackUrl;
      const { error } = await supabase
        .from("posts")
        .update({ video_url: playbackUrl })
        .eq("id", postId)
        .eq("video_asset_id", assetId);

      if (!error) {
        applyPosts(postsRef.current.map((p) => (p.id === postId ? { ...p, videoUrl: playbackUrl } : p)));
      }
      return;
    }
  }, [applyPosts]);

  const createPost = useCallback(async (postData: Omit<Post, "id" | "upvotes" | "downvotes" | "repostCount" | "userVote" | "commentCount" | "isBookmarked" | "createdAt" | "comments" | "repostedByUsername" | "repostedAt">) => {
    if (!user) {
      // Demo mode: local only
      const newPost: Post = {
        ...postData,
        id: "local_" + Date.now(),
        upvotes: 0,
        downvotes: 0,
        repostCount: 0,
        userVote: null,
        commentCount: 0,
        isBookmarked: false,
        createdAt: new Date().toISOString(),
        comments: [],
      };
      applyPosts([newPost, ...postsRef.current]);
      return;
    }

    const { data, error } = await supabase.from("posts").insert({
      author_id: user.id,
      author_username: user.username,
      author_avatar: user.avatar,
      college: postData.college,
      is_anonymous: postData.isAnonymous,
      tag: postData.tag,
      content: postData.content,
      media_urls: postData.mediaUrls,
      video_url: postData.videoUrl,
      video_provider: postData.videoProvider ?? "r2",
      video_asset_id: postData.videoAssetId ?? null,
      auto_delete_at: postData.autoDeleteAt ?? null,
    }).select().single();

    if (error) throw error;

    if (data) {
      const newPost = rowToPost(data);
      applyPosts([newPost, ...postsRef.current]);
      if (!newPost.videoUrl && newPost.videoProvider === "gumlet" && newPost.videoAssetId) {
        void resolveGumletPlaybackUrl(newPost.id, newPost.videoAssetId);
      }
      // Update post count
      await supabase.from("profiles").update({ posts_count: (user.postsCount ?? 0) + 1 }).eq("id", user.id);
    }
  }, [user, applyPosts, resolveGumletPlaybackUrl]);

  const votePost = useCallback((postId: string, vote: "up" | "down") => {
    if (!user) {
      const updated = postsRef.current.map((p) => {
        if (p.id !== postId) return p;
        const wasVoted = p.userVote === vote;
        return {
          ...p,
          upvotes: vote === "up" ? (wasVoted ? p.upvotes - 1 : p.upvotes + 1 + (p.userVote === "down" ? 1 : 0)) : p.upvotes - (p.userVote === "up" ? 1 : 0),
          downvotes: vote === "down" ? (wasVoted ? p.downvotes - 1 : p.downvotes + 1 + (p.userVote === "up" ? 1 : 0)) : p.downvotes - (p.userVote === "down" ? 1 : 0),
          userVote: wasVoted ? null : vote,
        };
      });
      applyPosts(updated);
      return;
    }

    // Optimistic update
    const updated = postsRef.current.map((p) => {
      if (p.id !== postId) return p;
      const wasVoted = p.userVote === vote;
      return {
        ...p,
        upvotes: vote === "up" ? (wasVoted ? p.upvotes - 1 : p.upvotes + 1 + (p.userVote === "down" ? 1 : 0)) : p.upvotes - (p.userVote === "up" ? 1 : 0),
        downvotes: vote === "down" ? (wasVoted ? p.downvotes - 1 : p.downvotes + 1 + (p.userVote === "up" ? 1 : 0)) : p.downvotes - (p.userVote === "down" ? 1 : 0),
        userVote: wasVoted ? null : vote,
      };
    });
    applyPosts(updated);
    supabase.rpc("vote_post", { p_post_id: postId, p_user_id: user.id, p_vote: vote }).then(() => {});
  }, [user, applyPosts, resolveGumletPlaybackUrl]);

  const bookmarkPost = useCallback((postId: string) => {
    const post = postsRef.current.find((p) => p.id === postId);
    if (!post) return;

    const updated = postsRef.current.map((p) => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p);
    applyPosts(updated);

    if (!user) return;

    if (post.isBookmarked) {
      supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId).then(() => {});
    } else {
      supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId }).then(() => {});
    }
  }, [user, applyPosts, resolveGumletPlaybackUrl]);

  const deletePost = useCallback((postId: string) => {
    const updated = postsRef.current.filter((p) => p.id !== postId);
    applyPosts(updated);
    if (user) {
      supabase.from("posts").delete().eq("id", postId).then(() => {});
    }
  }, [user, applyPosts, resolveGumletPlaybackUrl]);

  const addComment = useCallback(async (postId: string, commentData: Omit<Comment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote" | "replies">) => {
    const newComment: Comment = {
      ...commentData,
      id: "local_" + Date.now(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    const updated = postsRef.current.map((p) => {
      if (p.id !== postId) return p;
      if (commentData.parentId) {
        return {
          ...p,
          commentCount: p.commentCount + 1,
          comments: p.comments.map((c) =>
            c.id === commentData.parentId ? { ...c, replies: [...c.replies, newComment] } : c
          ),
        };
      }
      return { ...p, commentCount: p.commentCount + 1, comments: [...p.comments, newComment] };
    });
    applyPosts(updated);

    if (!user) return false;

    const { data, error } = await supabase.from("comments").insert({
        post_id: postId,
        parent_id: commentData.parentId ?? null,
        author_id: user.id,
        author_username: user.username,
        author_avatar: user.avatar,
        is_anonymous: commentData.isAnonymous,
        content: commentData.content,
      }).select("*").single();

    if (error || !data) {
      applyPosts(postsRef.current.map((p) => {
        if (p.id !== postId) return p;
        if (commentData.parentId) {
          return {
            ...p,
            commentCount: Math.max(0, p.commentCount - 1),
            comments: p.comments.map((c) =>
              c.id === commentData.parentId
                ? { ...c, replies: c.replies.filter((r) => r.id !== newComment.id) }
                : c
            ),
          };
        }
        return {
          ...p,
          commentCount: Math.max(0, p.commentCount - 1),
          comments: p.comments.filter((c) => c.id !== newComment.id),
        };
      }));
      return false;
    }

    const persistedComment = rowToComment(data);
    applyPosts(postsRef.current.map((p) => {
      if (p.id !== postId) return p;
      if (commentData.parentId) {
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentData.parentId
              ? {
                ...c,
                replies: c.replies.map((r) => (r.id === newComment.id ? persistedComment : r)),
              }
              : c
          ),
        };
      }
      return {
        ...p,
        comments: p.comments.map((c) => (c.id === newComment.id ? persistedComment : c)),
      };
    }));

    supabase.rpc("increment_comment_count", { p_post_id: postId }).then(() => {});
    return true;
  }, [user, applyPosts, resolveGumletPlaybackUrl]);

  const voteComment = useCallback((postId: string, commentId: string, vote: "up" | "down") => {
    const applyVote = (c: Comment): Comment => {
      const prevVote = c.userVote;
      let upvotes = c.upvotes;
      let downvotes = c.downvotes;
      if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
      if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
      const nextVote: "up" | "down" | null = prevVote === vote ? null : vote;
      if (nextVote === "up") upvotes += 1;
      if (nextVote === "down") downvotes += 1;
      return { ...c, upvotes, downvotes, userVote: nextVote };
    };
    const updateTree = (comments: Comment[]): Comment[] =>
      comments.map((c) => {
        if (c.id === commentId) return applyVote(c);
        if (c.replies.length === 0) return c;
        return { ...c, replies: updateTree(c.replies) };
      });

    const updated = postsRef.current.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: updateTree(p.comments),
      };
    });
    applyPosts(updated);
    if (!user) return;

    supabase
      .rpc("vote_comment", { p_comment_id: commentId, p_user_id: user.id, p_vote: vote })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to persist comment vote:", error.message);
        }
      });
  }, [applyPosts, user]);

  const adjustCommentCount = useCallback((postId: string, delta: number) => {
    if (delta === 0) return;
    applyPosts(postsRef.current.map((p) => (
      p.id === postId
        ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
        : p
    )));
  }, [applyPosts]);

  const reportPost = useCallback((postId: string, reason: string) => {
    if (!user) return;
    supabase.from("reports").insert({ reporter_id: user.id, post_id: postId, reason }).then(() => {});
  }, [user]);

  const saveDraft = useCallback(async (draftData: Omit<Draft, "id" | "savedAt">) => {
    if (!user) {
      const newDraft: Draft = { ...draftData, id: "draft_" + Date.now(), savedAt: new Date().toISOString() };
      setDrafts((prev) => [newDraft, ...prev]);
      return;
    }
    const { data, error } = await supabase.from("drafts").insert({
      user_id: user.id,
      content: draftData.content,
      tag: draftData.tag,
      is_anonymous: draftData.isAnonymous,
    }).select().single();
    if (error) throw error;

    if (data) {
      const newDraft: Draft = { id: data.id, content: data.content, tag: data.tag, isAnonymous: data.is_anonymous, savedAt: data.saved_at };
      setDrafts((prev) => [newDraft, ...prev]);
    }
  }, [user]);

  const deleteDraft = useCallback(async (draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    if (user) {
      await supabase.from("drafts").delete().eq("id", draftId);
    }
  }, [user]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const hasReposted = useCallback((postId: string) => repostedPostIds.has(postId), [repostedPostIds]);

  const toggleRepost = useCallback(async (postId: string) => {
    if (!user) return;
    const isReposted = repostedPostIds.has(postId);

    setRepostedPostIds((prev) => {
      const next = new Set(prev);
      if (isReposted) next.delete(postId);
      else next.add(postId);
      return next;
    });

    applyPosts(
      postsRef.current.map((p) =>
        p.id === postId
          ? { ...p, repostCount: Math.max(0, p.repostCount + (isReposted ? -1 : 1)) }
          : p
      )
    );

    if (isReposted) {
      const { error } = await supabase.rpc("undo_repost_post", { p_user_id: user.id, p_post_id: postId });
      if (error) {
        setRepostedPostIds((prev) => new Set(prev).add(postId));
        applyPosts(postsRef.current.map((p) => (p.id === postId ? { ...p, repostCount: p.repostCount + 1 } : p)));
      }
    } else {
      const { error } = await supabase.rpc("repost_post", { p_user_id: user.id, p_post_id: postId });
      if (error) {
        setRepostedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        applyPosts(postsRef.current.map((p) => (p.id === postId ? { ...p, repostCount: Math.max(0, p.repostCount - 1) } : p)));
      }
    }
  }, [user, repostedPostIds, applyPosts]);

  const savedPosts = posts.filter((p) => p.isBookmarked);

  return (
    <PostsContext.Provider value={{ posts, savedPosts, drafts, isLoading, createPost, votePost, bookmarkPost, deletePost, addComment, voteComment, reportPost, saveDraft, deleteDraft, refreshPosts, toggleRepost, hasReposted, adjustCommentCount }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
}
