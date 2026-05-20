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
  status: "pending" | "approved" | "rejected" | "denied";
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

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
}

interface TeamsContextType {
  teams: Team[];
  memberships: TeamMembership[];
  createTeam: (data: Omit<Team, "id" | "members" | "requests" | "createdAt">) => Promise<Team>;
  requestJoin: (teamId: string, request: Omit<TeamRequest, "requestedAt" | "status">) => Promise<void>;
  cancelRequest: (teamId: string, userId: string) => Promise<void>;
  approveRequest: (teamId: string, userId: string) => Promise<void>;
  denyRequest: (teamId: string, userId: string) => Promise<void>;
  getMyTeams: (userId: string) => Team[];
  getMembership: (teamId: string) => TeamMembership | null;
  isTeamAdmin: (teamId: string) => boolean;
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
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);

  const refreshTeamsAndMemberships = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        const teamIds = data.map((t: any) => t.id);
        const { data: reqData } = teamIds.length > 0
          ? await supabase.from("team_requests").select("*").in("team_id", teamIds)
          : { data: [] as any[] };
        const reqMap = new Map<string, TeamRequest[]>();
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
        setTeams(data.map((row: any) => rowToTeam(row, reqMap.get(row.id) ?? [])));
      } else {
        setTeams([]);
      }
    } catch {
      setTeams([]);
    }

    if (user) {
      try {
        const { data: memberRows } = await supabase
          .from("team_members")
          .select("team_id,user_id,role,joined_at")
          .eq("user_id", user.id);
        setMemberships((memberRows ?? []).map((row: any) => ({
          teamId: row.team_id,
          userId: row.user_id,
          role: row.role as TeamMembership["role"],
          joinedAt: row.joined_at,
        })));
      } catch {
        setMemberships([]);
      }
    } else {
      setMemberships([]);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshTeamsAndMemberships();
  }, [refreshTeamsAndMemberships]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`teams-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => refreshTeamsAndMemberships())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_requests" }, () => refreshTeamsAndMemberships())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => refreshTeamsAndMemberships())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshTeamsAndMemberships]);

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
    refreshTeamsAndMemberships();
    return newTeam;
  }, [user, refreshTeamsAndMemberships]);

  const requestJoin = useCallback(async (teamId: string, request: Omit<TeamRequest, "requestedAt" | "status">) => {
    const newReq: TeamRequest = { ...request, requestedAt: new Date().toISOString(), status: "pending" };
    setTeams((prev) => prev.map((t) => {
      if (t.id !== teamId) return t;
      const idx = t.requests.findIndex((r) => r.userId === request.userId);
      if (idx >= 0) {
        const next = [...t.requests];
        next[idx] = newReq;
        return { ...t, requests: next };
      }
      return { ...t, requests: [...t.requests, newReq] };
    }));
    if (user) {
      await supabase.from("team_requests").upsert({
        team_id: teamId,
        user_id: request.userId,
        username: request.username,
        display_name: request.displayName,
        college: request.college,
        message: request.message,
        status: "pending",
      }, { onConflict: "team_id,user_id" });
      refreshTeamsAndMemberships();
    }
  }, [user, refreshTeamsAndMemberships]);

  const cancelRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, requests: t.requests.filter((r) => r.userId !== userId) }));
    if (user) {
      await supabase.from("team_requests").delete().eq("team_id", teamId).eq("user_id", userId);
      refreshTeamsAndMemberships();
    }
  }, [user, refreshTeamsAndMemberships]);

  const approveRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        members: Math.min(t.maxMembers, t.members + 1),
        requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "approved" as const } : r),
      };
    }));
    if (user) {
      await supabase.from("team_requests").update({ status: "approved" }).eq("team_id", teamId).eq("user_id", userId);
      await supabase.from("team_members").upsert({
        team_id: teamId,
        user_id: userId,
        role: "member",
      }, { onConflict: "team_id,user_id" });
      refreshTeamsAndMemberships();
    }
  }, [user, refreshTeamsAndMemberships]);

  const denyRequest = useCallback(async (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, requests: t.requests.map((r) => r.userId === userId ? { ...r, status: "rejected" as const } : r) }));
    if (user) {
      await supabase.from("team_requests").update({ status: "rejected" }).eq("team_id", teamId).eq("user_id", userId);
      refreshTeamsAndMemberships();
    }
  }, [user, refreshTeamsAndMemberships]);

  const getMyTeams = useCallback(
    (userId: string) => {
      const membershipTeamIds = new Set(
        memberships.filter((m) => m.userId === userId).map((m) => m.teamId),
      );
      return teams.filter((t) => t.posterId === userId || membershipTeamIds.has(t.id));
    },
    [teams, memberships],
  );

  const getMembership = useCallback(
    (teamId: string) => memberships.find((m) => m.teamId === teamId) ?? null,
    [memberships],
  );

  const isTeamAdmin = useCallback(
    (teamId: string) => {
      if (!user) return false;
      const membership = memberships.find((m) => m.teamId === teamId);
      if (membership?.role === "admin") return true;
      return teams.some((t) => t.id === teamId && t.posterId === user.id);
    },
    [memberships, teams, user?.id],
  );

  const getPendingRequests = useCallback((userId: string) => {
    const result: { team: Team; request: TeamRequest }[] = [];
    teams.forEach((t) => {
      if (t.posterId !== userId) return;
      t.requests.filter((r) => r.status === "pending").forEach((r) => result.push({ team: t, request: r }));
    });
    return result;
  }, [teams]);

  return (
    <TeamsContext.Provider value={{ teams, memberships, createTeam, requestJoin, cancelRequest, approveRequest, denyRequest, getMyTeams, getMembership, isTeamAdmin, getPendingRequests }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error("useTeams must be within TeamsProvider");
  return ctx;
}
