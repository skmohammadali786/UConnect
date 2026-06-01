import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { safeInsertNotification } from "@/utils/notifications";
import {
  decryptChatMessage,
  encryptChatMessage,
  ensureChatKeyPair,
} from "@/utils/chatEncryption";

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
  participantIsVerified: boolean;
  isAnonymous: boolean;
  isRevealed: boolean;
  isBlocked: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

interface ConversationParticipantDetails {
  username?: string;
  avatar?: string | null;
  publicKey?: string | null;
  isVerified?: boolean;
}

interface ChatContextType {
  conversations: Conversation[];
  sendMessage: (
    conversationId: string,
    content: string,
    senderId: string,
  ) => Promise<boolean>;
  startConversation: (
    participantId: string,
    participantUsername: string,
    isAnonymous: boolean,
    participantDetails?: ConversationParticipantDetails,
  ) => Promise<string>;
  markRead: (conversationId: string) => void;
  revealIdentity: (conversationId: string) => void;
  blockUser: (conversationId: string) => Promise<boolean>;
  deleteConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface EncryptionReadiness {
  webCryptoAvailable: boolean;
  senderKeyPair: { publicKeyRaw: string; privateKeyJwk: JsonWebKey } | null;
  senderProfilePublicKey: string | null;
  recipientPublicKey: string | null;
}

interface ParticipantSnapshot {
  username: string | null;
  avatar: string | null;
  publicKey: string | null;
  isVerified: boolean;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatKeyPair, setChatKeyPair] = useState<{
    publicKeyRaw: string;
    privateKeyJwk: JsonWebKey;
  } | null>(null);
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);

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

  const applyParticipantSnapshot = useCallback(
    (conversationId: string, snapshot: Partial<ParticipantSnapshot>) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          return {
            ...conversation,
            participantUsername:
              snapshot.username ?? conversation.participantUsername,
            participantAvatar:
              snapshot.avatar !== undefined
                ? snapshot.avatar
                : conversation.participantAvatar,
            participantPublicKey:
              snapshot.publicKey !== undefined
                ? snapshot.publicKey
                : conversation.participantPublicKey,
            participantIsVerified:
              snapshot.isVerified ?? conversation.participantIsVerified,
          };
        }),
      );
    },
    [],
  );

  const fetchParticipantSnapshot = useCallback(
    async (participantId: string): Promise<ParticipantSnapshot | null> => {
      if (!participantId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar, is_verified, chat_public_key")
        .eq("id", participantId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        username: data.username ?? null,
        avatar: data.avatar ?? null,
        publicKey: data.chat_public_key ?? null,
        isVerified: Boolean(data.is_verified),
      };
    },
    [],
  );

  const refreshConversationParticipant = useCallback(
    async (conversationId: string, participantId: string) => {
      const snapshot = await fetchParticipantSnapshot(participantId);
      if (snapshot) {
        applyParticipantSnapshot(conversationId, snapshot);
      }
      return snapshot;
    },
    [applyParticipantSnapshot, fetchParticipantSnapshot],
  );

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: convRows } = await supabase
        .from("conversations")
        .select(
          "*, user_a_profile:profiles!conversations_user_a_fkey(username, avatar, chat_public_key, is_verified), user_b_profile:profiles!conversations_user_b_fkey(username, avatar, chat_public_key, is_verified)",
        )
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (!convRows || convRows.length === 0) {
        setConversations([]);
        return;
      }

      const convs: Conversation[] = await Promise.all(
        convRows.map(async (row: any) => {
          const isUserA = row.user_a === userId;
          const participantId = isUserA ? row.user_b : row.user_a;
          const participantProfile = isUserA
            ? row.user_b_profile
            : row.user_a_profile;
          const participantPublicKey =
            participantProfile?.chat_public_key ?? null;
          const participantUsername =
            row.is_anonymous && !row.is_revealed
              ? "anonymous"
              : (participantProfile?.username ?? "unknown");

          const { data: msgRows } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", row.id)
            .order("created_at", { ascending: true });

          const messages: Message[] = await Promise.all(
            (msgRows ?? []).map(async (m: any) => {
              let content = m.content;
              if (
                chatKeyPair?.privateKeyJwk &&
                m.encrypted_content &&
                m.encryption_iv
              ) {
                const otherPublicKey =
                  m.sender_id === userId
                    ? participantPublicKey
                    : (m.sender_public_key ?? null);
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
            }),
          );

          const unreadCount = messages.filter(
            (m) => m.senderId !== userId && !m.isRead,
          ).length;

          return {
            id: row.id,
            participantId,
            participantUsername,
            participantAvatar: participantProfile?.avatar ?? null,
            participantPublicKey,
            participantIsVerified: Boolean(participantProfile?.is_verified),
            isAnonymous: row.is_anonymous,
            isRevealed: row.is_revealed,
            isBlocked: row.is_blocked,
            lastMessage: row.last_message,
            lastMessageAt: row.last_message_at,
            unreadCount,
            messages,
          };
        }),
      );
      convs.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      );
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
    const userAChannel = supabase
      .channel(`conversations-user-a-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `user_a=eq.${userId}` },
        () => {
          loadConversations();
        },
      )
      .subscribe();
    const userBChannel = supabase
      .channel(`conversations-user-b-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `user_b=eq.${userId}` },
        () => {
          loadConversations();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(userAChannel);
      supabase.removeChannel(userBChannel);
    };
  }, [userId, loadConversations]);

  useEffect(() => {
    if (!userId || !activeConversationId) return;
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          loadConversations();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, loadConversations]);

  const verifyEncryptionReadiness = useCallback(
    async (conv: Conversation): Promise<EncryptionReadiness> => {
      const webCryptoAvailable =
        !!globalThis.crypto?.subtle && !!globalThis.crypto?.getRandomValues;

      let senderKeyPair = chatKeyPair;
      if (!senderKeyPair && userId) {
        try {
          const generated = await ensureChatKeyPair(userId);
          senderKeyPair = generated;
          setChatKeyPair(generated);
        } catch {
          senderKeyPair = null;
        }
      }

      let senderProfilePublicKey: string | null = null;
      if (userId) {
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("chat_public_key")
          .eq("id", userId)
          .single();
        senderProfilePublicKey = senderProfile?.chat_public_key ?? null;
      }

      if (
        userId &&
        senderKeyPair?.publicKeyRaw &&
        senderProfilePublicKey !== senderKeyPair.publicKeyRaw
      ) {
        senderProfilePublicKey = senderKeyPair.publicKeyRaw;
        supabase
          .from("profiles")
          .update({ chat_public_key: senderKeyPair.publicKeyRaw })
          .eq("id", userId)
          .then(() => {});
      }

      let recipientPublicKey = conv.participantPublicKey;
      if (!recipientPublicKey && conv.participantId) {
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("username, avatar, is_verified, chat_public_key")
          .eq("id", conv.participantId)
          .single();
        recipientPublicKey = recipientProfile?.chat_public_key ?? null;
        applyParticipantSnapshot(conv.id, {
          username: recipientProfile?.username ?? undefined,
          avatar: recipientProfile?.avatar ?? null,
          publicKey: recipientPublicKey,
          isVerified:
            recipientProfile?.is_verified !== undefined
              ? Boolean(recipientProfile.is_verified)
              : undefined,
        });
      }

      return {
        webCryptoAvailable,
        senderKeyPair,
        senderProfilePublicKey,
        recipientPublicKey,
      };
    },
    [applyParticipantSnapshot, chatKeyPair, userId],
  );

  const sendMessage = async (
    conversationId: string,
    content: string,
    senderId: string,
  ): Promise<boolean> => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    const participantSnapshot = await refreshConversationParticipant(
      conversationId,
      conv.participantId,
    );
    const conversationForSend = participantSnapshot
      ? {
          ...conv,
          participantUsername:
            participantSnapshot.username ?? conv.participantUsername,
          participantAvatar: participantSnapshot.avatar,
          participantPublicKey: participantSnapshot.publicKey,
          participantIsVerified: participantSnapshot.isVerified,
        }
      : conv;
    const readiness = await verifyEncryptionReadiness(conversationForSend);
    const activeKeyPair = readiness.senderKeyPair;
    const participantPublicKey = readiness.recipientPublicKey;

    let encrypted: { cipherText: string; iv: string; version: number } | null =
      null;
    const canEncrypt =
      readiness.webCryptoAvailable &&
      !!activeKeyPair?.privateKeyJwk &&
      !!activeKeyPair?.publicKeyRaw &&
      readiness.senderProfilePublicKey === activeKeyPair.publicKeyRaw &&
      !!participantPublicKey;
    if (canEncrypt) {
      try {
        encrypted = await encryptChatMessage(
          content,
          activeKeyPair!.privateKeyJwk,
          participantPublicKey!,
        );
      } catch {
        encrypted = null;
      }
    } else {
      console.info("Chat E2EE prerequisites not fully met", {
        conversationId,
        webCryptoAvailable: readiness.webCryptoAvailable,
        hasSenderKeyPair:
          !!activeKeyPair?.privateKeyJwk && !!activeKeyPair?.publicKeyRaw,
        senderProfileKeyMatched:
          !!activeKeyPair?.publicKeyRaw &&
          readiness.senderProfilePublicKey === activeKeyPair.publicKeyRaw,
        hasRecipientKey: !!participantPublicKey,
      });
    }
    const messagePreview = encrypted ? "🔒 Encrypted message" : content;
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
          ? {
              ...c,
              messages: [...c.messages, newMessage],
              lastMessage: messagePreview,
              lastMessageAt: newMessage.createdAt,
            }
          : c,
      );
      const idx = next.findIndex((c) => c.id === conversationId);
      if (idx < 0 || idx === 0) return next;
      const [updated] = next.splice(idx, 1);
      return [updated, ...next];
    });
    if (user) {
      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: messagePreview,
        encrypted_content: encrypted?.cipherText ?? null,
        encryption_iv: encrypted?.iv ?? null,
        sender_public_key: encrypted
          ? (activeKeyPair?.publicKeyRaw ?? null)
          : null,
        encryption_version: encrypted?.version ?? 1,
      });
      if (insertError) {
        console.error(
          `Failed to persist message for conversation ${conversationId}:`,
          insertError.message,
        );
        return false;
      }
      const { error: conversationError } = await supabase
        .from("conversations")
        .update({
          last_message: messagePreview,
          last_message_at: newMessage.createdAt,
        })
        .eq("id", conversationId);
      if (conversationError) {
        console.error(
          `Failed to update conversation metadata for ${conversationId}:`,
          conversationError.message,
        );
      }
      if (conversationForSend.participantId) {
        safeInsertNotification({
          user_id: conversationForSend.participantId,
          type: "message",
          title: `New message from @${user.username}`,
          body: encrypted
            ? "You received an end-to-end encrypted message."
            : "You received a new message.",
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

  const startConversation = async (
    participantId: string,
    participantUsername: string,
    isAnonymous: boolean,
    participantDetails?: ConversationParticipantDetails,
  ): Promise<string> => {
    const existing = conversations.find(
      (c) => c.participantId === participantId,
    );
    if (existing) {
      applyParticipantSnapshot(existing.id, {
        username: participantDetails?.username ?? participantUsername,
        avatar: participantDetails?.avatar,
        publicKey: participantDetails?.publicKey,
        isVerified: participantDetails?.isVerified,
      });
      refreshConversationParticipant(existing.id, participantId).catch(
        () => {},
      );
      return existing.id;
    }

    if (!user) {
      const newConvId = generateId();
      const newConv: Conversation = {
        id: newConvId,
        participantId,
        participantUsername:
          participantDetails?.username ?? participantUsername,
        participantAvatar: participantDetails?.avatar ?? null,
        participantPublicKey: participantDetails?.publicKey ?? null,
        participantIsVerified: Boolean(participantDetails?.isVerified),
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

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_a: user.id,
        user_b: participantId,
        is_anonymous: isAnonymous,
        is_revealed: !isAnonymous,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      throw new Error(error?.message ?? "Failed to start conversation");
    }

    const participantProfile = await fetchParticipantSnapshot(participantId);

    const newConv: Conversation = {
      id: data.id,
      participantId,
      participantUsername:
        participantProfile?.username ??
        participantDetails?.username ??
        participantUsername,
      participantAvatar:
        participantDetails?.avatar ?? participantProfile?.avatar ?? null,
      participantPublicKey:
        participantDetails?.publicKey ?? participantProfile?.publicKey ?? null,
      participantIsVerified:
        participantDetails?.isVerified ??
        participantProfile?.isVerified ??
        false,
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

  const markRead = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                unreadCount: 0,
                messages: c.messages.map((m) =>
                  m.senderId !== userId ? { ...m, isRead: true } : m,
                ),
              }
            : c,
        ),
      );
      if (userId) {
        (async () => {
          const { error } = await supabase.rpc("mark_conversation_read", {
            p_conversation_id: conversationId,
          });
          if (error) {
            const { error: fallbackError } = await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("conversation_id", conversationId)
              .neq("sender_id", userId);
            if (fallbackError) {
              console.error(
                `Fallback mark-read update failed for conversation ${conversationId}:`,
                fallbackError.message,
              );
            }
          }
          await loadConversations();
        })();
      }
    },
    [userId, loadConversations],
  );

  const revealIdentity = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, isRevealed: true } : c,
      ),
    );
    if (user) {
      supabase
        .from("conversations")
        .update({ is_revealed: true })
        .eq("id", conversationId)
        .then(() => {});
    }
  };

  const blockUser = useCallback(
    async (conversationId: string): Promise<boolean> => {
      let nextIsBlocked: boolean | null = null;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          nextIsBlocked = !c.isBlocked;
          return { ...c, isBlocked: nextIsBlocked };
        }),
      );

      if (nextIsBlocked === null) return false;
      if (!user) return true;

      const { error } = await supabase
        .from("conversations")
        .update({ is_blocked: nextIsBlocked })
        .eq("id", conversationId);

      if (error) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, isBlocked: !nextIsBlocked } : c,
          ),
        );
        console.error(
          `Failed to update block state for conversation ${conversationId}:`,
          error.message,
        );
        return false;
      }

      await loadConversations();
      return true;
    },
    [user, loadConversations],
  );

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (user) {
      supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .then(() => {});
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        sendMessage,
        startConversation,
        markRead,
        revealIdentity,
        blockUser,
        deleteConversation,
        setActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
