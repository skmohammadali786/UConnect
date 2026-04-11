import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";

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
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("Latest");
  const [refreshing, setRefreshing] = useState(false);

  const sortedPosts = [...posts].sort((a, b) => {
    if (activeFilter === "Trending") return (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPosts();
    setTimeout(() => setRefreshing(false), 800);
  }, [refreshPosts]);

  const headerComponent = (
    <View>
      {/* Header */}
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
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push("/chat")} style={styles.headerBtn}>
            <Feather name="send" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/settings")} style={styles.headerBtn}>
            <Feather name="menu" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Shortcuts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.shortcuts, { borderBottomColor: colors.border }]}>
        {SHORTCUTS.map((s) => (
          <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)} style={styles.shortcut}>
            <View style={[styles.shortcutIcon, { backgroundColor: s.color + "18" }]}>
              <Feather name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={[styles.shortcutLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filters */}
      <View style={[styles.filterRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.filterTab, activeFilter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[styles.filterText, { color: activeFilter === f ? colors.primary : colors.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} currentUserId={user?.id || ""} />
        )}
        ListHeaderComponent={headerComponent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
  headerRight: { flexDirection: "row", gap: 2 },
  headerBtn: { padding: 8 },
  shortcuts: { paddingHorizontal: 12, paddingVertical: 14, gap: 6, borderBottomWidth: 1 },
  shortcut: { alignItems: "center", gap: 6, marginHorizontal: 6 },
  shortcutIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  shortcutLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  filterRow: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  filterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
