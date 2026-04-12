import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isRevealed: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantUsername: string;
  participantAvatar: string | null;
  isAnonymous: boolean;
  isRevealed: boolean;
  isBlocked: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

interface ChatContextType {
  conversations: Conversation[];
  sendMessage: (conversationId: string, content: string, senderId: string) => void;
  startConversation: (participantId: string, participantUsername: string, isAnonymous: boolean) => string;
  markRead: (conversationId: string) => void;
  revealIdentity: (conversationId: string) => void;
  blockUser: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1", participantId: "u1", participantUsername: "anonymous", participantAvatar: null,
    isAnonymous: true, isRevealed: false, isBlocked: false,
    lastMessage: "Hey, saw your post about DSA prep. Can you share your resources?",
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), unreadCount: 2,
    messages: [
      { id: "m1", senderId: "u1", content: "Hey, saw your post about DSA prep. Can you share your resources?", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isRevealed: false },
      { id: "m2", senderId: "u1", content: "I'm really struggling with graph problems", isRead: false, createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), isRevealed: false },
    ],
  },
  {
    id: "c2", participantId: "u2", participantUsername: "arjun_mech22", participantAvatar: null,
    isAnonymous: false, isRevealed: true, isBlocked: false,
    lastMessage: "See you at the hackathon tomorrow!",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), unreadCount: 0,
    messages: [
      { id: "m3", senderId: "u2", content: "Are you going for the hackathon?", isRead: true, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), isRevealed: true },
      { id: "m4", senderId: "me", content: "Yes! Registered yesterday", isRead: true, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), isRevealed: true },
      { id: "m5", senderId: "u2", content: "See you at the hackathon tomorrow!", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isRevealed: true },
    ],
  },
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);

  useEffect(() => {
    if (!user || user.id === "demo_user_001") {
      setConversations(SAMPLE_CONVERSATIONS);
      return;
    }
    loadConversations();
  }, [user?.id]);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("*, user_a_profile:profiles!conversations_user_a_fkey(username, avatar), user_b_profile:profiles!conversations_user_b_fkey(username, avatar)")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (!convRows || convRows.length === 0) {
        setConversations([]);
        return;
      }

      const convs: Conversation[] = await Promise.all(convRows.map(async (row: any) => {
        const isUserA = row.user_a === user.id;
        const participantId = isUserA ? row.user_b : row.user_a;
        const participantProfile = isUserA ? row.user_b_profile : row.user_a_profile;
        const participantUsername = row.is_anonymous && !row.is_revealed ? "anonymous" : (participantProfile?.username ?? "unknown");

        const { data: msgRows } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", row.id)
          .order("created_at", { ascending: true });

        const messages: Message[] = (msgRows ?? []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          isRead: m.is_read,
          createdAt: m.created_at,
          isRevealed: m.is_revealed,
        }));

        const unreadCount = messages.filter((m) => m.senderId !== user.id && !m.isRead).length;

        return {
          id: row.id,
          participantId,
          participantUsername,
          participantAvatar: participantProfile?.avatar ?? null,
          isAnonymous: row.is_anonymous,
          isRevealed: row.is_revealed,
          isBlocked: row.is_blocked,
          lastMessage: row.last_message,
          lastMessageAt: row.last_message_at,
          unreadCount,
          messages,
        };
      }));
      setConversations(convs);
    } catch {
      setConversations([]);
    }
  };

  const sendMessage = (conversationId: string, content: string, senderId: string) => {
    const newMessage: Message = {
      id: generateId(),
      senderId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      isRevealed: false,
    };
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, newMessage], lastMessage: content, lastMessageAt: newMessage.createdAt }
        : c
    ));
    if (user && user.id !== "demo_user_001") {
      supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      }).then(() => {});
      supabase.from("conversations").update({ last_message: content, last_message_at: newMessage.createdAt }).eq("id", conversationId).then(() => {});
    }
  };

  const startConversation = (participantId: string, participantUsername: string, isAnonymous: boolean): string => {
    const existing = conversations.find((c) => c.participantId === participantId);
    if (existing) return existing.id;
    const newConvId = generateId();
    const newConv: Conversation = {
      id: newConvId,
      participantId,
      participantUsername,
      participantAvatar: null,
      isAnonymous,
      isRevealed: !isAnonymous,
      isBlocked: false,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    if (user && user.id !== "demo_user_001") {
      supabase.from("conversations").insert({
        user_a: user.id,
        user_b: participantId,
        is_anonymous: isAnonymous,
        is_revealed: !isAnonymous,
      }).then(() => {});
    }
    return newConvId;
  };

  const markRead = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId
        ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, isRead: true })) }
        : c
    ));
    if (user && user.id !== "demo_user_001") {
      supabase.from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .then(() => {});
    }
  };

  const revealIdentity = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, isRevealed: true } : c
    ));
    if (user && user.id !== "demo_user_001") {
      supabase.from("conversations").update({ is_revealed: true }).eq("id", conversationId).then(() => {});
    }
  };

  const blockUser = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, isBlocked: !c.isBlocked } : c
    ));
    if (user && user.id !== "demo_user_001") {
      const conv = conversations.find((c) => c.id === conversationId);
      supabase.from("conversations").update({ is_blocked: !conv?.isBlocked }).eq("id", conversationId).then(() => {});
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (user && user.id !== "demo_user_001") {
      supabase.from("conversations").delete().eq("id", conversationId).then(() => {});
    }
  };

  return (
    <ChatContext.Provider value={{ conversations, sendMessage, startConversation, markRead, revealIdentity, blockUser, deleteConversation }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
