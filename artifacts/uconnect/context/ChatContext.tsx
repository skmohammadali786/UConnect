import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

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
const STORAGE_KEY = "@uconnect_chats";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    participantId: "u1",
    participantUsername: "anonymous",
    participantAvatar: null,
    isAnonymous: true,
    isRevealed: false,
    isBlocked: false,
    lastMessage: "Hey, saw your post about DSA prep. Can you share your resources?",
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    unreadCount: 2,
    messages: [
      { id: "m1", senderId: "u1", content: "Hey, saw your post about DSA prep. Can you share your resources?", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isRevealed: false },
      { id: "m2", senderId: "u1", content: "I'm really struggling with graph problems", isRead: false, createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), isRevealed: false },
    ],
  },
  {
    id: "c2",
    participantId: "u2",
    participantUsername: "arjun_mech22",
    participantAvatar: null,
    isAnonymous: false,
    isRevealed: true,
    isBlocked: false,
    lastMessage: "See you at the hackathon tomorrow!",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    messages: [
      { id: "m3", senderId: "u2", content: "Are you going for the hackathon?", isRead: true, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), isRevealed: true },
      { id: "m4", senderId: "me", content: "Yes! Registered yesterday", isRead: true, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), isRevealed: true },
      { id: "m5", senderId: "u2", content: "See you at the hackathon tomorrow!", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isRevealed: true },
    ],
  },
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const stored = JSON.parse(data) as Conversation[];
        if (stored.length > 0) setConversations(stored);
      }
    } catch {}
  };

  const saveChats = async (chats: Conversation[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {}
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
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMessage], lastMessage: content, lastMessageAt: newMessage.createdAt }
          : c
      );
      saveChats(updated);
      return updated;
    });
  };

  const startConversation = (participantId: string, participantUsername: string, isAnonymous: boolean): string => {
    const existing = conversations.find((c) => c.participantId === participantId);
    if (existing) return existing.id;
    const newConv: Conversation = {
      id: generateId(),
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
    setConversations((prev) => {
      const updated = [newConv, ...prev];
      saveChats(updated);
      return updated;
    });
    return newConv.id;
  };

  const markRead = (conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, isRead: true })) }
          : c
      );
      saveChats(updated);
      return updated;
    });
  };

  const revealIdentity = (conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, isRevealed: true } : c
      );
      saveChats(updated);
      return updated;
    });
  };

  const blockUser = (conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, isBlocked: !c.isBlocked } : c
      );
      saveChats(updated);
      return updated;
    });
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== conversationId);
      saveChats(updated);
      return updated;
    });
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
