import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useEffect, useState } from "react";
import { Animated, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";

const ND = Platform.OS !== "web";

const FILTERS = ["Trending", "Latest", "Following"];

const SHORTCUTS = [
  { icon: "message-circle", label: "Confessions", route: "/confessions", color: "#EF4444" },
  { icon: "briefcase", label: "Internships", route: "/internships", color: "#8B5CF6" },
  { icon: "calendar", label: "Events", route: "/events", color: "#F59E0B" },
  { icon: "users", label: "Teams", route: "/teams", color: "#00A86B" },
  { icon: "book-open", label: "Notes", route: "/notes", color: "#3B82F6" },
  { icon: "send", label: "Chat", route: "/chat", color: "#06B6D4" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { posts, refreshPosts, deletePost } = usePosts();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { showSuccess } = useToast();
  const [activeFilter, setActiveFilter] = useState("Latest");
  const [refreshing, setRefreshing] = useState(false);

  const bellAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 320, useNativeDriver: ND }).start();
  }, []);

  const pulseBell = () => {
    Animated.sequence([
      Animated.spring(bellAnim, { toValue: 1.25, tension: 300, friction: 5, useNativeDriver: ND }),
      Animated.spring(bellAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: ND }),
    ]).start();
    router.push("/notifications" as any);
  };

  const filteredPosts = posts.filter((p) => {
    if (!settings.showSensitiveContent && p.tag === "Confession" && p.isAnonymous) return false;
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (activeFilter === "Trending") return (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount);
    if (activeFilter === "Following") return (b.upvotes - a.upvotes);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPosts();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshPosts]);

  const handleDelete = useCallback((id: string) => {
    deletePost(id);
    showSuccess("Post deleted");
  }, [deletePost, showSuccess]);

  const headerComponent = (
    <Animated.View style={{ opacity: headerAnim }}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 4, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoSmall, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.logoChar, { color: colors.primary }]}>U</Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>UConnect</Text>
            {user?.college && <Text style={[styles.headerCollege, { color: colors.mutedForeground }]}>{user.college}</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={pulseBell} style={styles.headerBtn}>
          <Animated.View style={{ transform: [{ scale: bellAnim }] }}>
            <Feather name="bell" size={20} color={colors.foreground} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.shortcuts, { borderBottomColor: colors.border }]}>
        {SHORTCUTS.map((s, i) => (
          <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)} style={styles.shortcut}>
            <View style={[styles.shortcutIcon, { backgroundColor: s.color + "18" }]}>
              <Feather name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={[styles.shortcutLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.filterRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.filterTab, activeFilter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}>
            <Text style={[styles.filterText, { color: activeFilter === f ? colors.primary : colors.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!settings.showSensitiveContent && (
        <View style={[styles.filterNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="eye-off" size={13} color={colors.mutedForeground} />
          <Text style={[styles.filterNoticeText, { color: colors.mutedForeground }]}>
            Sensitive confessions hidden · Enable in Settings
          </Text>
          <TouchableOpacity onPress={() => router.push("/settings" as any)}>
            <Text style={[styles.filterNoticeAction, { color: colors.primary }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            currentUserId={user?.id || ""}
            onDelete={handleDelete}
            index={index}
          />
        )}
        ListHeaderComponent={headerComponent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="wind" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Be the first to post something!</Text>
            <TouchableOpacity onPress={() => router.push("/create-post")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={16} color="#FFF" />
              <Text style={styles.createBtnText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoSmall: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoChar: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerCollege: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerBtn: { padding: 8 },
  shortcuts: { paddingHorizontal: 12, paddingVertical: 14, gap: 6, borderBottomWidth: 1 },
  shortcut: { alignItems: "center", gap: 6, marginHorizontal: 6 },
  shortcutIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  shortcutLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  filterRow: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  filterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  filterNotice: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  filterNoticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  filterNoticeAction: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", gap: 14, paddingTop: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
