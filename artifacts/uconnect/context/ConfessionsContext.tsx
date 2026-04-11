import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  addConfessionComment: (confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes">) => void;
}

const STORAGE_KEY = "@uconnect_confessions";

const INITIAL: Confession[] = [
  { id: "c1", content: "I've been telling my parents I go to college every day but I haven't attended a single class in 2 months. The attendance just shows up somehow. I'm terrified they find out.", upvotes: 892, commentCount: 3, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), comments: [
    { id: "cc1", authorId: "anon", isAnonymous: true, content: "This is too relatable lol. The attendance portal is broken for me too.", upvotes: 45, createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
    { id: "cc2", authorId: "anon2", isAnonymous: true, content: "You're not alone. Half the class does this. Just don't fail internals.", upvotes: 32, createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
  ]},
  { id: "c2", content: "I helped my best friend cheat on their final exam and now they got placed at a company I got rejected from. I don't know how to feel about this.", upvotes: 445, commentCount: 2, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), comments: [
    { id: "cc3", authorId: "anon3", isAnonymous: true, content: "That karma hits different. You're a better person for not resenting them.", upvotes: 78, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ]},
  { id: "c3", content: "I have a massive crush on my professor. I know it's wrong. I just needed to say this somewhere.", upvotes: 234, commentCount: 0, userVote: null, hasSensitiveContent: true, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), comments: [] },
  { id: "c4", content: "I failed my first two semesters and almost dropped out. Now I'm in 4th year with a 9.1 CGPA. It's possible. Believe in yourself.", upvotes: 1203, commentCount: 2, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), comments: [
    { id: "cc4", authorId: "anon4", isAnonymous: true, content: "This is exactly what I needed to read today. Thank you.", upvotes: 120, createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
    { id: "cc5", authorId: "anon5", isAnonymous: false, content: "How did you turn it around? What changed for you?", upvotes: 89, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  ]},
  { id: "c5", content: "I pretend to be confident in class but I cry in the bathroom between lectures because imposter syndrome is crushing me.", upvotes: 678, commentCount: 1, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), comments: [
    { id: "cc6", authorId: "anon6", isAnonymous: true, content: "Imposter syndrome is real. You belong here. We all feel this way.", upvotes: 234, createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
  ]},
];

const ConfessionsContext = createContext<ConfessionsContextType | undefined>(undefined);

export function ConfessionsProvider({ children }: { children: React.ReactNode }) {
  const [confessions, setConfessions] = useState<Confession[]>(INITIAL);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored: Confession[] = JSON.parse(raw);
          // Merge: keep INITIAL items with their comments if not in storage
          if (stored.length > 0) {
            const storedIds = new Set(stored.map((c) => c.id));
            const missing = INITIAL.filter((c) => !storedIds.has(c.id));
            setConfessions([...stored, ...missing]);
          }
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL));
        }
      } catch {}
    })();
  }, []);

  const save = useCallback(async (data: Confession[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  // Fixed: use functional updater to avoid stale closure
  const addConfession = useCallback(async (content: string, sensitive = false) => {
    const newC: Confession = {
      id: Date.now().toString(),
      content,
      upvotes: 0,
      commentCount: 0,
      userVote: null,
      hasSensitiveContent: sensitive,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setConfessions((prev) => {
      const updated = [newC, ...prev];
      save(updated);
      return updated;
    });
  }, [save]);

  const voteConfession = useCallback((id: string, vote: "up" | "down") => {
    setConfessions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        const wasVoted = c.userVote === vote;
        return { ...c, upvotes: vote === "up" ? (wasVoted ? c.upvotes - 1 : c.upvotes + 1) : c.upvotes, userVote: wasVoted ? null : vote };
      });
      save(updated);
      return updated;
    });
  }, [save]);

  const addConfessionComment = useCallback((confessionId: string, comment: Omit<ConfessionComment, "id" | "createdAt" | "upvotes">) => {
    const newComment: ConfessionComment = { ...comment, id: Date.now().toString() + Math.random(), upvotes: 0, createdAt: new Date().toISOString() };
    setConfessions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== confessionId) return c;
        return { ...c, commentCount: c.commentCount + 1, comments: [...c.comments, newComment] };
      });
      save(updated);
      return updated;
    });
  }, [save]);

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
