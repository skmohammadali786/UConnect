import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type NotificationType = "reply" | "mention" | "upvote" | "follow" | "message" | "event" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionId?: string;
  actionType?: "post" | "profile" | "chat";
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "isRead">) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications((data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type as NotificationType,
        title: row.title,
        body: row.body,
        isRead: row.is_read,
        createdAt: row.created_at,
        actionId: row.action_id ?? undefined,
        actionType: row.action_type ?? undefined,
      })));
    } catch {
      setNotifications([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    loadNotifications();
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadNotifications]);

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    if (user) {
      supabase.from("notifications").update({ is_read: true }).eq("id", id).then(() => {});
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (user) {
      supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).then(() => {});
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (user) {
      supabase.from("notifications").delete().eq("id", id).then(() => {});
    }
  };

  const addNotification = (n: Omit<Notification, "id" | "createdAt" | "isRead">) => {
    const newN: Notification = { ...n, id: generateId(), createdAt: new Date().toISOString(), isRead: false };
    setNotifications((prev) => [newN, ...prev]);
    if (user) {
      supabase.from("notifications").insert({
        user_id: user.id,
        type: n.type,
        title: n.title,
        body: n.body,
        action_id: n.actionId ?? null,
        action_type: n.actionType ?? null,
      }).then(() => {});
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
