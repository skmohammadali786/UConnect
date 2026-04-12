import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

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
const STORAGE_KEY = "@uconnect_notifications";

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "upvote", title: "Your post is trending", body: "142 people upvoted your anonymous post", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), actionId: "sp1", actionType: "post" },
  { id: "n2", type: "reply", title: "priya_cs23 replied", body: "\"Totally agree! The DSA sheet really helped me too\"", isRead: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), actionId: "sp2", actionType: "post" },
  { id: "n3", type: "follow", title: "New follower", body: "arjun_mech22 started following you", isRead: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), actionId: "arjun_mech22", actionType: "profile" },
  { id: "n4", type: "mention", title: "You were mentioned", body: "shreya_ee24 mentioned you in a comment", isRead: true, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), actionId: "sp6", actionType: "post" },
  { id: "n5", type: "message", title: "New message", body: "Someone wants to connect anonymously", isRead: true, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), actionId: "c1", actionType: "chat" },
  { id: "n6", type: "event", title: "Rendezvous 2025", body: "Registration closing in 2 days. Don't miss out!", isRead: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: "n7", type: "system", title: "Welcome to UConnect", body: "You're now part of the IIT Delhi community on UConnect", isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const stored = JSON.parse(data) as Notification[];
        if (stored.length > 0) setNotifications(stored);
      }
    } catch {}
  };

  const save = async (items: Notification[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  };

  const markRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      save(updated);
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      save(updated);
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      save(updated);
      return updated;
    });
  };

  const addNotification = (n: Omit<Notification, "id" | "createdAt" | "isRead">) => {
    const newN: Notification = { ...n, id: generateId(), createdAt: new Date().toISOString(), isRead: false };
    setNotifications((prev) => {
      const updated = [newN, ...prev];
      save(updated);
      return updated;
    });
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
