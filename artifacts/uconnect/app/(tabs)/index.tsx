import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";

const FILTERS = ["Trending", "Latest", "Following"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("Latest");
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalPostId, setReportModalPostId] = useState<string | null>(null);

  const sortedPosts = [...posts].sort((a, b) => {
    if (activeFilter === "Trending") return (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPosts();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const headerComponent = (
    <View>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
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
          <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.headerBtn}>
            <Feather name="bell" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/chat")} style={styles.headerBtn}>
            <Feather name="send" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

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
          <PostCard
            post={item}
            currentUserId={user?.id || ""}
            onReport={(id) => setReportModalPostId(id)}
          />
        )}
        ListHeaderComponent={headerComponent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 0 }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/create-post")}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 }]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoSmall: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoChar: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerCollege: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerRight: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 8 },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  filterTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  filterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
