import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { formatRelativeTime } from "@/utils/time";
import { TypewriterText } from "@/components/TypewriterText";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

const OFFICIAL_UCONNECT_BADGE_COLOR = "#EE4B2B";
const DEFAULT_VERIFIED_BADGE_COLOR = "#16A34A";

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, deleteConversation } = useChat();
  const { showSuccess } = useToast();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const active = conversations.filter((c) => !c.isBlocked);
  const handleRequestDelete = (conversationId: string, name: string) => {
    setConversationToDelete({ id: conversationId, name });
    setDeleteConfirmVisible(true);
  };
  const handleDeleteConversation = () => {
    if (!conversationToDelete) return;
    deleteConversation(conversationToDelete.id);
    showSuccess("Chat deleted");
    setDeleteConfirmVisible(false);
    setConversationToDelete(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TypewriterText
          text="Messages"
          style={[styles.title, { color: colors.foreground }]}
          delay={300}
          speed={65}
        />
        <TouchableOpacity onPress={() => router.push("/chat/new")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
      <View style={[styles.e2eeBanner, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
        <Feather name="lock" size={13} color={colors.primary} />
        <Text style={[styles.e2eeText, { color: colors.mutedForeground }]}>All chats are end-to-end encrypted.</Text>
      </View>
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/chat/[id]" as any, params: { id: item.id } })}
            onLongPress={() => handleRequestDelete(item.id, item.isAnonymous && !item.isRevealed ? "Anonymous" : item.participantUsername)}
            style={[styles.convItem, { borderBottomColor: colors.separator }]}
          >
            {item.isAnonymous && !item.isRevealed ? (
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <Feather name="user-x" size={20} color={colors.mutedForeground} />
              </View>
            ) : item.participantAvatar ? (
              <Image source={{ uri: item.participantAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="user" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.convInfo}>
              <View style={styles.convHeader}>
                <Text style={[styles.convName, { color: colors.foreground }]}>
                  {item.isAnonymous && !item.isRevealed ? "Anonymous" : item.participantUsername}
                </Text>
                {!(item.isAnonymous && !item.isRevealed) && item.participantIsVerified ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: item.participantUsername?.toLowerCase() === "uconnect" ? OFFICIAL_UCONNECT_BADGE_COLOR : DEFAULT_VERIFIED_BADGE_COLOR }]}>
                    <Feather name="check" size={9} color="#FFF" />
                  </View>
                ) : null}
                <Text style={[styles.convTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.lastMessageAt)}</Text>
              </View>
              <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>{item.lastMessage || "Start a conversation..."}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Start an anonymous conversation with someone from your campus</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 20 }}
      />
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete chat"
        message={conversationToDelete ? `Delete chat with ${conversationToDelete.name}? This cannot be undone.` : "Delete this chat? This cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConversation}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setConversationToDelete(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  createBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  e2eeBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 12 },
  e2eeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  convItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarImage: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  convTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  lastMsg: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
