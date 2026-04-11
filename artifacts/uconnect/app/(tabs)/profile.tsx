import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { posts } = usePosts();
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const myPosts = posts.filter((p) => p.authorId === user?.id);
  const savedPosts = posts.filter((p) => p.isBookmarked);
  const displayPosts = activeTab === "posts" ? myPosts : savedPosts;

  if (!user) return null;

  const MENU_ITEMS = [
    { icon: "bookmark", label: "Saved Posts", onPress: () => setActiveTab("saved") },
    { icon: "book-open", label: "Notes", onPress: () => router.push("/notes") },
    { icon: "briefcase", label: "Internships", onPress: () => router.push("/internships") },
    { icon: "calendar", label: "Events", onPress: () => router.push("/events") },
    { icon: "users", label: "Teams", onPress: () => router.push("/teams") },
    { icon: "settings", label: "Settings", onPress: () => router.push("/settings") },
    { icon: "user-plus", label: "Invite Friends", onPress: () => router.push("/invite") },
    { icon: "log-out", label: "Sign Out", onPress: logout },
  ];

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}
      data={displayPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} currentUserId={user.id} />}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
            <TouchableOpacity onPress={() => router.push("/settings")} style={styles.settingsBtn}>
              <Feather name="settings" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Profile info */}
          <View style={[styles.profileSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.avatarLarge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.username}</Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user.username}</Text>
            {user.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{user.bio}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {user.college}
              </Text>
              {user.branch && user.year && (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  · {user.branch} · {user.year}
                </Text>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{myPosts.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{user.followers}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{user.following}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              style={[styles.editBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Quick menu */}
          <View style={[styles.menuGrid, { borderBottomColor: colors.border }]}>
            {MENU_ITEMS.slice(0, 4).map((item) => (
              <TouchableOpacity key={item.label} onPress={item.onPress} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={item.icon as any} size={20} color={item.label === "Sign Out" ? colors.destructive : colors.primary} />
                <Text style={[styles.menuLabel, { color: item.label === "Sign Out" ? colors.destructive : colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab selector */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {["posts", "saved"].map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t as any)} style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                  {t === "posts" ? "Posts" : "Saved"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name={activeTab === "posts" ? "file-text" : "bookmark"} size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {activeTab === "posts" ? "No posts yet" : "No saved posts"}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  settingsBtn: { padding: 4 },
  profileSection: { padding: 20, alignItems: "center", gap: 8, borderBottomWidth: 1 },
  avatarLarge: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold" },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  username: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32 },
  editBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10, borderBottomWidth: 1 },
  menuItem: { width: "47%", flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  menuLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
