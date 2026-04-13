import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  startConversation: (participantId: string, participantUsername: string, isAnonymous: boolean) => Promise<string>;
  markRead: (conversationId: string) => void;
  revealIdentity: (conversationId: string) => void;
  blockUser: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    loadConversations();
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadConversations]);

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
    if (user) {
      const conv = conversations.find((c) => c.id === conversationId);
      supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      }).then(() => {});
      supabase.from("conversations").update({ last_message: content, last_message_at: newMessage.createdAt }).eq("id", conversationId).then(() => {});
      if (conv?.participantId) {
        supabase.from("notifications").insert({
          user_id: conv.participantId,
          type: "message",
          title: `New message from @${user.username}`,
          body: content.length > 80 ? `${content.slice(0, 80)}...` : content,
          action_id: conversationId,
          action_type: "chat",
        }).then(() => {});
      }
    }
  };

  const startConversation = async (participantId: string, participantUsername: string, isAnonymous: boolean): Promise<string> => {
    const existing = conversations.find((c) => c.participantId === participantId);
    if (existing) return existing.id;

    if (!user) {
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
      return newConvId;
    }

    const { data, error } = await supabase.from("conversations").insert({
      user_a: user.id,
      user_b: participantId,
      is_anonymous: isAnonymous,
      is_revealed: !isAnonymous,
    }).select("id").single();

    if (error || !data?.id) {
      throw new Error(error?.message ?? "Failed to start conversation");
    }

    const newConv: Conversation = {
      id: data.id,
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
    return data.id;
  };

  const markRead = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId
        ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, isRead: true })) }
        : c
    ));
    if (user) {
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
    if (user) {
      supabase.from("conversations").update({ is_revealed: true }).eq("id", conversationId).then(() => {});
    }
  };

  const blockUser = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, isBlocked: !c.isBlocked } : c
    ));
    if (user) {
      const conv = conversations.find((c) => c.id === conversationId);
      supabase.from("conversations").update({ is_blocked: !conv?.isBlocked }).eq("id", conversationId).then(() => {});
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (user) {
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
