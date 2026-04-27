import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { safeInsertNotification } from "@/utils/notifications";
import { decryptChatMessage, encryptChatMessage, ensureChatKeyPair } from "@/utils/chatEncryption";

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
  participantPublicKey: string | null;
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
  sendMessage: (conversationId: string, content: string, senderId: string) => Promise<boolean>;
  startConversation: (participantId: string, participantUsername: string, isAnonymous: boolean, participantPublicKey?: string | null) => Promise<string>;
  markRead: (conversationId: string) => void;
  revealIdentity: (conversationId: string) => void;
  blockUser: (conversationId: string) => Promise<boolean>;
  deleteConversation: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatKeyPair, setChatKeyPair] = useState<{ publicKeyRaw: string; privateKeyJwk: JsonWebKey } | null>(null);

  useEffect(() => {
    if (!userId) {
      setChatKeyPair(null);
      return;
    }
    ensureChatKeyPair(userId)
      .then((pair) => {
        setChatKeyPair(pair);
        supabase
          .from("profiles")
          .update({ chat_public_key: pair.publicKeyRaw })
          .eq("id", userId)
          .neq("chat_public_key", pair.publicKeyRaw)
          .then(() => {});
      })
      .catch(() => {
        setChatKeyPair(null);
      });
  }, [userId]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("*, user_a_profile:profiles!conversations_user_a_fkey(username, avatar, chat_public_key), user_b_profile:profiles!conversations_user_b_fkey(username, avatar, chat_public_key)")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (!convRows || convRows.length === 0) {
        setConversations([]);
        return;
      }

      const convs: Conversation[] = await Promise.all(convRows.map(async (row: any) => {
        const isUserA = row.user_a === userId;
        const participantId = isUserA ? row.user_b : row.user_a;
        const participantProfile = isUserA ? row.user_b_profile : row.user_a_profile;
        const participantPublicKey = participantProfile?.chat_public_key ?? null;
        const participantUsername = row.is_anonymous && !row.is_revealed ? "anonymous" : (participantProfile?.username ?? "unknown");

        const { data: msgRows } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", row.id)
          .order("created_at", { ascending: true });

        const messages: Message[] = await Promise.all((msgRows ?? []).map(async (m: any) => {
          let content = m.content;
          if (chatKeyPair?.privateKeyJwk && m.encrypted_content && m.encryption_iv) {
            const otherPublicKey = m.sender_id === userId ? participantPublicKey : (m.sender_public_key ?? null);
            if (otherPublicKey) {
              const decrypted = await decryptChatMessage(
                m.encrypted_content,
                m.encryption_iv,
                chatKeyPair.privateKeyJwk,
                otherPublicKey,
              );
              content = decrypted ?? "🔒 Encrypted message";
            } else {
              content = "🔒 Encrypted message";
            }
          }
          return {
            id: m.id,
            senderId: m.sender_id,
            content,
            isRead: m.is_read,
            createdAt: m.created_at,
            isRevealed: m.is_revealed,
          };
        }));

        const unreadCount = messages.filter((m) => m.senderId !== userId && !m.isRead).length;

        return {
          id: row.id,
          participantId,
          participantUsername,
          participantAvatar: participantProfile?.avatar ?? null,
          participantPublicKey,
          isAnonymous: row.is_anonymous,
          isRevealed: row.is_revealed,
          isBlocked: row.is_blocked,
          lastMessage: row.last_message,
          lastMessageAt: row.last_message_at,
          unreadCount,
          messages,
        };
      }));
      convs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(convs);
    } catch {
      setConversations([]);
    }
  }, [chatKeyPair?.privateKeyJwk, userId]);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      return;
    }
    loadConversations();
  }, [userId, loadConversations]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-sync-${userId}`)
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
  }, [userId, loadConversations]);

  const sendMessage = async (conversationId: string, content: string, senderId: string): Promise<boolean> => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    if (!chatKeyPair?.privateKeyJwk || !chatKeyPair.publicKeyRaw || !conv.participantPublicKey) {
      return false;
    }
    let encrypted: { cipherText: string; iv: string; version: number };
    try {
      encrypted = await encryptChatMessage(content, chatKeyPair.privateKeyJwk, conv.participantPublicKey);
    } catch {
      return false;
    }
    const newMessage: Message = {
      id: generateId(),
      senderId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      isRevealed: false,
    };
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMessage], lastMessage: "🔒 Encrypted message", lastMessageAt: newMessage.createdAt }
          : c
      );
      const idx = next.findIndex((c) => c.id === conversationId);
      if (idx < 0 || idx === 0) return next;
      const [updated] = next.splice(idx, 1);
      return [updated, ...next];
    });
    if (user) {
      supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: "🔒 Encrypted message",
        encrypted_content: encrypted.cipherText,
        encryption_iv: encrypted.iv,
        sender_public_key: chatKeyPair.publicKeyRaw,
        encryption_version: encrypted.version,
      }).then(({ error }) => {
        if (error) {
          console.error(`Failed to persist message for conversation ${conversationId}:`, error.message);
        }
      });
      supabase.from("conversations").update({ last_message: "🔒 Encrypted message", last_message_at: newMessage.createdAt }).eq("id", conversationId).then(({ error }) => {
        if (error) {
          console.error(`Failed to update conversation metadata for ${conversationId}:`, error.message);
        }
      });
        if (conv?.participantId) {
          safeInsertNotification({
            user_id: conv.participantId,
            type: "message",
            title: `New message from @${user.username}`,
            body: "You received an end-to-end encrypted message.",
            action_id: conversationId,
            action_type: "chat",
            redirect_path: `/chat/${conversationId}`,
            entity_type: "conversation",
            entity_id: conversationId,
            secondary_entity_type: "sender",
            secondary_entity_id: senderId,
            metadata: { source: "chat_message" },
          }).then((error) => {
            if (error) {
              console.warn("Failed to send chat notification:", error.message);
            }
          });
        }
    }
    return true;
  };

  const startConversation = async (participantId: string, participantUsername: string, isAnonymous: boolean, participantPublicKey?: string | null): Promise<string> => {
    const existing = conversations.find((c) => c.participantId === participantId);
    if (existing) return existing.id;

    if (!user) {
      const newConvId = generateId();
      const newConv: Conversation = {
        id: newConvId,
        participantId,
        participantUsername,
        participantAvatar: null,
        participantPublicKey: participantPublicKey ?? null,
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
      participantPublicKey: participantPublicKey ?? null,
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

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            unreadCount: 0,
            messages: c.messages.map((m) =>
              m.senderId !== userId ? { ...m, isRead: true } : m
            ),
          }
        : c
    ));
    if (userId) {
      (async () => {
        const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
        if (error) {
          const { error: fallbackError } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", userId);
          if (fallbackError) {
            console.error(`Fallback mark-read update failed for conversation ${conversationId}:`, fallbackError.message);
          }
        }
        await loadConversations();
      })();
    }
  }, [userId, loadConversations]);

  const revealIdentity = (conversationId: string) => {
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId ? { ...c, isRevealed: true } : c
    ));
    if (user) {
      supabase.from("conversations").update({ is_revealed: true }).eq("id", conversationId).then(() => {});
    }
  };

  const blockUser = useCallback(async (conversationId: string): Promise<boolean> => {
    let nextIsBlocked: boolean | null = null;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        nextIsBlocked = !c.isBlocked;
        return { ...c, isBlocked: nextIsBlocked };
      })
    );

    if (nextIsBlocked === null) return false;
    if (!user) return true;

    const { error } = await supabase
      .from("conversations")
      .update({ is_blocked: nextIsBlocked })
      .eq("id", conversationId);

    if (error) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, isBlocked: !nextIsBlocked } : c))
      );
      console.error(`Failed to update block state for conversation ${conversationId}:`, error.message);
      return false;
    }

    await loadConversations();
    return true;
  }, [user, loadConversations]);

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
