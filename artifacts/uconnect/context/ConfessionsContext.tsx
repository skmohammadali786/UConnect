import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Confession {
  id: string;
  content: string;
  upvotes: number;
  commentCount: number;
  userVote: "up" | "down" | null;
  hasSensitiveContent: boolean;
  createdAt: string;
}

interface ConfessionsContextType {
  confessions: Confession[];
  addConfession: (content: string, sensitive?: boolean) => Promise<void>;
  voteConfession: (id: string, vote: "up" | "down") => void;
}

const STORAGE_KEY = "@uconnect_confessions";

const INITIAL: Confession[] = [
  { id: "c1", content: "I've been telling my parents I go to college every day but I haven't attended a single class in 2 months. The attendance just shows up somehow. I'm terrified they find out.", upvotes: 892, commentCount: 67, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "c2", content: "I helped my best friend cheat on their final exam and now they got placed at a company I got rejected from. I don't know how to feel about this.", upvotes: 445, commentCount: 89, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "c3", content: "I have a massive crush on my professor. I know it's wrong. I just needed to say this somewhere.", upvotes: 234, commentCount: 34, userVote: null, hasSensitiveContent: true, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: "c4", content: "I failed my first two semesters and almost dropped out. Now I'm in 4th year with a 9.1 CGPA. It's possible. Believe in yourself.", upvotes: 1203, commentCount: 145, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: "c5", content: "I pretend to be confident in class but I cry in the bathroom between lectures because imposter syndrome is crushing me.", upvotes: 678, commentCount: 92, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
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
          if (stored.length > 0) setConfessions(stored);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL));
        }
      } catch {}
    })();
  }, []);

  const save = useCallback(async (data: Confession[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const addConfession = async (content: string, sensitive = false) => {
    const newC: Confession = {
      id: Date.now().toString(),
      content,
      upvotes: 0,
      commentCount: 0,
      userVote: null,
      hasSensitiveContent: sensitive,
      createdAt: new Date().toISOString(),
    };
    const updated = [newC, ...confessions];
    setConfessions(updated);
    await save(updated);
  };

  const voteConfession = (id: string, vote: "up" | "down") => {
    setConfessions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        const wasVoted = c.userVote === vote;
        return {
          ...c,
          upvotes: vote === "up" ? (wasVoted ? c.upvotes - 1 : c.upvotes + 1) : c.upvotes,
          userVote: wasVoted ? null : vote,
        };
      });
      save(updated);
      return updated;
    });
  };

  return (
    <ConfessionsContext.Provider value={{ confessions, addConfession, voteConfession }}>
      {children}
    </ConfessionsContext.Provider>
  );
}

export function useConfessions() {
  const ctx = useContext(ConfessionsContext);
  if (!ctx) throw new Error("useConfessions must be within ConfessionsProvider");
  return ctx;
}
