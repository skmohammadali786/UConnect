import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationsContext";
import type { Notification } from "@/context/NotificationsContext";
import { formatRelativeTime } from "@/utils/time";
import { TypewriterText } from "@/components/TypewriterText";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

const NOTIFICATION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  reply: "message-circle",
  mention: "at-sign",
  upvote: "arrow-up",
  follow: "user-plus",
  message: "send",
  event: "calendar",
  team: "users",
  internship: "briefcase",
  confession: "message-square",
  note: "file-text",
  invite: "gift",
  system: "info",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  reply: "#3B82F6",
  mention: "#8B5CF6",
  upvote: "#00A86B",
  follow: "#F59E0B",
  message: "#06B6D4",
  event: "#F97316",
  team: "#8B5CF6",
  internship: "#14B8A6",
  confession: "#6366F1",
  note: "#10B981",
  invite: "#F59E0B",
  system: "#6B7280",
};

const NOTIFICATION_EMOJIS: Record<string, string> = {
  reply: "💬",
  mention: "📣",
  upvote: "🔥",
  follow: "🤝",
  message: "✉️",
  event: "📅",
  team: "👥",
  internship: "💼",
  confession: "🤫",
  note: "📝",
  invite: "🎉",
  system: "🔔",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markRead, markAllRead, clearAllNotifications } = useNotifications();
  const { showError, showSuccess } = useToast();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = React.useState(false);

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

  const elevatedCard = {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 2,
  };

  const handleDeleteAll = async () => {
    setShowDeleteAllConfirm(false);
    const ok = await clearAllNotifications();
    if (ok) {
      showSuccess("Notifications cleared", "All notifications were deleted.");
    } else {
      showError("Failed to delete", "Could not delete notifications. Please try again.");
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
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 2,
          },
        ]}
      >
        <TypewriterText
          text="Notifications"
          style={[styles.title, { color: colors.foreground }]}
          delay={300}
          speed={55}
        />
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={() => setShowDeleteAllConfirm(true)} style={[styles.markAllBtn, { backgroundColor: "#EF444415" }]}>
              <Text style={[styles.markAll, { color: "#EF4444" }]}>Delete all</Text>
            </TouchableOpacity>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={[styles.markAllBtn, { backgroundColor: colors.primarySoft }]}> 
              <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === "web" ? 34 : 90 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            style={[
              styles.item,
              elevatedCard,
              {
                backgroundColor: item.isRead ? colors.card : colors.primary + "12",
                borderColor: item.isRead ? colors.border : colors.primary + "45",
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: (NOTIFICATION_COLORS[item.type] || "#6B7280") + "20" }]}>
              <Text style={styles.emoji}>{NOTIFICATION_EMOJIS[item.type] || "🔔"}</Text>
              <Feather
                name={NOTIFICATION_ICONS[item.type] || "bell"}
                size={16}
                color={NOTIFICATION_COLORS[item.type] || colors.mutedForeground}
              />
            </View>
            <View style={styles.textWrap}>
              <View style={styles.titleRow}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.isRead ? (
                  <View style={[styles.newPill, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "35" }]}>
                    <Text style={[styles.newPillText, { color: colors.primary }]}>NEW</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.itemBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.body}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
                <Text style={[styles.itemType, { color: NOTIFICATION_COLORS[item.type] || colors.mutedForeground }]}>
                  {NOTIFICATION_EMOJIS[item.type] || "🔔"} {item.type}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Feather name="bell-off" size={44} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No notifications yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>You're all caught up. Activity from your network will appear here.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <ConfirmModal
        visible={showDeleteAllConfirm}
        title="Delete all notifications"
        message="This will permanently remove all your notifications."
        confirmText="Delete all"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  markAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" },
  emoji: { position: "absolute", top: -7, right: -5, fontSize: 14 },
  textWrap: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, gap: 8 },
  itemTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemType: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  newPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  newPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 12, paddingTop: 90, paddingHorizontal: 24 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" },
});
