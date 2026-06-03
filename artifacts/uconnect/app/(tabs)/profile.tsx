import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, FlatList, Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, GestureResponderEvent,
} from "react-native";
import { useSocial } from "@/context/SocialContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";
import { useConfessions } from "@/context/ConfessionsContext";
import type { Post } from "@/context/PostsContext";
import type { Confession } from "@/context/ConfessionsContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/utils/time";
import { useSettings } from "@/context/SettingsContext";
import { useVaultSummary } from "@/hooks/useVault";
import {
  ProfileAchievements,
  ProfileActionButton,
  ProfileHero,
  ProfileHeroIconButton,
  ProfileStatsCard,
  ProfileTabs,
  ProfileVaultSummary,
} from "@/components/profile";


type TabId = "posts" | "saved" | "reposts" | "confessions" | "activity";
const PROFILE_TAB_MIN_WIDTH = 92;



export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { posts, deletePost } = usePosts();
  const { confessions } = useConfessions();
  const { followingIds } = useSocial();
  const { settings } = useSettings();
  const { data: vaultSummary, refetch: refetchVaultSummary } = useVaultSummary(user?.id);
  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [refreshing, setRefreshing] = useState(false);
  const [revealedConfessionIds, setRevealedConfessionIds] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [appliedInternships, setAppliedInternships] = useState<any[]>([]);
  const [rsvpEvents, setRsvpEvents] = useState<any[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [repostRows, setRepostRows] = useState<{ post_id: string; created_at: string }[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      refetchVaultSummary();
    }, [refetchVaultSummary]),
  );

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

  const elevatedCard = {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  };

  const openConnections = useCallback((mode: "followers" | "following") => {
    if (!user) return;
    router.push({
      pathname: "/connections",
      params: { userId: user.id, mode, username: user.username },
    });
  }, [user?.id, user?.username]);

  const handleDeletePost = useCallback((id: string) => {
    deletePost(id);
    showSuccess("Post deleted");
  }, [deletePost, showSuccess]);

  if (!user) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background }]}>
        <View style={[styles.authCard, elevatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
  const myConfessions = confessions.filter((c) => c.authorId === user.id);
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
  const tabItems: { key: TabId; icon: string; label: string; count: number }[] = [
    { key: "posts", icon: "file-text", label: "Posts", count: myPosts.length },
    { key: "confessions", icon: "message-square", label: "Confessions", count: myConfessions.length },
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
            <TouchableOpacity key={item.id} onPress={() => router.push("/internships")} style={[styles.actCard, elevatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <TouchableOpacity key={item.id} onPress={() => router.push("/events")} style={[styles.actCard, elevatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <TouchableOpacity key={item.id} onPress={() => router.push("/notes")} style={[styles.actCard, elevatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

  const postListData: Post[] = (() => {
    if (activeTab === "posts") return myPosts;
    if (activeTab === "saved") return savedPosts;
    if (activeTab === "reposts") return repostedPosts;
    return [];
  })();

  const ListHeader = (
    <View>
      <ProfileHero
        profile={{
          displayName: user.displayName || user.username,
          username: user.username,
          college: user.college,
          branch: user.branch,
          year: user.year,
          bio: user.bio,
          avatar: user.avatar,
          avatarRingColor: user.avatarRingColor,
          banner: user.banner,
          socialLink: user.socialLink,
          isVerified: user.isVerified,
        }}
        colors={colors}
        topInset={Platform.OS === "web" ? 16 : insets.top}
        self
        rightControls={
          <>
            <ProfileHeroIconButton
              onPress={() => router.push({ pathname: "/scan-connect" as any, params: { username: user.username, allowScan: "1" } })}
              colors={colors}
            >
              <Feather name="grid" size={18} color={colors.foreground} />
            </ProfileHeroIconButton>
            <ProfileHeroIconButton onPress={() => router.push("/settings")} colors={colors}>
              <Feather name="more-horizontal" size={22} color={colors.foreground} />
            </ProfileHeroIconButton>
          </>
        }
        actions={
          <>
            <ProfileActionButton icon="edit-2" variant="outline" label="Edit Profile" colors={colors} onPress={() => router.push("/edit-profile")} />
            <ProfileActionButton icon="share-2" variant="icon" colors={colors} onPress={() => router.push("/invite")} />
          </>
        }
        onAvatarPress={() => router.push("/edit-profile")}
        onQrPress={() => router.push({ pathname: "/scan-connect", params: { username: user.username, allowScan: "1" } })}
      />

      <ProfileStatsCard
        colors={colors}
        attachedTile={{ label: "Vault Score", value: vaultSummary?.score ?? 0, icon: "award" }}
        items={[
          { label: "Posts", value: myPosts.length || user.postsCount || 0 },
          { label: "Followers", value: user.followers, onPress: () => openConnections("followers") },
          { label: "Following", value: followingIds.size || user.following || 0, onPress: () => openConnections("following") },
          { label: "Activity", value: totalActivity },
        ]}
      />

      <ProfileVaultSummary summary={vaultSummary} colors={colors} mode="full" />

      <ProfileAchievements badges={vaultSummary?.badges} colors={colors} onViewAll={() => router.push("/vault")} />

      {user.interests?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
          {user.interests.map((interest: string) => (
            <View key={interest} style={[styles.interestChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
              <Text style={[styles.interestText, { color: colors.primary }]}>{interest}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.joinedRow, { borderTopColor: colors.border }]}>
        <Feather name="calendar" size={14} color={colors.mutedForeground} />
        <Text style={[styles.joinedText, { color: colors.mutedForeground }]}>Joined {joinedDate}</Text>
      </View>

      <ProfileTabs
        items={tabItems as any}
        activeKey={activeTab}
        onChange={setActiveTab}
        colors={colors}
      />

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

  if (activeTab === "confessions") {
    return (
      <Animated.View style={[{ flex: 1 }, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        <FlatList<Confession>
          data={myConfessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/confessions/${item.id}`)}
              style={[styles.confessionCard, elevatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              {item.hasSensitiveContent && !settings.showSensitiveContent && !revealedConfessionIds.has(item.id) ? (
                <View style={styles.sensitiveBlock}>
                  <View style={[styles.sensitiveIcon, { backgroundColor: "#F59E0B15" }]}>
                    <Feather name="alert-triangle" size={20} color="#F59E0B" />
                  </View>
                  <Text style={[styles.sensitiveTitle, { color: colors.foreground }]}>Sensitive Content</Text>
                  <TouchableOpacity
                    onPress={(e: GestureResponderEvent) => {
                      e.stopPropagation();
                      setRevealedConfessionIds((prev) => new Set([...prev, item.id]));
                    }}
                    style={[styles.revealBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Feather name="eye" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Show anyway</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.confessionContent, { color: colors.foreground }]} numberOfLines={4}>
                  {item.content}
                </Text>
              )}
              <View style={styles.confessionMetaRow}>
                <Text style={[styles.confessionMetaText, { color: colors.mutedForeground }]}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
                <View style={styles.confessionCounts}>
                  <View style={styles.confessionCountItem}>
                    <Feather name="arrow-up" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.confessionMetaText, { color: colors.mutedForeground }]}>{item.upvotes}</Text>
                  </View>
                  <View style={styles.confessionCountItem}>
                    <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.confessionMetaText, { color: colors.mutedForeground }]}>{item.commentCount}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={ListHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="message-square" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No confessions yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Your anonymous confessions will appear here.
              </Text>
            </View>
          }
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <FlatList<Post>
        data={postListData}
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
  profileShell: { paddingTop: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  coverBanner: { position: "relative", borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden", width: "92%", alignSelf: "center", aspectRatio: 16 / 7 },
  coverImage: { width: "100%", height: "100%" },
  coverGradient: { position: "absolute", inset: 0 },
  bannerGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -90, right: -70 },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.12)" },
  bannerAccentRow: { position: "absolute", bottom: 12, right: 14, flexDirection: "row", gap: 8 },
  bannerAccentDot: { width: 8, height: 8, borderRadius: 99 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, marginTop: -36, marginBottom: 12 },
  avatarContainer: { position: "relative" },
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
  socialLinkBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  socialLinkText: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 190 },
  statsCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderRadius: 16, borderWidth: 1, paddingVertical: 14 },
  vaultProfileCard: { marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderRadius: 18, padding: 10, gap: 9 },
  vaultProfileHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vaultKicker: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  vaultTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 1 },
  vaultLevelPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  vaultLevelText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  vaultStatsRow: { flexDirection: "row", gap: 8 },
  vaultStat: { flex: 1 },
  vaultStatNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  vaultStatLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  vaultProgress: { height: 6, borderRadius: 99, overflow: "hidden" },
  vaultProgressFill: { height: "100%", borderRadius: 99 },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28 },
  interestsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  interestChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  interestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  joinedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  joinedText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  tabRow: { borderBottomWidth: 1 },
  tabRowContent: { paddingHorizontal: 12 },
  tabBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, paddingHorizontal: 10, minWidth: PROFILE_TAB_MIN_WIDTH },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tabCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  confessionCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginHorizontal: 16, marginTop: 10, gap: 10 },
  confessionContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  confessionMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confessionMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  confessionCounts: { flexDirection: "row", alignItems: "center", gap: 12 },
  confessionCountItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  sensitiveBlock: { alignItems: "center", gap: 8, paddingVertical: 6 },
  sensitiveIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sensitiveTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  revealBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 7 },
  revealText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actSection: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 8 },
  actCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
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
