import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";

const FEATURE_TILES = [
  { icon: "book-open", label: "Notes", route: "/notes", color: "#3B82F6" },
  { icon: "briefcase", label: "Jobs", route: "/internships", color: "#8B5CF6" },
  { icon: "calendar", label: "Events", route: "/events", color: "#F59E0B" },
  { icon: "users", label: "Teams", route: "/teams", color: "#00A86B" },
  { icon: "message-circle", label: "Confessions", route: "/confessions", color: "#EF4444" },
  { icon: "send", label: "Messages", route: "/chat", color: "#06B6D4" },
  { icon: "user-plus", label: "Invite", route: "/invite", color: "#EC4899" },
  { icon: "settings", label: "Settings", route: "/settings", color: "#6B7280" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { posts } = usePosts();
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const myPosts = posts.filter((p) => p.authorId === user?.id);
  const savedPosts = posts.filter((p) => p.isBookmarked);
  const displayPosts = activeTab === "posts" ? myPosts : savedPosts;

  if (!user) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background }]}>
        <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.authIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="user" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>Join UConnect</Text>
          <Text style={[styles.authSubtitle, { color: colors.mutedForeground }]}>Sign in with your college email to access your profile.</Text>
          <TouchableOpacity onPress={() => router.push("/auth/welcome")} style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.signInBtnText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const joinedDate = new Date(user.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
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

          {/* Profile card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.profileTop}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.profileMeta}>
                <View style={styles.profileNameRow}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.username}</Text>
                  {user.isVerified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user.username}</Text>
                <Text style={[styles.collegeMeta, { color: colors.mutedForeground }]}>
                  {user.college} · {user.branch} · {user.year}
                </Text>
              </View>
            </View>

            {user.bio ? (
              <Text style={[styles.bio, { color: colors.foreground }]}>{user.bio}</Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{myPosts.length || user.postsCount || 0}</Text>
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

            {user.interests && user.interests.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
                {user.interests.map((interest) => (
                  <View key={interest} style={[styles.interestChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                    <Text style={[styles.interestText, { color: colors.primary }]}>{interest}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.profileActions}>
              <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.editBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="edit-2" size={14} color={colors.foreground} />
                <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/invite")} style={[styles.shareBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                <Feather name="user-plus" size={14} color={colors.primary} />
                <Text style={[styles.shareBtnText, { color: colors.primary }]}>Invite</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.joinedDate, { color: colors.mutedForeground }]}>
              <Feather name="calendar" size={11} /> Joined {joinedDate}
            </Text>
          </View>

          {/* Feature grid */}
          <View style={[styles.featureSection, { borderBottomColor: colors.border }]}>
            <View style={styles.featureGrid}>
              {FEATURE_TILES.map((tile) => (
                <TouchableOpacity
                  key={tile.label}
                  onPress={() => router.push(tile.route as any)}
                  style={[styles.featureTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: tile.color + "18" }]}>
                    <Feather name={tile.icon as any} size={20} color={tile.color} />
                  </View>
                  <Text style={[styles.featureLabel, { color: colors.foreground }]}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sign out row */}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/welcome"); } }
            ])}
            style={[styles.signOutRow, { borderBottomColor: colors.border }]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>

          {/* Tab selector */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {["posts", "saved"].map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t as any)} style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Feather name={t === "posts" ? "file-text" : "bookmark"} size={16} color={activeTab === t ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                  {t === "posts" ? "My Posts" : "Saved"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name={activeTab === "posts" ? "file-text" : "bookmark"} size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {activeTab === "posts" ? "No posts yet" : "Nothing saved"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {activeTab === "posts" ? "Share your thoughts with the campus!" : "Bookmark posts to save them here."}
          </Text>
          {activeTab === "posts" && (
            <TouchableOpacity onPress={() => router.push("/create-post")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.createBtnText}>Create Post</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 14, width: "100%", maxWidth: 360 },
  authIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  authTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  authSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  signInBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  settingsBtn: { padding: 4 },
  profileCard: { padding: 20, gap: 14, borderBottomWidth: 1 },
  profileTop: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 30, fontFamily: "Inter_700Bold" },
  profileMeta: { flex: 1, gap: 3 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular" },
  collegeMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, paddingVertical: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32 },
  interestsRow: { gap: 6, paddingVertical: 4 },
  interestChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  interestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  profileActions: { flexDirection: "row", gap: 10 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  shareBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  joinedDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  featureSection: { borderBottomWidth: 1 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  featureTile: { width: "22%", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, flexGrow: 1 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  signOutRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", gap: 12, paddingTop: 52, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  createBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  createBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
