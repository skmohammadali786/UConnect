import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, FlatList, Image, Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSocial } from "@/context/SocialContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";
import { useToast } from "@/components/Toast";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";


type TabId = "posts" | "saved" | "reposts" | "activity";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { posts, deletePost } = usePosts();
  const { followingIds } = useSocial();
  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [appliedInternships, setAppliedInternships] = useState<any[]>([]);
  const [rsvpEvents, setRsvpEvents] = useState<any[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [repostRows, setRepostRows] = useState<{ post_id: string; created_at: string }[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }).start();
  }, []);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    try {
      const [apps, rsvps, noteSaves] = await Promise.all([
        supabase.from("internship_applications").select("internship_id, internships(id, company, role, stipend, location)").eq("user_id", user.id),
        supabase.from("event_rsvps").select("event_id, events(id, title, date, location)").eq("user_id", user.id),
        supabase.from("note_saves").select("note_id, notes(id, title, subject, uploader_username)").eq("user_id", user.id),
      ]);
      setAppliedInternships((apps.data ?? []).map((r: any) => r.internships).filter(Boolean));
      setRsvpEvents((rsvps.data ?? []).map((r: any) => r.events).filter(Boolean));
      setSavedNotes((noteSaves.data ?? []).map((r: any) => r.notes).filter(Boolean));
    } catch {}
  }, [user?.id]);

  const loadReposts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("reposts")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRepostRows((data ?? []) as { post_id: string; created_at: string }[]);
    } catch {
      setRepostRows([]);
    }
  }, [user?.id]);

  useEffect(() => { loadActivity(); loadReposts(); }, [loadActivity, loadReposts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivity();
    await loadReposts();
    setRefreshing(false);
  }, [loadActivity, loadReposts]);

  if (!user) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background }]}>
        <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.authIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="user" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>Join UConnect</Text>
          <Text style={[styles.authSub, { color: colors.mutedForeground }]}>Sign in with your college email to access your profile.</Text>
          <TouchableOpacity onPress={() => router.push("/auth/welcome")} style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.signInBtnText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const myPosts = posts.filter((p) => p.authorId === user.id);
  const savedPosts = posts.filter((p) => p.isBookmarked);
  const joinedDate = new Date(user.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const totalActivity = appliedInternships.length + rsvpEvents.length + savedNotes.length;
  const repostedPosts = repostRows
    .map((r) => {
      const original = posts.find((p) => p.id === r.post_id);
      if (!original) return null;
      return {
        ...original,
        repostedByUsername: user.username,
        repostedAt: r.created_at,
      };
    })
    .filter(Boolean) as typeof posts;
  const openConnections = useCallback((mode: "followers" | "following") => {
    router.push({
      pathname: "/connections",
      params: { userId: user.id, mode, username: user.username },
    });
  }, [user.id, user.username]);

  const handleDeletePost = useCallback((id: string) => {
    deletePost(id);
    showSuccess("Post deleted");
  }, [deletePost, showSuccess]);

  const tabItems: { key: TabId; icon: string; label: string; count: number }[] = [
    { key: "posts", icon: "file-text", label: "Posts", count: myPosts.length },
    { key: "saved", icon: "bookmark", label: "Saved", count: savedPosts.length },
    { key: "reposts", icon: "repeat", label: "Reposted", count: repostedPosts.length },
    { key: "activity", icon: "activity", label: "Activity", count: totalActivity },
  ];

  const renderActivity = () => (
    <View style={{ padding: 16, gap: 16 }}>
      {appliedInternships.length > 0 && (
        <View>
          <Text style={[styles.actSection, { color: colors.foreground }]}>Applied Internships</Text>
          {appliedInternships.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => router.push("/internships")} style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.actIcon, { backgroundColor: "#8B5CF620" }]}>
                <Feather name="briefcase" size={16} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitle, { color: colors.foreground }]}>{item.role}</Text>
                <Text style={[styles.actSub, { color: colors.mutedForeground }]}>{item.company} · {item.stipend}</Text>
              </View>
              <View style={[styles.appliedPill, { backgroundColor: "#00A86B15", borderColor: "#00A86B30" }]}>
                <Feather name="check" size={11} color="#00A86B" />
                <Text style={[styles.appliedText, { color: "#00A86B" }]}>Applied</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {rsvpEvents.length > 0 && (
        <View>
          <Text style={[styles.actSection, { color: colors.foreground }]}>Attending Events</Text>
          {rsvpEvents.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => router.push("/events")} style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.actIcon, { backgroundColor: "#F59E0B20" }]}>
                <Feather name="calendar" size={16} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.actSub, { color: colors.mutedForeground }]}>{item.date} · {item.location}</Text>
              </View>
              <View style={[styles.appliedPill, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" }]}>
                <Text style={[styles.appliedText, { color: "#F59E0B" }]}>Going</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {savedNotes.length > 0 && (
        <View>
          <Text style={[styles.actSection, { color: colors.foreground }]}>Saved Notes</Text>
          {savedNotes.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => router.push("/notes")} style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.actIcon, { backgroundColor: "#3B82F620" }]}>
                <Feather name="book-open" size={16} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.actSub, { color: colors.mutedForeground }]}>{item.subject} · @{item.uploader_username}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {totalActivity === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="activity" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Apply to internships, RSVP to events, save notes, or join teams.</Text>
        </View>
      )}
    </View>
  );

  const listData = activeTab === "posts"
    ? myPosts
    : activeTab === "saved"
      ? savedPosts
      : activeTab === "reposts"
        ? repostedPosts
        : [];

  const ListHeader = (
    <View>
      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TypewriterText
          text="Profile"
          style={[styles.topBarTitle, { color: colors.foreground }]}
          delay={260}
          speed={70}
        />
        <View style={{ width: 36 }} />
      </View>

      <View style={{ backgroundColor: colors.card }}>
        <View style={[styles.coverBanner, { backgroundColor: colors.primary + "18" }]}>
          {user.banner ? (
            <Image source={{ uri: user.banner }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverGradient} />
          )}
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={[styles.avatarImg, { borderColor: colors.card }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.card, borderWidth: 4 }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={11} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.editBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/invite")} style={[styles.shareBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Feather name="user-plus" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.username}</Text>
            <TouchableOpacity onPress={() => router.push("/scan-connect" as any)} style={[styles.qrBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <MaterialCommunityIcons name="qrcode" size={14} color={colors.primary} />
            </TouchableOpacity>
            {user.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={10} color="#FFF" />
              </View>
            )}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user.username}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
              <Feather name="book" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{user.college}</Text>
            </View>
            {user.branch ? (
              <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
                <Feather name="code" size={11} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{user.branch}</Text>
              </View>
            ) : null}
            {user.year ? (
              <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
                <Feather name="award" size={11} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{user.year}</Text>
              </View>
            ) : null}
          </View>

          {user.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{user.bio}</Text> : null}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.background, borderColor: colors.border, marginHorizontal: 16, marginBottom: 16 }]}>
          {[
            { num: myPosts.length || user.postsCount || 0, label: "Posts" },
            { num: user.followers, label: "Followers", mode: "followers" as const },
            { num: followingIds.size || user.following || 0, label: "Following", mode: "following" as const },
            { num: totalActivity, label: "Activity" },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              {s.mode ? (
                <TouchableOpacity style={styles.statItem} onPress={() => openConnections(s.mode)} activeOpacity={0.85}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{s.num}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{s.num}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              )}
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {user.interests && user.interests.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
            {user.interests.map((interest) => (
              <View key={interest} style={[styles.interestChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                <Text style={[styles.interestText, { color: colors.primary }]}>{interest}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={[styles.joinedRow, { borderTopColor: colors.border }]}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.joinedText, { color: colors.mutedForeground }]}>Joined {joinedDate}</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabItems.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabBtn, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          >
            <Feather name={t.icon as any} size={15} color={activeTab === t.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[styles.tabCount, { backgroundColor: activeTab === t.key ? colors.primary : colors.secondary }]}>
                <Text style={[styles.tabCountText, { color: activeTab === t.key ? "#FFF" : colors.mutedForeground }]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "activity" && renderActivity()}
    </View>
  );

  if (activeTab === "activity") {
    return (
      <Animated.View style={[{ flex: 1 }, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {ListHeader}
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user.id}
            onDelete={handleDeletePost}
          />
        )}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name={activeTab === "posts" ? "file-text" : activeTab === "saved" ? "bookmark" : "repeat"} size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTab === "posts" ? "No posts yet" : activeTab === "saved" ? "Nothing saved" : "No reposts yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {activeTab === "posts"
                ? "Share your thoughts with the campus!"
                : activeTab === "saved"
                  ? "Bookmark posts to save them here."
                  : "Repost posts to share them with your profile audience."}
            </Text>
            {activeTab === "posts" && (
              <TouchableOpacity onPress={() => router.push("/create-post")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.createBtnText}>Create Post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 14, width: "100%", maxWidth: 360 },
  authIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  authTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  authSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  signInBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBarTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  coverBanner: { height: 90, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  coverGradient: { position: "absolute", inset: 0 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, marginTop: -36, marginBottom: 12 },
  avatarContainer: { position: "relative" },
  avatar: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 82, height: 82, borderRadius: 41, borderWidth: 4 },
  avatarText: { fontSize: 34, fontFamily: "Inter_700Bold" },
  cameraBtn: { position: "absolute", bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  profileActions: { flexDirection: "row", gap: 8, alignItems: "center", paddingBottom: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  editBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  nameSection: { paddingHorizontal: 16, gap: 6, marginBottom: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qrBtn: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  verifiedBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 4 },
  statsCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28 },
  interestsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  interestChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  interestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  joinedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  joinedText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tabCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  actSection: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 8 },
  actCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  actIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  appliedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  appliedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", gap: 12, paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
