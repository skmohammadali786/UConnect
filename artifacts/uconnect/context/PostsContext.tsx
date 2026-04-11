import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  college: string;
  isAnonymous: boolean;
  tag: PostTag;
  content: string;
  mediaUrls: string[];
  videoUrl: string | null;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  commentCount: number;
  isBookmarked: boolean;
  createdAt: string;
  comments: Comment[];
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
  createPost: (post: Omit<Post, "id" | "upvotes" | "downvotes" | "userVote" | "commentCount" | "isBookmarked" | "createdAt" | "comments">) => Promise<void>;
  votePost: (postId: string, vote: "up" | "down") => void;
  bookmarkPost: (postId: string) => void;
  deletePost: (postId: string) => void;
  addComment: (postId: string, comment: Omit<Comment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote" | "replies">) => void;
  voteComment: (postId: string, commentId: string, vote: "up" | "down") => void;
  reportPost: (postId: string, reason: string) => void;
  saveDraft: (draft: Omit<Draft, "id" | "savedAt">) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  refreshPosts: () => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);
const STORAGE_KEY = "@uconnect_posts";
const DRAFTS_KEY = "@uconnect_drafts";

const SAMPLE_POSTS: Post[] = [
  { id: "1", authorId: "user1", authorUsername: "anonymous", authorAvatar: null, college: "IIT Delhi", isAnonymous: true, tag: "Confession", content: "I've been spending more time in the library pretending to study than actually studying. The WiFi is just too good there. Anyone else?", mediaUrls: [], videoUrl: null, upvotes: 142, downvotes: 3, userVote: null, commentCount: 18, isBookmarked: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "2", authorId: "user2", authorUsername: "priya_cs23", authorAvatar: null, college: "IIT Delhi", isAnonymous: false, tag: "Academic", content: "Just got placed at Google with 45 LPA! Two years ago I was failing my DSA class. It gets better, keep grinding 🎯\n\nResources that helped me most:\n• Striver's SDE Sheet\n• NeetCode 150\n• Mock interviews with seniors", mediaUrls: [], videoUrl: null, upvotes: 892, downvotes: 12, userVote: null, commentCount: 67, isBookmarked: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "3", authorId: "user3", authorUsername: "anonymous", authorAvatar: null, college: "IIT Delhi", isAnonymous: true, tag: "Rant", content: "The canteen food has gotten SO bad this semester. Paying 150 rs for something that tastes like cardboard. Where is the hostel mess committee?", mediaUrls: [], videoUrl: null, upvotes: 234, downvotes: 7, userVote: null, commentCount: 42, isBookmarked: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "4", authorId: "user4", authorUsername: "arjun_mech22", authorAvatar: null, college: "IIT Delhi", isAnonymous: false, tag: "Event", content: "Rendezvous 2025 registrations are open! Biggest cultural fest of Delhi. Student headliners, DJ nights, and competitions with 10L+ prize pool. Register by Nov 15.", mediaUrls: [], videoUrl: null, upvotes: 456, downvotes: 2, userVote: null, commentCount: 89, isBookmarked: false, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "5", authorId: "user5", authorUsername: "anonymous", authorAvatar: null, college: "IIT Delhi", isAnonymous: true, tag: "Advice", content: "To every fresher: Don't waste your first year trying to be a topper. Join clubs, make friends, explore. The real learning happens outside classrooms. Grades matter but not as much as you think right now.", mediaUrls: [], videoUrl: null, upvotes: 1204, downvotes: 18, userVote: null, commentCount: 103, isBookmarked: false, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "6", authorId: "user6", authorUsername: "shreya_ee24", authorAvatar: null, college: "IIT Delhi", isAnonymous: false, tag: "Question", content: "Has anyone done the Embedded Systems elective in 4th year? Is it worth taking or should I go for Computer Vision instead? My placements are in Dec.", mediaUrls: [], videoUrl: null, upvotes: 34, downvotes: 0, userVote: null, commentCount: 15, isBookmarked: false, createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), comments: [] },
];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const stored = JSON.parse(data) as Post[];
          if (stored.length > 0) {
            const migrated = stored.map((p) => ({
              ...p,
              authorAvatar: p.authorAvatar ?? null,
              mediaUrls: (p as any).mediaUrls ?? ((p as any).mediaUrl ? [(p as any).mediaUrl] : []),
              videoUrl: p.videoUrl ?? null,
              comments: (p.comments || []).map((c: Comment) => ({ ...c, authorAvatar: c.authorAvatar ?? null })),
            }));
            setPosts(migrated);
          }
        }
      } catch {}
    })();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFTS_KEY);
        if (raw) setDrafts(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const savePosts = useCallback(async (newPosts: Post[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts)); } catch {}
  }, []);

  const createPost = useCallback(async (postData: Omit<Post, "id" | "upvotes" | "downvotes" | "userVote" | "commentCount" | "isBookmarked" | "createdAt" | "comments">) => {
    const newPost: Post = {
      ...postData,
      id: generateId(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      commentCount: 0,
      isBookmarked: false,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const votePost = useCallback((postId: string, vote: "up" | "down") => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== postId) return p;
        const wasVoted = p.userVote === vote;
        return {
          ...p,
          upvotes: vote === "up" ? (wasVoted ? p.upvotes - 1 : p.upvotes + 1 + (p.userVote === "down" ? 1 : 0)) : p.upvotes - (p.userVote === "up" ? 1 : 0),
          downvotes: vote === "down" ? (wasVoted ? p.downvotes - 1 : p.downvotes + 1 + (p.userVote === "up" ? 1 : 0)) : p.downvotes - (p.userVote === "down" ? 1 : 0),
          userVote: wasVoted ? null : vote,
        };
      });
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const bookmarkPost = useCallback((postId: string) => {
    setPosts((prev) => {
      const updated = prev.map((p) => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p);
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const addComment = useCallback((postId: string, commentData: Omit<Comment, "id" | "createdAt" | "upvotes" | "downvotes" | "userVote" | "replies">) => {
    const newComment: Comment = {
      ...commentData,
      id: generateId(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    setPosts((prev) => {
      const updated = prev.map((p) => {
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
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const voteComment = useCallback((postId: string, commentId: string, vote: "up" | "down") => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id === commentId) {
              const wasVoted = c.userVote === vote;
              return { ...c, upvotes: vote === "up" ? (wasVoted ? c.upvotes - 1 : c.upvotes + 1) : c.upvotes, downvotes: vote === "down" ? (wasVoted ? c.downvotes - 1 : c.downvotes + 1) : c.downvotes, userVote: wasVoted ? null : vote };
            }
            return c;
          }),
        };
      });
      savePosts(updated);
      return updated;
    });
  }, [savePosts]);

  const reportPost = useCallback((postId: string, reason: string) => {}, []);

  const saveDraft = useCallback(async (draftData: Omit<Draft, "id" | "savedAt">) => {
    const newDraft: Draft = { ...draftData, id: generateId(), savedAt: new Date().toISOString() };
    setDrafts((prev) => {
      const updated = [newDraft, ...prev];
      AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteDraft = useCallback(async (draftId: string) => {
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== draftId);
      AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshPosts = useCallback(() => {
    setPosts([...SAMPLE_POSTS]);
    savePosts(SAMPLE_POSTS);
  }, [savePosts]);

  const savedPosts = posts.filter((p) => p.isBookmarked);

  return (
    <PostsContext.Provider value={{ posts, savedPosts, drafts, createPost, votePost, bookmarkPost, deletePost, addComment, voteComment, reportPost, saveDraft, deleteDraft, refreshPosts }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
}
