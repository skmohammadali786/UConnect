import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

export interface GhostSession {
  id: string;
  alias: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  postsCreated: number;
  commentsCreated: number;
}

interface GhostModeContextType {
  session: GhostSession | null;
  activeCount: number;
  isGhostActive: boolean;
  isLoading: boolean;
  secondsRemaining: number;
  activateGhostMode: () => Promise<GhostSession>;
  deactivateGhostMode: () => Promise<void>;
  refreshGhostMode: () => Promise<void>;
  canPerformIdentityAction: (action: string) => boolean;
}

const GhostModeContext = createContext<GhostModeContextType | undefined>(undefined);
const blockedActions = new Set([
  "create_event",
  "rsvp_event",
  "create_internship",
  "apply_internship",
  "create_team",
  "join_team",
  "vote_legend",
  "submit_verification",
  "edit_vault_score",
]);

interface RawGhostSessionRow {
  id: string;
  alias_snapshot?: string | null;
  alias?: string | null;
  ghost_alias?: string | null;
  started_at: Date;
  expires_at: Date;
  ended_at?: Date | null;
  posts_created?: number | null;
  comments_created?: number | null;
}

function mapSession(row: RawGhostSessionRow): GhostSession {
  return {
    id: row.id,
    alias: row.alias_snapshot ?? row.alias ?? row.ghost_alias ?? "Neon Phantom",
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at ?? null,
    postsCreated: row.posts_created ?? 0,
    commentsCreated: row.comments_created ?? 0,
  };
}

export function GhostModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notifications = useNotifications();
  const [session, setSession] = useState<GhostSession | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const thirtyMinuteNotified = useRef<string | null>(null);

  const refreshGhostMode = useCallback(async () => {
    if (!user) {
      setSession(null);
      setActiveCount(0);
      return;
    }
    setIsLoading(true);
    try {
      const [{ data }, countRes] = await Promise.all([
        supabase.rpc("get_active_ghost_session"),
        supabase.rpc("get_active_ghost_count"),
      ]);
      setSession(data ? mapSession(data) : null);
      setActiveCount(Number(countRes.data ?? 0));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refreshGhostMode(); }, [refreshGhostMode]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshGhostMode();
    });
    return () => sub.remove();
  }, [refreshGhostMode]);

  useEffect(() => {
    if (!user) return;
    const pollId = setInterval(refreshGhostMode, 60_000);
    return () => clearInterval(pollId);
  }, [user?.id, refreshGhostMode]);

  const secondsRemaining = session ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000)) : 0;
  const isGhostActive = Boolean(session && secondsRemaining > 0 && !session.endedAt);

  useEffect(() => {
    if (!session) return;
    if (session && secondsRemaining <= 0 && !session.endedAt) {
      notifications.addNotification({ type: "system", title: "Ghost expired", body: "Your Ghost Mode session has faded out.", actionType: "system", metadata: { feature: "ghost_mode" } });
      refreshGhostMode();
      return;
    }
    if (secondsRemaining <= 1800 && secondsRemaining > 0 && thirtyMinuteNotified.current !== session.id) {
      thirtyMinuteNotified.current = session.id;
      notifications.addNotification({ type: "system", title: "30 minutes remaining", body: `${session.alias} fades in 30 minutes.`, actionType: "system", metadata: { feature: "ghost_mode" } });
    }
  }, [session?.id, secondsRemaining, isGhostActive, refreshGhostMode]);

  const activateGhostMode = useCallback(async () => {
    if (!user?.isVerified) {
      throw new Error("Verify your profile before enabling Ghost Mode.");
    }
    const { data, error } = await supabase.rpc("activate_ghost_mode");
    if (error) throw error;
    const mapped = mapSession(data);
    setSession(mapped);
    notifications.addNotification({ type: "system", title: "Ghost activated", body: `You are now ${mapped.alias} for 6 hours.`, actionType: "system", metadata: { feature: "ghost_mode" } });
    await refreshGhostMode();
    return mapped;
  }, [notifications, refreshGhostMode, user?.isVerified]);

  const deactivateGhostMode = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase.rpc("deactivate_ghost_mode");
    if (error) throw error;
    notifications.addNotification({ type: "system", title: "Ghost disabled", body: `${session.alias} has returned to the shadows.`, actionType: "system", metadata: { feature: "ghost_mode" } });
    setSession(null);
    await refreshGhostMode();
  }, [session, notifications, refreshGhostMode]);

  const value = useMemo(() => ({
    session,
    activeCount,
    isGhostActive,
    isLoading,
    secondsRemaining,
    activateGhostMode,
    deactivateGhostMode,
    refreshGhostMode,
    canPerformIdentityAction: (action: string) => !isGhostActive || !blockedActions.has(action),
  }), [session, activeCount, isGhostActive, isLoading, secondsRemaining, activateGhostMode, deactivateGhostMode, refreshGhostMode]);

  return <GhostModeContext.Provider value={value}>{children}</GhostModeContext.Provider>;
}

export function useGhostMode() {
  const ctx = useContext(GhostModeContext);
  if (!ctx) throw new Error("useGhostMode must be within GhostModeProvider");
  return ctx;
}
