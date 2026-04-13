import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationsContext";
import type { Notification, NotificationType } from "@/context/NotificationsContext";
import { formatRelativeTime } from "@/utils/time";
import { TypewriterText } from "@/components/TypewriterText";

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Feather.glyphMap> = {
  reply: "message-circle",
  mention: "at-sign",
  upvote: "arrow-up",
  follow: "user-plus",
  message: "send",
  event: "calendar",
  system: "info",
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  reply: "#3B82F6",
  mention: "#8B5CF6",
  upvote: "#00A86B",
  follow: "#F59E0B",
  message: "#06B6D4",
  event: "#F97316",
  system: "#6B7280",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const handlePress = (n: Notification) => {
    markRead(n.id);
    if (n.redirectPath) {
      router.push(n.redirectPath as any);
      return;
    }
    if (!n.actionId || !n.actionType) return;
    if (n.actionType === "post") {
      router.push({ pathname: "/post/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "chat") {
      router.push({ pathname: "/chat/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "profile") {
      router.push({ pathname: "/user/[username]" as any, params: { username: n.actionId } });
    } else if (n.actionType === "internship" || n.actionType === "internship_application" || n.actionType === "internship_application_status") {
      router.push({ pathname: "/internships/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "event" || n.actionType === "event_attendee_request" || n.actionType === "event_attendee_status") {
      router.push({ pathname: "/events/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "team" || n.actionType === "team_request" || n.actionType === "team_request_status") {
      router.push({ pathname: "/teams/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "confession") {
      router.push({ pathname: "/confessions/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "note") {
      router.push({ pathname: "/notes/[id]" as any, params: { id: n.actionId } });
    } else if (n.actionType === "invite") {
      router.push("/invite");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
            opacity: headerAnim,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <TypewriterText
          text="Notifications"
          style={[styles.title, { color: colors.foreground }]}
          delay={300}
          speed={55}
        />
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            style={[styles.item, { backgroundColor: item.isRead ? colors.background : colors.primary + "08", borderBottomColor: colors.separator }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: (NOTIFICATION_COLORS[item.type] || "#6B7280") + "20" }]}>
              <Feather name={NOTIFICATION_ICONS[item.type]} size={18} color={NOTIFICATION_COLORS[item.type] || colors.mutedForeground} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.itemBody, { color: colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  markAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  item: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 12, borderBottomWidth: 1 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textWrap: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  itemTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
