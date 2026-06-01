import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBubble } from "@/components/ChatBubble";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

const OFFICIAL_UCONNECT_BADGE_COLOR = "#EE4B2B";
const DEFAULT_VERIFIED_BADGE_COLOR = "#16A34A";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, participantId, username } = useLocalSearchParams<{
    id: string;
    participantId?: string;
    username?: string;
  }>();
  const {
    conversations,
    sendMessage,
    markRead,
    revealIdentity,
    blockUser,
    startConversation,
    setActiveConversation,
  } = useChat();
  const { user } = useAuth();
  const { showError, showInfo } = useToast();
  const [message, setMessage] = useState("");
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [revealModalVisible, setRevealModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    setActiveConversation(id);
    return () => setActiveConversation(null);
  }, [id, setActiveConversation]);

  const conv = conversations.find((c) => c.id === id);
  const incomingUnreadCount = conv
    ? conv.messages.filter((m) => m.senderId !== user?.id && !m.isRead).length
    : 0;

  useEffect(() => {
    const resolvedParticipantId = participantId ?? id;
    if (!user || !resolvedParticipantId || conv) return;
    startConversation(resolvedParticipantId, username ?? "user", false, {
      username: username ?? "user",
    })
      .then((convId) => {
        if (convId !== id) {
          router.replace({
            pathname: "/chat/[id]" as any,
            params: {
              id: convId,
              participantId: resolvedParticipantId,
              username,
            },
          });
        }
      })
      .catch(() => {});
  }, [id, participantId, username, user?.id, conv?.id]);

  useEffect(() => {
    if (!conv || incomingUnreadCount === 0) return;
    markRead(conv.id);
  }, [conv?.id, incomingUnreadCount, markRead]);

  if (!user) return null;

  if (!conv) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 16}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
              backgroundColor: colors.headerBg,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerName, { color: colors.foreground }]}>
              Message
            </Text>
          </View>
          <View style={styles.headerActions} />
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 24,
          }}
        >
          <Feather
            name="message-circle"
            size={36}
            color={colors.mutedForeground}
          />
          <Text
            style={[
              styles.blockedText,
              { color: colors.mutedForeground, textAlign: "center" },
            ]}
          >
            Loading conversation…
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const handleSend = async () => {
    if (!message.trim()) return;
    const ok = await sendMessage(conv.id, message.trim(), user.id);
    if (!ok) {
      showInfo(
        "Encryption unavailable",
        "Could not send encrypted message right now. Please try again.",
      );
      return;
    }
    setMessage("");
  };

  const handleReveal = () => setRevealModalVisible(true);
  const handleBlock = () => setBlockModalVisible(true);
  const canViewProfile =
    !(conv.isAnonymous && !conv.isRevealed) &&
    !!conv.participantUsername &&
    conv.participantUsername !== "unknown";
  const handleOpenProfile = () => {
    if (!canViewProfile) return;
    router.push({
      pathname: "/user/[username]" as any,
      params: { username: conv.participantUsername },
    });
  };
  const handleBlockConfirm = async () => {
    setBlockModalVisible(false);
    const ok = await blockUser(conv.id);
    if (!ok)
      showError("Action failed", "Please try blocking/unblocking again.");
  };

  const displayName =
    conv.isAnonymous && !conv.isRevealed
      ? "Anonymous"
      : conv.participantUsername;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 16}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={handleOpenProfile}
          activeOpacity={canViewProfile ? 0.75 : 1}
          disabled={!canViewProfile}
        >
          {conv.isAnonymous && !conv.isRevealed ? (
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Feather name="user-x" size={16} color={colors.mutedForeground} />
            </View>
          ) : conv.participantAvatar ? (
            <Image
              source={{ uri: conv.participantAvatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Feather name="user" size={16} color={colors.primary} />
            </View>
          )}
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerName, { color: colors.foreground }]}>
              {displayName}
            </Text>
            {!conv.isAnonymous && conv.participantIsVerified && (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    backgroundColor:
                      conv.participantUsername?.toLowerCase() === "uconnect"
                        ? OFFICIAL_UCONNECT_BADGE_COLOR
                        : DEFAULT_VERIFIED_BADGE_COLOR,
                  },
                ]}
              >
                <Feather name="check" size={10} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {conv.isAnonymous && !conv.isRevealed && (
            <TouchableOpacity onPress={handleReveal} style={styles.headerBtn}>
              <Feather name="eye" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleBlock} style={styles.headerBtn}>
            <Feather
              name={conv.isBlocked ? "shield" : "shield-off"}
              size={18}
              color={conv.isBlocked ? colors.primary : colors.destructive}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Anonymous banner */}
      {conv.isAnonymous && !conv.isRevealed && (
        <View
          style={[
            styles.anonBanner,
            {
              backgroundColor: colors.primary + "15",
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Feather name="shield" size={14} color={colors.primary} />
          <Text style={[styles.anonText, { color: colors.primary }]}>
            Anonymous conversation. Identities are hidden until revealed.
          </Text>
        </View>
      )}
      <View
        style={[
          styles.e2eeBanner,
          {
            backgroundColor: colors.secondary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Feather name="lock" size={13} color={colors.primary} />
        <Text style={[styles.e2eeText, { color: colors.mutedForeground }]}>
          Messages are end-to-end encrypted.
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={[...conv.messages].reverse()}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            isMe={item.senderId === user.id || item.senderId === "me"}
          />
        )}
        contentContainerStyle={{ padding: 16, gap: 0 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input */}
      {!conv.isBlocked ? (
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4,
            },
          ]}
        >
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
            placeholderTextColor={colors.placeholder}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.input,
                borderColor: colors.border,
              },
            ]}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: message.trim() ? colors.primary : colors.muted,
              },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={message.trim() ? "#FFFFFF" : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.blockedBar,
            {
              backgroundColor: colors.muted,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4,
            },
          ]}
        >
          <Text style={[styles.blockedText, { color: colors.mutedForeground }]}>
            User is blocked
          </Text>
          <TouchableOpacity
            onPress={async () => {
              const ok = await blockUser(conv.id);
              if (!ok) showError("Unblock failed", "Please try again.");
            }}
            style={[
              styles.unblockBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.unblockBtnText, { color: colors.primary }]}>
              Unblock
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmModal
        visible={blockModalVisible}
        title={conv.isBlocked ? "Unblock User" : "Block User"}
        message={
          conv.isBlocked
            ? "You can receive messages from this person again."
            : "You won't receive messages from this person until you unblock them."
        }
        confirmText={conv.isBlocked ? "Unblock" : "Block"}
        cancelText="Cancel"
        variant={conv.isBlocked ? "warning" : "danger"}
        onConfirm={handleBlockConfirm}
        onCancel={() => setBlockModalVisible(false)}
      />

      <ConfirmModal
        visible={revealModalVisible}
        title="Reveal Identity"
        message="This will reveal your username to this person. They will be able to see who you are."
        confirmText="Reveal"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          setRevealModalVisible(false);
          revealIdentity(conv.id);
        }}
        onCancel={() => setRevealModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6 },
  anonBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  anonText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  e2eeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  e2eeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  blockedBar: { padding: 16, alignItems: "center", gap: 10 },
  blockedText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unblockBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
