import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface TeamRequest {
  userId: string;
  username: string;
  displayName: string;
  college: string;
  message: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
}

export interface Team {
  id: string;
  title: string;
  type: string;
  description: string;
  skills: string[];
  members: number;
  maxMembers: number;
  deadline: string;
  poster: string;
  posterId: string;
  requests: TeamRequest[];
  createdAt: string;
}

interface TeamsContextType {
  teams: Team[];
  createTeam: (data: Omit<Team, "id" | "members" | "requests" | "createdAt">) => Promise<Team>;
  requestJoin: (teamId: string, request: Omit<TeamRequest, "requestedAt" | "status">) => Promise<void>;
  cancelRequest: (teamId: string, userId: string) => Promise<void>;
  approveRequest: (teamId: string, userId: string) => Promise<void>;
  denyRequest: (teamId: string, userId: string) => Promise<void>;
  getMyTeams: (userId: string) => Team[];
  getPendingRequests: (userId: string) => { team: Team; request: TeamRequest }[];
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);
const STORAGE_KEY = "@uconnect_teams";
const JOIN_KEY = "@uconnect_requested_teams";

const DEFAULT_TEAMS: Team[] = [
  {
    id: "t1",
    title: "Looking for ML team members for Smart India Hackathon",
    type: "Hackathon",
    description: "Building an AI-based crop disease detection system. Need 2 more team members.",
    skills: ["Python", "TensorFlow", "Computer Vision"],
    members: 2,
    maxMembers: 4,
    deadline: "Nov 20",
    poster: "priya_cs23",
    posterId: "user_priya",
    requests: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t2",
    title: "Startup co-founders wanted - EdTech idea",
    type: "Startup",
    description: "Working on a peer-to-peer tutoring platform. Looking for a designer and a backend dev.",
    skills: ["React Native", "Node.js", "UI/UX"],
    members: 1,
    maxMembers: 3,
    deadline: "Open",
    poster: "arjun_mech22",
    posterId: "user_arjun",
    requests: [],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t3",
    title: "ACM ICPC team — need competitive programmer",
    type: "Competition",
    description: "Our team qualified for regionals. One member dropped. Need someone rated 1800+ on Codeforces.",
    skills: ["CP", "Algorithms", "C++"],
    members: 2,
    maxMembers: 3,
    deadline: "Nov 30",
    poster: "anonymous",
    posterId: "user_anon",
    requests: [],
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t4",
    title: "Research project: NLP for Indian languages",
    type: "Research",
    description: "IIT Delhi NLP lab project. Looking for students interested in NLP and ML research.",
    skills: ["NLP", "Python", "PyTorch"],
    members: 3,
    maxMembers: 5,
    deadline: "Dec 15",
    poster: "shreya_ee24",
    posterId: "user_shreya",
    requests: [],
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
  },
];

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        try {
          const saved: Team[] = JSON.parse(v);
          if (saved.length > 0) {
            const savedIds = new Set(saved.map((t) => t.id));
            const missing = DEFAULT_TEAMS.filter((d) => !savedIds.has(d.id));
            setTeams([...saved, ...missing]);
          }
        } catch {}
      }
    });
  }, []);

  const persistUserTeams = useCallback(async (allTeams: Team[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allTeams));
  }, []);

  const createTeam = useCallback(async (data: Omit<Team, "id" | "members" | "requests" | "createdAt">): Promise<Team> => {
    const newTeam: Team = {
      ...data,
      id: "team_" + Date.now(),
      members: 1,
      requests: [],
      createdAt: new Date().toISOString(),
    };
    setTeams((prev) => {
      const next = [newTeam, ...prev];
      persistUserTeams(next);
      return next;
    });
    return newTeam;
  }, [persistUserTeams]);

  const requestJoin = useCallback(async (teamId: string, request: Omit<TeamRequest, "requestedAt" | "status">) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id !== teamId) return t;
        const alreadyRequested = t.requests.find((r) => r.userId === request.userId);
        if (alreadyRequested) return t;
        return {
          ...t,
          requests: [...t.requests, { ...request, requestedAt: new Date().toISOString(), status: "pending" as const }],
        };
      });
      persistUserTeams(next);
      return next;
    });
    await AsyncStorage.getItem(JOIN_KEY).then(async (v) => {
      const ids: string[] = v ? JSON.parse(v) : [];
      if (!ids.includes(teamId)) {
        await AsyncStorage.setItem(JOIN_KEY, JSON.stringify([...ids, teamId]));
      }
    });
  }, [persistUserTeams]);

  const cancelRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id !== teamId) return t;
        return { ...t, requests: t.requests.filter((r) => r.userId !== userId) };
      });
      persistUserTeams(next);
      return next;
    });
    await AsyncStorage.getItem(JOIN_KEY).then(async (v) => {
      const ids: string[] = v ? JSON.parse(v) : [];
      await AsyncStorage.setItem(JOIN_KEY, JSON.stringify(ids.filter((i) => i !== teamId)));
    });
  }, [persistUserTeams]);

  const approveRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          members: t.members + 1,
          requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "approved" as const } : r),
        };
      });
      persistUserTeams(next);
      return next;
    });
  }, [persistUserTeams]);

  const denyRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "denied" as const } : r),
        };
      });
      persistUserTeams(next);
      return next;
    });
  }, [persistUserTeams]);

  const getMyTeams = useCallback((userId: string) => {
    return teams.filter((t) => t.posterId === userId);
  }, [teams]);

  const getPendingRequests = useCallback((userId: string) => {
    const result: { team: Team; request: TeamRequest }[] = [];
    teams.forEach((t) => {
      if (t.posterId !== userId) return;
      t.requests.filter((r) => r.status === "pending").forEach((r) => {
        result.push({ team: t, request: r });
      });
    });
    return result;
  }, [teams]);

  return (
    <TeamsContext.Provider value={{ teams, createTeam, requestJoin, cancelRequest, approveRequest, denyRequest, getMyTeams, getPendingRequests }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error("useTeams must be within TeamsProvider");
  return ctx;
}
