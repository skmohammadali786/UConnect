import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

function rowToTeam(row: any, requests: TeamRequest[] = []): Team {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    skills: row.skills ?? [],
    members: row.members ?? 1,
    maxMembers: row.max_members ?? 4,
    deadline: row.deadline,
    poster: row.poster_username,
    posterId: row.poster_id,
    requests,
    createdAt: row.created_at,
  };
}

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("teams")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (data && data.length > 0) {
          let reqMap = new Map<string, TeamRequest[]>();
          if (user) {
            const { data: reqData } = await supabase
              .from("team_requests")
              .select("*")
              .in("team_id", data.map((t: any) => t.id));
            (reqData ?? []).forEach((r: any) => {
              const req: TeamRequest = {
                userId: r.user_id,
                username: r.username,
                displayName: r.display_name,
                college: r.college,
                message: r.message,
                requestedAt: r.requested_at,
                status: r.status as TeamRequest["status"],
              };
              if (!reqMap.has(r.team_id)) reqMap.set(r.team_id, []);
              reqMap.get(r.team_id)!.push(req);
            });
          }
          setTeams(data.map((row: any) => rowToTeam(row, reqMap.get(row.id) ?? [])));
        }
      } catch {
        setTeams([]);
      }
    })();
  }, [user?.id]);

  const createTeam = useCallback(async (data: Omit<Team, "id" | "members" | "requests" | "createdAt">): Promise<Team> => {
    if (!user) {
      const newTeam: Team = { ...data, id: "team_" + Date.now(), members: 1, requests: [], createdAt: new Date().toISOString() };
      setTeams((prev) => [newTeam, ...prev]);
      return newTeam;
    }
    const { data: row } = await supabase.from("teams").insert({
      title: data.title,
      type: data.type,
      description: data.description,
      skills: data.skills,
      max_members: data.maxMembers,
      deadline: data.deadline,
      poster_id: user.id,
      poster_username: user.username,
      college: user.college,
    }).select().single();
    const newTeam = rowToTeam(row);
    setTeams((prev) => [newTeam, ...prev]);
    return newTeam;
  }, [user]);

  const requestJoin = useCallback(async (teamId: string, request: Omit<TeamRequest, "requestedAt" | "status">) => {
    const newReq: TeamRequest = { ...request, requestedAt: new Date().toISOString(), status: "pending" };
    setTeams((prev) => prev.map((t) => {
      if (t.id !== teamId) return t;
      if (t.requests.find((r) => r.userId === request.userId)) return t;
      return { ...t, requests: [...t.requests, newReq] };
    }));
    if (user) {
      await supabase.from("team_requests").insert({
        team_id: teamId,
        user_id: request.userId,
        username: request.username,
        display_name: request.displayName,
        college: request.college,
        message: request.message,
      });
    }
  }, [user]);

  const cancelRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, requests: t.requests.filter((r) => r.userId !== userId) }));
    if (user) {
      await supabase.from("team_requests").delete().eq("team_id", teamId).eq("user_id", userId);
    }
  }, [user]);

  const approveRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => {
      if (t.id !== teamId) return t;
      return { ...t, members: t.members + 1, requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "approved" as const } : r) };
    }));
    if (user) {
      await supabase.from("team_requests").update({ status: "approved" }).eq("team_id", teamId).eq("user_id", userId);
      await supabase.from("teams").update({ members: teams.find((t) => t.id === teamId)?.members ?? 1 + 1 }).eq("id", teamId);
    }
  }, [user, teams]);

  const denyRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "denied" as const } : r) }));
    if (user) {
      await supabase.from("team_requests").update({ status: "denied" }).eq("team_id", teamId).eq("user_id", userId);
    }
  }, [user]);

  const getMyTeams = useCallback((userId: string) => teams.filter((t) => t.posterId === userId), [teams]);

  const getPendingRequests = useCallback((userId: string) => {
    const result: { team: Team; request: TeamRequest }[] = [];
    teams.forEach((t) => {
      if (t.posterId !== userId) return;
      t.requests.filter((r) => r.status === "pending").forEach((r) => result.push({ team: t, request: r }));
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
