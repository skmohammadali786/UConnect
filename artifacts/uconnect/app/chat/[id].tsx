import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBubble } from "@/components/ChatBubble";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, username } = useLocalSearchParams<{ id: string; username?: string }>();
  const { conversations, sendMessage, markRead, revealIdentity, blockUser, startConversation } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [revealModalVisible, setRevealModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conv = conversations.find((c) => c.id === id);

  useEffect(() => {
    if (!user || !id || conv) return;
    startConversation(id, username ?? "user", false)
      .then((convId) => {
        if (convId !== id) {
          router.replace({ pathname: "/chat/[id]" as any, params: { id: convId } });
        }
      })
      .catch(() => {});
  }, [id, username, user?.id, conv?.id]);

  useEffect(() => {
    if (!conv) return;
    markRead(conv.id);
  }, [conv?.id, markRead]);

  if (!user) return null;

  if (!conv) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerName, { color: colors.foreground }]}>Message</Text>
          </View>
          <View style={styles.headerActions} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
          <Feather name="message-circle" size={36} color={colors.mutedForeground} />
          <Text style={[styles.blockedText, { color: colors.mutedForeground, textAlign: "center" }]}>Loading conversation…</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(conv.id, message.trim(), user.id);
    setMessage("");
  };

  const handleReveal = () => setRevealModalVisible(true);
  const handleBlock = () => setBlockModalVisible(true);

  const displayName = conv.isAnonymous && !conv.isRevealed ? "Anonymous" : conv.participantUsername;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {conv.isAnonymous && !conv.isRevealed ? (
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Feather name="user-x" size={16} color={colors.mutedForeground} />
            </View>
          ) : conv.participantAvatar ? (
            <Image source={{ uri: conv.participantAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="user" size={16} color={colors.primary} />
            </View>
          )}
          <Text style={[styles.headerName, { color: colors.foreground }]}>{displayName}</Text>
        </View>
        <View style={styles.headerActions}>
          {conv.isAnonymous && !conv.isRevealed && (
            <TouchableOpacity onPress={handleReveal} style={styles.headerBtn}>
              <Feather name="eye" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleBlock} style={styles.headerBtn}>
            <Feather name="shield-off" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Anonymous banner */}
      {conv.isAnonymous && !conv.isRevealed && (
        <View style={[styles.anonBanner, { backgroundColor: colors.primary + "15", borderBottomColor: colors.border }]}>
          <Feather name="shield" size={14} color={colors.primary} />
          <Text style={[styles.anonText, { color: colors.primary }]}>Anonymous conversation. Identities are hidden until revealed.</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={[...conv.messages].reverse()}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => <ChatBubble message={item} isMe={item.senderId === user.id || item.senderId === "me"} />}
        contentContainerStyle={{ padding: 16, gap: 0 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input */}
      {!conv.isBlocked ? (
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4 }]}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity onPress={handleSend} disabled={!message.trim()} style={[styles.sendBtn, { backgroundColor: message.trim() ? colors.primary : colors.muted }]}>
            <Feather name="send" size={18} color={message.trim() ? "#FFFFFF" : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.blockedBar, { backgroundColor: colors.muted, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4 }]}>
          <Text style={[styles.blockedText, { color: colors.mutedForeground }]}>User is blocked</Text>
        </View>
      )}

      <ConfirmModal
        visible={blockModalVisible}
        title="Block User"
        message="You won't receive messages from this person. This action cannot be undone."
        confirmText="Block"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => { setBlockModalVisible(false); blockUser(conv.id); router.back(); }}
        onCancel={() => setBlockModalVisible(false)}
      />

      <ConfirmModal
        visible={revealModalVisible}
        title="Reveal Identity"
        message="This will reveal your username to this person. They will be able to see who you are."
        confirmText="Reveal"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => { setRevealModalVisible(false); revealIdentity(conv.id); }}
        onCancel={() => setRevealModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6 },
  anonBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  anonText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  blockedBar: { padding: 16, alignItems: "center" },
  blockedText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
