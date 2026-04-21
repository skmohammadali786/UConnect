import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { formatRelativeTime } from "@/utils/time";
import { TypewriterText } from "@/components/TypewriterText";

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations } = useChat();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const active = conversations.filter((c) => !c.isBlocked);

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
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/chat/[id]" as any, params: { id: item.id } })} style={[styles.convItem, { borderBottomColor: colors.separator }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  createBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  convItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarImage: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  convTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lastMsg: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
